from __future__ import annotations
import os
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from datetime import datetime, timezone

from backend.app.core.config import settings
from backend.app.models.okf_models import (
    ConceptDocument,
    ValidationFinding,
    PassageChunk,
    KnowledgeDocumentSummary,
    KnowledgeOverview,
)
from backend.app.services.okf_parser import OKFParser

class KnowledgeLoader:
    """
    Scans, indexes, chunks, and manages the OKF knowledge bundle directory.
    """

    def __init__(self, knowledge_dir: Optional[str] = None):
        self.knowledge_dir = Path(knowledge_dir or settings.KNOWLEDGE_DIR)
        self.documents: Dict[str, ConceptDocument] = {}  # concept_id -> doc
        self.chunks: List[PassageChunk] = []
        self.findings: List[ValidationFinding] = []
        self.last_indexed_at: Optional[datetime] = None

    def scan_and_load(self) -> Tuple[int, int, List[ValidationFinding]]:
        """
        Scans knowledge directory, parses documents, and extracts searchable chunks.
        Returns (document_count, chunk_count, validation_findings).
        """
        if not self.knowledge_dir.exists():
            self.knowledge_dir.mkdir(parents=True, exist_ok=True)

        new_documents: Dict[str, ConceptDocument] = {}
        all_findings: List[ValidationFinding] = []
        new_chunks: List[PassageChunk] = []

        # Find all markdown files
        for root_dir, _, files in os.walk(self.knowledge_dir):
            for file_name in files:
                if not file_name.endswith(".md"):
                    continue

                full_path = Path(root_dir) / file_name
                rel_path = full_path.relative_to(self.knowledge_dir).as_posix()

                doc, findings = OKFParser.parse_file(full_path, self.knowledge_dir)
                all_findings.extend(findings)

                if doc:
                    new_documents[doc.concept_id] = doc
                    # Generate searchable chunks from document sections
                    doc_chunks = self._chunk_document(doc)
                    new_chunks.extend(doc_chunks)

        self.documents = new_documents
        self.chunks = new_chunks
        self.findings = all_findings
        self.last_indexed_at = datetime.now(timezone.utc)

        return len(self.documents), len(self.chunks), self.findings

    def _chunk_document(self, doc: ConceptDocument) -> List[PassageChunk]:
        chunks: List[PassageChunk] = []

        # 1. Document summary chunk (frontmatter context + description)
        summary_text = f"Document: {doc.title} (Type: {doc.type})\n"
        if doc.description:
            summary_text += f"Summary: {doc.description}\n"
        if doc.tags:
            summary_text += f"Tags: {', '.join(doc.tags)}\n"

        chunks.append(PassageChunk(
            chunk_id=f"{doc.concept_id}#summary",
            concept_id=doc.concept_id,
            document_title=doc.title,
            document_type=doc.type,
            document_resource=doc.frontmatter.resource,
            section_heading="Overview & Summary",
            text=summary_text.strip(),
            tags=doc.tags,
            trust_tier=doc.trust_tier,
            status=doc.status,
            is_stale=doc.is_stale,
            source_references=doc.frontmatter.sources
        ))

        # 2. Section chunks
        for idx, sec in enumerate(doc.sections):
            content = sec.content.strip()
            if not content:
                continue

            # If section is very long (> 1200 chars), split by paragraphs
            paragraphs = [p.strip() for p in content.split("\n\n") if p.strip()]
            if len(paragraphs) > 1 and len(content) > 1200:
                current_block = []
                current_len = 0
                part_idx = 1
                for para in paragraphs:
                    if current_len + len(para) > 1000 and current_block:
                        chunk_text = f"Section: {sec.heading}\n" + "\n\n".join(current_block)
                        chunks.append(PassageChunk(
                            chunk_id=f"{doc.concept_id}#{idx}_{part_idx}",
                            concept_id=doc.concept_id,
                            document_title=doc.title,
                            document_type=doc.type,
                            document_resource=doc.frontmatter.resource,
                            section_heading=f"{sec.heading} (Part {part_idx})",
                            text=chunk_text.strip(),
                            tags=doc.tags,
                            trust_tier=doc.trust_tier,
                            status=doc.status,
                            is_stale=doc.is_stale,
                            source_references=doc.frontmatter.sources
                        ))
                        current_block = [para]
                        current_len = len(para)
                        part_idx += 1
                    else:
                        current_block.append(para)
                        current_len += len(para)

                if current_block:
                    chunk_text = f"Section: {sec.heading}\n" + "\n\n".join(current_block)
                    chunks.append(PassageChunk(
                        chunk_id=f"{doc.concept_id}#{idx}_{part_idx}",
                        concept_id=doc.concept_id,
                        document_title=doc.title,
                        document_type=doc.type,
                        document_resource=doc.frontmatter.resource,
                        section_heading=f"{sec.heading} (Part {part_idx})",
                        text=chunk_text.strip(),
                        tags=doc.tags,
                        trust_tier=doc.trust_tier,
                        status=doc.status,
                        is_stale=doc.is_stale,
                        source_references=doc.frontmatter.sources
                    ))
            else:
                chunk_text = f"Section: {sec.heading}\n{content}"
                chunks.append(PassageChunk(
                    chunk_id=f"{doc.concept_id}#{idx}",
                    concept_id=doc.concept_id,
                    document_title=doc.title,
                    document_type=doc.type,
                    document_resource=doc.frontmatter.resource,
                    section_heading=sec.heading,
                    text=chunk_text.strip(),
                    tags=doc.tags,
                    trust_tier=doc.trust_tier,
                    status=doc.status,
                    is_stale=doc.is_stale,
                    source_references=doc.frontmatter.sources
                ))

        return chunks

    def get_overview(self) -> KnowledgeOverview:
        categories: Dict[str, int] = {}
        types: Dict[str, int] = {}
        trust_tiers: Dict[str, int] = {}
        summaries: List[KnowledgeDocumentSummary] = []

        for doc in self.documents.values():
            category = doc.relative_path.split("/")[0] if "/" in doc.relative_path else "root"
            categories[category] = categories.get(category, 0) + 1
            types[doc.type] = types.get(doc.type, 0) + 1
            trust_tiers[doc.trust_tier] = trust_tiers.get(doc.trust_tier, 0) + 1

            summaries.append(KnowledgeDocumentSummary(
                concept_id=doc.concept_id,
                title=doc.title,
                type=doc.type,
                description=doc.description,
                tags=doc.tags,
                trust_tier=doc.trust_tier,
                status=doc.status,
                is_stale=doc.is_stale,
                relative_path=doc.relative_path,
                sources_count=len(doc.frontmatter.sources),
                resource=doc.frontmatter.resource
            ))

        return KnowledgeOverview(
            total_concepts=len(self.documents),
            categories=categories,
            types=types,
            trust_tiers=trust_tiers,
            documents=summaries,
            validation_issues=self.findings,
            last_indexed_at=self.last_indexed_at.isoformat() if self.last_indexed_at else ""
        )

    def get_document(self, concept_id: str) -> Optional[ConceptDocument]:
        return self.documents.get(concept_id)

# Singleton loader instance
knowledge_loader = KnowledgeLoader()
