from __future__ import annotations
from pathlib import Path
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, HTTPException, status, UploadFile, File, Form
from pydantic import BaseModel, Field

from backend.app.core.config import settings
from backend.app.models.okf_models import (
    ChatRequest,
    ChatResponse,
    ConversationSummary,
    MessageResponse,
    KnowledgeOverview,
    DocumentDetailResponse,
    ValidationFinding,
    Citation,
)
from backend.app.services.knowledge_loader import knowledge_loader
from backend.app.services.retrieval import retrieval_engine
from backend.app.services.chat_service import chat_service
from backend.app.services.okf_parser import OKFParser
from backend.app.services.file_extractor import file_extractor, FileExtractionError
from backend.app.services.intelligence_service import intelligence_service
from backend.app.services.document_library_service import document_library_service
from backend.app.services.llm_service import (
    get_model_status,
    switch_model_provider,
)
from backend.app.db.database import db
import logging

logger = logging.getLogger("routes")

router = APIRouter()

class CreateDocumentRequest(BaseModel):
    category: str = Field(..., description="Subdirectory like technical, products, faq, general")
    filename: str = Field(..., description="Filename ending in .md")
    content: str = Field(..., description="Full markdown content with YAML frontmatter")

class ModelSwitchRequest(BaseModel):
    provider: str = Field(..., description="Provider: 'mock', 'groq', or 'ollama'")
    model: Optional[str] = Field(None, description="Model ID")
    groq_api_key: Optional[str] = Field(None, description="Groq API Key")
    ollama_base_url: Optional[str] = Field(None, description="Ollama Base URL")

@router.get("/health")
@router.get("/api/health")
async def health_check():
    model_info = get_model_status()
    return {
        "status": "healthy",
        "app_env": settings.APP_ENV,
        "version": settings.VERSION,
        "provider": model_info["provider"],
        "model": model_info["model_id"],
        "display_name": model_info["display_name"],
        "is_llama_3_2": model_info["is_llama_3_2"],
        "indexed_concepts": len(knowledge_loader.documents),
        "indexed_chunks": len(knowledge_loader.chunks),
        "validation_issues_count": len(knowledge_loader.findings)
    }

@router.post("/api/chat", response_model=ChatResponse)
async def chat_endpoint(request: ChatRequest):
    try:
        response = await chat_service.process_chat(
            question=request.question,
            conversation_id=request.conversation_id
        )
        return response
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Chat processing error: {str(e)}")

@router.post("/api/upload")
async def upload_file_endpoint(
    file: UploadFile = File(...),
    conversation_id: Optional[str] = Form(None),
    question: Optional[str] = Form(None)
):
    """
    Upload a document, extract text,
    convert into an OKF v0.2 concept document, index into the knowledge bundle,
    and generate a document overview or answer the attached question.
    """
    try:
        content_bytes = await file.read()
        extracted_text = file_extractor.extract_text(content_bytes, file.filename)

        upload_dir = Path(settings.KNOWLEDGE_DIR) / "uploads"
        target_path, concept_id, explanation = file_extractor.convert_to_okf_document(
            extracted_text=extracted_text,
            original_filename=file.filename,
            upload_dir=upload_dir
        )

        # Refresh index with new uploaded concept
        doc_count, chunk_count, findings = knowledge_loader.scan_and_load()
        retrieval_engine.index_chunks(knowledge_loader.chunks)

        # If no conversation exists, create one
        if not conversation_id:
            title = f"Doc: {file.filename[:24]}"
            conversation_id = db.create_conversation(title=title)

        doc_title = Path(file.filename).stem.replace("_", " ").title()
        snippet = extracted_text[:220].strip() + ("..." if len(extracted_text) > 220 else "")
        citations = [
            Citation(
                document_title=doc_title,
                concept_id=concept_id,
                section_heading="Document Content",
                resource_url=f"file://uploads/{file.filename}",
                passage_snippet=snippet,
                trust_tier="human-reviewed",
                source_author="human:user"
            )
        ]

        if question and question.strip():
            chat_res = await chat_service.process_chat(
                question=f"Regarding attached '{file.filename}': {question.strip()}",
                conversation_id=conversation_id
            )
            response_explanation = (
                f"{explanation}\n\n"
                f"---\n\n"
                f"### 🎯 RAG Answer to Your Query\n"
                f"> **Prompt:** *\"{question.strip()}\"*\n\n"
                f"{chat_res.answer}"
            )
            response_citations = chat_res.sources if chat_res.sources else citations
        else:
            # Add user upload turn to conversation
            db.add_message(
                conversation_id=conversation_id,
                role="user",
                content=f"📎 Uploaded file: **{file.filename}**"
            )
            # Add assistant document explanation to conversation
            db.add_message(
                conversation_id=conversation_id,
                role="assistant",
                content=explanation,
                sources=citations
            )
            response_explanation = explanation
            response_citations = citations

        return {
            "success": True,
            "filename": file.filename,
            "concept_id": concept_id,
            "explanation": response_explanation,
            "conversation_id": conversation_id,
            "sources": [c.model_dump() for c in response_citations],
            "indexed_concepts": doc_count,
            "indexed_chunks": chunk_count
        }
    except FileExtractionError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        logger.error(f"Error handling upload for {file.filename}: {e}", exc_info=True)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=f"Failed to process file: {str(e)}")

