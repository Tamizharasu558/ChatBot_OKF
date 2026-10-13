from __future__ import annotations
import re
import yaml
from pathlib import Path
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone

from backend.app.core.config import settings
from backend.app.services.knowledge_loader import knowledge_loader
from backend.app.services.retrieval import retrieval_engine
from backend.app.services.okf_parser import OKFParser
from backend.app.models.okf_models import ConceptDocument

class IntelligenceService:
    @staticmethod
    def get_workspace_stats() -> Dict[str, Any]:
        """
        Calculates comprehensive intelligence stats, knowledge graph nodes/edges,
        trust distributions, and verification audits.
        """
        docs = list(knowledge_loader.documents.values())
        total_docs = len(docs)

        trust_counts = {"human-reviewed": 0, "machine-confirmed": 0, "unverified": 0}
        type_counts: Dict[str, int] = {}
        category_counts: Dict[str, int] = {}
        stale_count = 0
        total_sources = 0

        # Graph nodes and edges
        nodes = []
        edges = []
        doc_ids = set(knowledge_loader.documents.keys())

        for doc in docs:
            # Trust distribution
            tier = doc.trust_tier
            trust_counts[tier] = trust_counts.get(tier, 0) + 1

            # Types
            t = doc.type
            type_counts[t] = type_counts.get(t, 0) + 1

            # Category
            cat = doc.relative_path.split("/")[0] if "/" in doc.relative_path else "root"
            category_counts[cat] = category_counts.get(cat, 0) + 1

            if doc.is_stale:
                stale_count += 1

            total_sources += len(doc.frontmatter.sources)

            # Add graph node
            nodes.append({
                "id": doc.concept_id,
                "label": doc.title,
                "type": doc.type,
                "category": cat,
                "trust_tier": doc.trust_tier,
                "status": doc.status,
                "is_stale": doc.is_stale
            })

            # Extract markdown cross-links [Text](/target.md) or [Text](../target.md)
            link_pattern = re.compile(r"\[([^\]]+)\]\(([^)]+)\)")
            for match in link_pattern.finditer(doc.body):
                target = match.group(2).strip()
                # Clean target to concept_id
                target_clean = target.lstrip("/").replace(".md", "")
                if target_clean.startswith("./"):
                    target_clean = f"{cat}/{target_clean[2:]}"
                elif target_clean.startswith("../"):
                    target_clean = target_clean.replace("../", "")

                if target_clean in doc_ids and target_clean != doc.concept_id:
                    edges.append({
                        "source": doc.concept_id,
                        "target": target_clean,
                        "label": match.group(1)
                    })

        # Calculate overall trust & health index (0 to 100)
        human_reviewed = trust_counts["human-reviewed"]
        machine_confirmed = trust_counts["machine-confirmed"]
        health_score = 100
        if total_docs > 0:
            health_score = int(((human_reviewed * 1.0 + machine_confirmed * 0.7) / total_docs) * 100)
            if stale_count > 0:
                health_score = max(50, health_score - (stale_count * 5))

        return {
            "total_concepts": total_docs,
            "total_chunks": len(knowledge_loader.chunks),
            "total_sources": total_sources,
            "health_score": health_score,
            "trust_distribution": trust_counts,
            "type_distribution": type_counts,
            "category_distribution": category_counts,
            "stale_concepts_count": stale_count,
            "graph": {
                "nodes": nodes,
                "edges": edges
            },
            "last_audit_at": datetime.now(timezone.utc).isoformat()
        }

    @staticmethod
    def acknowledge_concept(
        concept_id: str,
        actor: str = "human:reviewer",
        notes: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Signs off / acknowledges a concept document by recording a verification event
        into the YAML frontmatter per OKF v0.2 Section 5.2.
        """
        base_dir = Path(settings.KNOWLEDGE_DIR).resolve()
        target_path = (base_dir / f"{concept_id}.md").resolve()

        if not target_path.exists():
            raise FileNotFoundError(f"Concept document '{concept_id}' not found.")

        raw_content = target_path.read_text(encoding="utf-8")
        lines = raw_content.splitlines(keepends=True)

        if not lines or lines[0].strip() != "---":
            raise ValueError("Document lacks YAML frontmatter block.")

        closing_idx = -1
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                closing_idx = i
                break

        if closing_idx == -1:
            raise ValueError("Document has unclosed frontmatter block.")

        fm_text = "".join(lines[1:closing_idx])
        body_text = "".join(lines[closing_idx + 1:])

        fm_dict = yaml.safe_load(fm_text) or {}

        # Format verification actor
        clean_actor = actor.strip()
        if not (clean_actor.startswith("human:") or clean_actor.startswith("process:") or "/" in clean_actor):
            clean_actor = f"human:{clean_actor}"

        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
        new_entry = {"by": clean_actor, "at": now_iso}

        existing_verified = fm_dict.get("verified")
        if existing_verified is None:
            fm_dict["verified"] = [new_entry]
        elif isinstance(existing_verified, list):
            fm_dict["verified"].append(new_entry)
        elif isinstance(existing_verified, dict):
            fm_dict["verified"] = [existing_verified, new_entry]
        else:
            fm_dict["verified"] = [new_entry]

        # Re-serialize frontmatter cleanly
        new_fm_yaml = yaml.dump(fm_dict, sort_keys=False, allow_unicode=True)
        new_full_content = f"---\n{new_fm_yaml}---\n{body_text}"

        target_path.write_text(new_full_content, encoding="utf-8")

        # Refresh index
        doc_count, chunk_count, findings = knowledge_loader.scan_and_load()
        retrieval_engine.index_chunks(knowledge_loader.chunks)

        updated_doc = knowledge_loader.documents.get(concept_id)

        return {
            "success": True,
            "concept_id": concept_id,
            "new_trust_tier": updated_doc.trust_tier if updated_doc else "human-reviewed",
            "acknowledged_by": clean_actor,
            "acknowledged_at": now_iso,
            "message": f"Successfully acknowledged and verified '{concept_id}'. Trust Tier updated to '{updated_doc.trust_tier if updated_doc else 'human-reviewed'}'."
        }

    @staticmethod
    def analyze_concept(concept_id: str) -> Dict[str, Any]:
        """
        Generates deep-dive AI intelligence breakdown for a concept.
        """
        doc = knowledge_loader.documents.get(concept_id)
        if not doc:
            raise FileNotFoundError(f"Concept '{concept_id}' not found.")

        # Extract structural highlights
        section_titles = [s.heading for s in doc.sections]
        word_count = len(re.findall(r"\w+", doc.body))
        code_blocks = len(re.findall(r"```", doc.body)) // 2
        tables_count = len(re.findall(r"\|.*\|", doc.body))

        # Check references & citations
        citations_found = len(doc.footnotes)
        declared_sources = len(doc.frontmatter.sources)

        # Executive summary
        summary = doc.description or (doc.sections[0].content[:250] if doc.sections else "Overview of concept.")

        return {
            "concept_id": doc.concept_id,
            "title": doc.title,
            "type": doc.type,
            "trust_tier": doc.trust_tier,
            "status": doc.status,
            "is_stale": doc.is_stale,
            "metrics": {
                "word_count": word_count,
                "sections_count": len(doc.sections),
                "code_blocks": code_blocks,
                "tables_count": tables_count,
                "declared_sources": declared_sources,
                "footnote_citations": citations_found
            },
            "sections": section_titles,
            "executive_summary": summary,
            "tags": doc.tags,
            "sources": [s.model_dump() for s in doc.frontmatter.sources],
            "verifications": [
                v.model_dump() for v in (
                    doc.frontmatter.verified if isinstance(doc.frontmatter.verified, list)
                    else [doc.frontmatter.verified] if doc.frontmatter.verified else []
                )
            ]
        }

intelligence_service = IntelligenceService()
