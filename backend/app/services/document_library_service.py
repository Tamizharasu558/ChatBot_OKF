from __future__ import annotations
import os
import re
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Any, Tuple, Optional
from collections import Counter

from backend.app.core.config import settings
from backend.app.models.okf_models import (
    LibraryDocumentItem,
    DocumentIntelligenceReport,
    DocumentOutlineNode,
    ExtractedEntity,
    LibraryStats,
)
from backend.app.services.knowledge_loader import knowledge_loader
from backend.app.services.retrieval import retrieval_engine

# Entity classification patterns
TECH_PATTERNS = {"api", "rest", "oauth", "jwt", "tls", "sql", "postgres", "json", "csv", "python", "docker", "http", "token", "sha256", "sift", "aes"}
POLICY_PATTERNS = {"gdpr", "asc 606", "soc2", "iso 27001", "sla", "hipaa", "privacy", "governance", "retention", "terms", "policy", "refund"}
METRIC_PATTERNS = {"revenue", "mrr", "arr", "rate", "usd", "seconds", "minutes", "hours", "days", "percent", "subtotal", "cost"}
ROLE_PATTERNS = {"cfo", "architect", "engineer", "admin", "reviewer", "director", "manager", "auditor", "user", "lead"}

class DocumentLibraryService:
    def _compute_readability(self, text: str) -> Tuple[float, str]:
        words = re.findall(r"\w+", text)
        sentences = [s for s in re.split(r"[.!?]+", text) if s.strip()]
        if not words or not sentences:
            return 75.0, "Standard / Accessible"

        num_words = len(words)
        num_sentences = max(1, len(sentences))
        asl = num_words / num_sentences  # Average Sentence Length

        # Syllable heuristic: count vowel sequences
        vowel_matches = re.findall(r"[aeiouy]+", text.lower())
        num_syllables = max(num_words, len(vowel_matches))
        asw = num_syllables / num_words  # Average Syllables per Word

        # Flesch Reading Ease Formula
        score = 206.835 - (1.015 * asl) - (84.6 * asw)
        clamped_score = max(15.0, min(95.0, round(score, 1)))

        if clamped_score >= 70:
            level = "Standard / Accessible"
        elif clamped_score >= 50:
            level = "Moderate / Professional"
        else:
            level = "Advanced / Highly Technical"

        return clamped_score, level

    def _extract_entities(self, text: str) -> List[ExtractedEntity]:
        words = re.findall(r"\b[A-Za-z0-9_\-]{3,}\b", text)
        word_counts = Counter([w.lower() for w in words])

        entities: List[ExtractedEntity] = []
        seen = set()

        for word, count in word_counts.most_common(50):
            if word in seen:
                continue
            cat = None
            if any(p in word for p in TECH_PATTERNS):
                cat = "Technology"
            elif any(p in word for p in POLICY_PATTERNS):
                cat = "Policy / Compliance"
            elif any(p in word for p in METRIC_PATTERNS):
                cat = "Metric / Finance"
            elif any(p in word for p in ROLE_PATTERNS):
                cat = "Role / Authority"

            if cat:
                seen.add(word)
                entities.append(ExtractedEntity(name=word.title(), category=cat, count=count))

        return entities[:12]

    def get_library_catalog(self) -> Tuple[List[LibraryDocumentItem], LibraryStats]:
        """
        Retrieves all documents in the intelligence library with rich metadata.
        """
        knowledge_dir = Path(settings.KNOWLEDGE_DIR)
        doc_items: List[LibraryDocumentItem] = []

        total_words = 0
        total_size = 0
        readability_scores = []
        format_dist: Dict[str, int] = {}
        category_dist: Dict[str, int] = {}

        for doc in knowledge_loader.documents.values():
            file_path = Path(doc.file_path)
            size_bytes = file_path.stat().st_size if file_path.exists() else 1024
            total_size += size_bytes

            # Read content text
            content_text = ""
            for s in doc.sections:
                content_text += s.content + "\n"
            word_count = len(re.findall(r"\w+", content_text))
            total_words += word_count
            reading_time = max(1, word_count // 200)

            # Determine format
            is_uploaded = doc.concept_id.startswith("uploads/")
            original_resource = doc.frontmatter.resource or ""
            if original_resource and "." in original_resource:
                fmt = Path(original_resource).suffix.lstrip(".").lower()
                if not fmt:
                    fmt = "md"
            else:
                fmt = "md"
            format_dist[fmt] = format_dist.get(fmt, 0) + 1

            # Category
            cat = doc.concept_id.split("/")[0] if "/" in doc.concept_id else "general"
            category_dist[cat] = category_dist.get(cat, 0) + 1

            # Readability
            score, _ = self._compute_readability(content_text)
            readability_scores.append(score)

            # Top entities
            entities = self._extract_entities(content_text)
            top_entity_names = [e.name for e in entities[:4]]

            # Executive summary
            summary = doc.description or (content_text[:220].strip() + "...")

            # Creation date
            created_at = None
            if doc.frontmatter.generated and doc.frontmatter.generated.at:
                created_at = str(doc.frontmatter.generated.at)

            doc_items.append(
                LibraryDocumentItem(
                    concept_id=doc.concept_id,
                    title=doc.title,
                    type=doc.type,
                    filename=file_path.name,
                    relative_path=doc.relative_path,
                    category=cat,
                    file_format=fmt,
                    size_bytes=size_bytes,
                    word_count=word_count,
                    reading_time_minutes=reading_time,
                    section_count=len(doc.sections),
                    trust_tier=doc.trust_tier,
                    status=doc.frontmatter.status or "stable",
                    is_stale=doc.is_stale,
                    is_uploaded=is_uploaded,
                    executive_summary=summary,
                    top_entities=top_entity_names,
                    created_at=created_at
                )
            )

        avg_readability = (
            round(sum(readability_scores) / len(readability_scores), 1)
            if readability_scores
            else 75.0
        )

        stats = LibraryStats(
            total_documents=len(doc_items),
            total_words=total_words,
            total_size_bytes=total_size,
            format_distribution=format_dist,
            category_distribution=category_dist,
            avg_readability=avg_readability
        )

        return doc_items, stats

    def get_document_intelligence(self, concept_id: str) -> Optional[DocumentIntelligenceReport]:
        """
        Deep-dive intelligent report for a specific document.
        """
        doc = knowledge_loader.documents.get(concept_id)
        if not doc:
            return None

        file_path = Path(doc.file_path)
        size_bytes = file_path.stat().st_size if file_path.exists() else 1024

        content_text = "\n".join([s.content for s in doc.sections])
        word_count = len(re.findall(r"\w+", content_text))
        reading_time = max(1, word_count // 200)

        # Format
        fmt = "md"
        if doc.frontmatter.resource and "." in doc.frontmatter.resource:
            ext = Path(doc.frontmatter.resource).suffix.lstrip(".").lower()
            if ext:
                fmt = ext

        score, complexity = self._compute_readability(content_text)
        entities = self._extract_entities(content_text)

        outline = [
            DocumentOutlineNode(
                title=s.heading,
                level=s.level,
                preview=s.content[:160].strip() + ("..." if len(s.content) > 160 else "")
            )
            for s in doc.sections
        ]

        # Suggested probing questions
        suggested_questions = []
        if doc.sections and len(doc.sections) > 1:
            suggested_questions.append(f"What key points are covered in section '{doc.sections[1].heading}'?")
        suggested_questions.append(f"Summarize the main provisions and rules defined in {doc.title}.")
        if entities:
            suggested_questions.append(f"How does this document define and handle '{entities[0].name}'?")

        sample_passages = [
            {
                "section": s.heading,
                "snippet": s.content[:240].strip() + ("..." if len(s.content) > 240 else ""),
                "word_count": len(re.findall(r"\w+", s.content))
            }
            for s in doc.sections[:4]
        ]

        raw_preview = file_path.read_text(encoding="utf-8") if file_path.exists() else content_text

        return DocumentIntelligenceReport(
            concept_id=doc.concept_id,
            title=doc.title,
            type=doc.type,
            filename=file_path.name,
            file_format=fmt,
            size_bytes=size_bytes,
            word_count=word_count,
            reading_time_minutes=reading_time,
            trust_tier=doc.trust_tier,
            executive_summary=doc.description or content_text[:300],
            readability_score=score,
            complexity_level=complexity,
            entities=entities,
            outline=outline,
            suggested_questions=suggested_questions,
            sample_passages=sample_passages,
            raw_preview=raw_preview
        )

    def delete_document(self, concept_id: str) -> bool:
        """
        Deletes a document from the library and triggers a re-index.
        """
        doc = knowledge_loader.documents.get(concept_id)
        if not doc:
            return False

        file_path = Path(doc.file_path)
        if file_path.exists():
            file_path.unlink()

        # Re-index
        knowledge_loader.scan_and_load()
        retrieval_engine.index_chunks(knowledge_loader.chunks)
        return True

document_library_service = DocumentLibraryService()