@router.get("/api/conversations", response_model=List[ConversationSummary])
async def list_conversations():
    return db.list_conversations()

@router.get("/api/conversations/{conversation_id}", response_model=List[MessageResponse])
async def get_conversation(conversation_id: str):
    return db.get_conversation_messages(conversation_id)

@router.delete("/api/conversations/{conversation_id}")
async def delete_conversation(conversation_id: str):
    success = db.delete_conversation(conversation_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversation not found")
    return {"success": True, "message": "Conversation deleted"}

@router.get("/api/knowledge", response_model=KnowledgeOverview)
async def get_knowledge_overview():
    return knowledge_loader.get_overview()

@router.get("/api/knowledge/documents/{concept_id:path}", response_model=DocumentDetailResponse)
async def get_document_detail(concept_id: str):
    # Path traversal safeguard
    base_dir = Path(settings.KNOWLEDGE_DIR).resolve()
    target_path = (base_dir / f"{concept_id}.md").resolve()

    try:
        target_path.relative_to(base_dir)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: invalid path")

    if not target_path.exists() or not target_path.is_file():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Concept document '{concept_id}' not found")

    raw_content = target_path.read_text(encoding="utf-8")
    doc, findings = OKFParser.parse_content(
        content=raw_content,
        relative_path=f"{concept_id}.md",
        full_path=str(target_path)
    )

    if not doc:
        error_msgs = "; ".join([f.message for f in findings])
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail=f"Malformed OKF document: {error_msgs}")

    # Extract YAML text
    lines = raw_content.splitlines(keepends=True)
    fm_yaml = ""
    if lines and lines[0].strip() == "---":
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                fm_yaml = "".join(lines[1:i])
                break

    return DocumentDetailResponse(
        concept_id=doc.concept_id,
        title=doc.title,
        type=doc.type,
        description=doc.description,
        tags=doc.tags,
        trust_tier=doc.trust_tier,
        status=doc.status,
        is_stale=doc.is_stale,
        relative_path=doc.relative_path,
        frontmatter_yaml=fm_yaml,
        raw_markdown=raw_content,
        body_markdown=doc.body,
        sections=doc.sections,
        sources=doc.frontmatter.sources,
        footnotes=doc.footnotes
    )

@router.post("/api/knowledge/documents")
async def create_or_update_document(req: CreateDocumentRequest):
    # Path sanitation
    clean_category = req.category.strip().replace("..", "").strip("/")
    clean_filename = req.filename.strip().replace("..", "").strip("/")
    if not clean_filename.endswith(".md"):
        clean_filename += ".md"

    base_dir = Path(settings.KNOWLEDGE_DIR).resolve()
    target_dir = (base_dir / clean_category).resolve()
    target_path = (target_dir / clean_filename).resolve()

    try:
        target_path.relative_to(base_dir)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied: path traversal detected")

    rel_path = f"{clean_category}/{clean_filename}"
    parsed_doc, findings = OKFParser.parse_content(
        content=req.content,
        relative_path=rel_path
    )

    errors = [f for f in findings if f.severity == "error"]
    if errors:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={"error": "OKF validation failed", "findings": [e.model_dump() for e in errors]}
        )

    target_dir.mkdir(parents=True, exist_ok=True)
    target_path.write_text(req.content, encoding="utf-8")

    # Refresh index
    doc_count, chunk_count, _ = knowledge_loader.scan_and_load()
    retrieval_engine.index_chunks(knowledge_loader.chunks)

    return {
        "success": True,
        "message": f"Successfully created/updated OKF concept '{rel_path}'",
        "concept_id": parsed_doc.concept_id if parsed_doc else rel_path[:-3],
        "indexed_documents": doc_count,
        "indexed_chunks": chunk_count
    }

@router.post("/api/knowledge/reindex")
async def reindex_knowledge():
    doc_count, chunk_count, findings = knowledge_loader.scan_and_load()
    retrieval_engine.index_chunks(knowledge_loader.chunks)
    return {
        "success": True,
        "total_documents": doc_count,
        "total_chunks": chunk_count,
        "validation_findings_count": len(findings)
    }

class AcknowledgeRequest(BaseModel):
    concept_id: str = Field(..., description="Target concept ID (e.g. technical/api_architecture)")
    actor: str = Field("human:lead_reviewer", description="Sign-off actor identity (e.g. human:alice, agent:okf_ai)")
    notes: Optional[str] = None

@router.get("/api/intelligence/stats")
async def get_intelligence_stats():
    """
    Returns AI knowledge intelligence workspace metrics: trust distribution,
    knowledge graph nodes/edges, and verification health score.
    """
    return intelligence_service.get_workspace_stats()

@router.post("/api/intelligence/acknowledge")
async def acknowledge_concept_endpoint(req: AcknowledgeRequest):
    """
    Signs off / acknowledges a concept document, appending a verification
    entry to frontmatter per OKF v0.2 section 5.2 and updating trust tier.
    """
    try:
        return intelligence_service.acknowledge_concept(
            concept_id=req.concept_id,
            actor=req.actor,
            notes=req.notes
        )
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

@router.get("/api/intelligence/analyze/{concept_id:path}")
async def analyze_concept_endpoint(concept_id: str):
    """
    Deep-dive AI intelligence breakdown for an OKF concept.
    """
    try:
        return intelligence_service.analyze_concept(concept_id)
    except FileNotFoundError as e:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(e))

# --- Document Intelligent Library Endpoints ---

@router.get("/api/library")
async def get_library_catalog_endpoint():
    """
    Returns all documents in the Document Intelligent Library with format,
    word count, reading time, trust tier, and library statistics.
    """
    documents, stats = document_library_service.get_library_catalog()
    return {
        "documents": [d.model_dump() for d in documents],
        "stats": stats.model_dump()
    }

@router.get("/api/library/{concept_id:path}")
async def get_document_intelligence_endpoint(concept_id: str):
    """
    Returns deep document intelligence report: readability score, entity breakdown,
    section outline, suggested questions, and raw preview.
    """
    report = document_library_service.get_document_intelligence(concept_id)
    if not report:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document '{concept_id}' not found")
    return report.model_dump()

@router.delete("/api/library/{concept_id:path}")
async def delete_library_document_endpoint(concept_id: str):
    """
    Deletes a document from the library and triggers re-indexing.
    """
    success = document_library_service.delete_document(concept_id)
    if not success:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Document '{concept_id}' not found")
    return {
        "success": True,
        "message": f"Successfully deleted document '{concept_id}' and re-indexed knowledge bundle."
    }

@router.post("/api/library/batch-upload")
async def batch_upload_endpoint(files: List[UploadFile] = File(...)):
    """
    Batch uploads multiple files, extracts text, structures into OKF concept files,
    indexes into the knowledge bundle, and returns intelligence summaries.
    """
    upload_dir = Path(settings.KNOWLEDGE_DIR) / "uploads"
    results = []

    for f in files:
        try:
            content_bytes = await f.read()
            extracted_text = file_extractor.extract_text(content_bytes, f.filename)
            target_path, concept_id, explanation = file_extractor.convert_to_okf_document(
                extracted_text=extracted_text,
                original_filename=f.filename,
                upload_dir=upload_dir
            )
            results.append({
                "filename": f.filename,
                "concept_id": concept_id,
                "success": True,
                "explanation": explanation
            })
        except Exception as e:
            results.append({
                "filename": f.filename,
                "success": False,
                "error": str(e)
            })

    # Trigger reindex
    knowledge_loader.scan_and_load()
    retrieval_engine.index_chunks(knowledge_loader.chunks)

    return {
        "success": True,
        "total_uploaded": len(files),
        "results": results
    }

@router.get("/api/model/status")
async def get_model_status_route():
    """
    Returns current active model, provider, model name, and available Llama 3.2 models.
    """
    return get_model_status()

@router.post("/api/model/switch")
async def switch_model_route(req: ModelSwitchRequest):
    """
    Dynamically switches active LLM provider or configuration at runtime.
    """
    try:
        updated = await switch_model_provider(
            provider=req.provider,
            model=req.model,
            api_key=req.groq_api_key,
            base_url=req.ollama_base_url
        )
        return {"success": True, "status": updated}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

