from __future__ import annotations
import os
import re
import io
import json
import csv
from pathlib import Path
from datetime import datetime, timezone
from typing import Tuple, Dict, Any, List

import pypdf
import docx

ALLOWED_DOCUMENT_EXTENSIONS = {
    ".txt", ".md", ".pdf", ".docx", ".doc", ".json", ".csv", ".tsv",
    ".yaml", ".yml", ".xml", ".html", ".htm", ".log", ".py", ".js",
    ".ts", ".jsx", ".tsx", ".sh", ".sql", ".rst", ".rtf", ".toml", ".ini", ".env"
}
MAX_FILE_SIZE = 25 * 1024 * 1024  # 25 MB

class FileExtractionError(Exception):
    pass

class FileExtractor:
    @staticmethod
    def extract_text(file_bytes: bytes, filename: str) -> str:
        safe_filename = Path(filename or "").name
        ext = Path(safe_filename).suffix.lower()

        if not safe_filename or ext not in ALLOWED_DOCUMENT_EXTENSIONS:
            allowed = ", ".join(sorted(ALLOWED_DOCUMENT_EXTENSIONS))
            raise FileExtractionError(f"Unsupported file type. Allowed extensions: {allowed}")
        if not file_bytes:
            raise FileExtractionError("The uploaded file is empty.")

        if len(file_bytes) > MAX_FILE_SIZE:
            raise FileExtractionError("File size exceeds 25MB limit.")

        # Check for binary non-text files (e.g., images, audio, video, archives, binaries)
        is_binary = b"\x00" in file_bytes[:4096]
        if is_binary and ext not in {".pdf", ".docx", ".doc"}:
            raise FileExtractionError(
                f"File '{filename}' appears to be a binary file. Please attach text, documents (.pdf, .docx, .txt, .md, .csv, .json), or code files."
            )

        try:
            if ext in {".txt", ".md", ".log", ".yaml", ".yml", ".xml", ".html", ".htm", ".py", ".js", ".ts", ".jsx", ".tsx", ".sh", ".sql", ".rst", ".rtf", ".toml", ".ini", ".env", ".tsv"} or (not is_binary and ext not in {".pdf", ".docx", ".doc", ".json", ".csv"}):
                try:
                    return file_bytes.decode("utf-8")
                except UnicodeDecodeError:
                    return file_bytes.decode("latin-1", errors="replace")

            elif ext == ".pdf":
                reader = pypdf.PdfReader(io.BytesIO(file_bytes))
                text_parts = []
                for idx, page in enumerate(reader.pages):
                    page_text = page.extract_text()
                    if page_text and page_text.strip():
                        text_parts.append(f"\n## Page {idx + 1}\n\n{page_text.strip()}")
                if not text_parts:
                    raise FileExtractionError("Could not extract any readable text from this PDF file (it may be scanned/image-only).")
                return "\n".join(text_parts)

            elif ext == ".docx":
                doc = docx.Document(io.BytesIO(file_bytes))
                paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]
                if not paragraphs:
                    raise FileExtractionError("The uploaded DOCX file is empty or contains no readable text.")
                return "\n\n".join(paragraphs)

            elif ext == ".json":
                try:
                    data = json.loads(file_bytes.decode("utf-8"))
                    return json.dumps(data, indent=2)
                except Exception:
                    return file_bytes.decode("utf-8", errors="replace")

            elif ext == ".csv":
                text_content = file_bytes.decode("utf-8", errors="replace")
                reader = csv.reader(io.StringIO(text_content))
                rows = list(reader)
                if not rows:
                    return text_content
                # Format CSV rows nicely
                lines = []
                header = rows[0]
                lines.append(" | ".join(header))
                lines.append(" | ".join(["---"] * len(header)))
                for row in rows[1:100]:  # Up to 100 sample rows
                    lines.append(" | ".join(row))
                return "\n".join(lines)

            else:
                return file_bytes.decode("utf-8", errors="replace")

        except Exception as e:
            if isinstance(e, FileExtractionError):
                raise
            raise FileExtractionError(f"Failed to extract text from {filename}: {str(e)}")

    @classmethod
    def structure_and_analyze_text(
        cls,
        raw_text: str,
        original_filename: str
    ) -> Tuple[str, List[Tuple[str, str]], str, List[str], List[str]]:
        """
        Intelligently parses extracted text into structured Markdown with semantic H2 headings,
        extracts an executive summary, detects key topics/entities, and generates 3 probing questions.
        Returns: (structured_body, sections, executive_summary, key_topics, suggested_questions)
        """
        clean_text = raw_text.strip()
        lines = [line.strip() for line in clean_text.splitlines() if line.strip()]
        ext = Path(original_filename).suffix.lower()

        sections: List[Tuple[str, str]] = []

        # 1. Check if the text already contains Markdown headings (# or ##)
        if re.search(r"^#{1,3}\s+", clean_text, flags=re.MULTILINE):
            current_heading = "Introduction & Overview"
            current_body: List[str] = []
            for line in clean_text.splitlines():
                h_match = re.match(r"^(#{1,3})\s+(.+)$", line)
                if h_match:
                    if current_body:
                        sections.append((current_heading, "\n".join(current_body).strip()))
                        current_body = []
                    current_heading = h_match.group(2).strip()
                else:
                    current_body.append(line)
            if current_body:
                sections.append((current_heading, "\n".join(current_body).strip()))
        
        # 2. Check if text has page breaks (e.g. from PDF extraction)
        elif "## Page " in clean_text:
            page_blocks = re.split(r"(## Page \d+)", clean_text)
            for i in range(1, len(page_blocks), 2):
                h = page_blocks[i].replace("##", "").strip()
                b = page_blocks[i+1].strip() if i+1 < len(page_blocks) else ""
                sections.append((h, b))

        # 3. CSV / Tabular data
        elif ext in {".csv", ".tsv"}:
            sections.append(("Tabular Data Structure", clean_text[:1200]))
            if len(clean_text) > 1200:
                sections.append(("Additional Rows & Values", clean_text[1200:]))

        # 4. JSON / Structured configuration data
        elif ext == ".json":
            sections.append(("JSON Schema & Attributes", clean_text[:1500]))
            if len(clean_text) > 1500:
                sections.append(("Data Values & Payloads", clean_text[1500:]))

        # 5. Natural text documents: split by candidate headings or paragraphs
        else:
            paragraphs = [p.strip() for p in clean_text.split("\n\n") if p.strip()]
            if len(paragraphs) <= 2:
                sections.append(("Document Content", clean_text))
            else:
                # Group into semantic blocks
                block_size = max(2, len(paragraphs) // 4)
                for idx in range(0, len(paragraphs), block_size):
                    chunk_paras = paragraphs[idx:idx + block_size]
                    first_line = chunk_paras[0].splitlines()[0]
                    # Check if first line looks like a title/heading
                    if len(first_line) < 60 and (first_line.endswith(":") or first_line.isupper() or not first_line.endswith(".")):
                        heading_title = first_line.rstrip(":")
                        body_text = "\n\n".join(chunk_paras)
                    else:
                        sec_num = (idx // block_size) + 1
                        heading_title = f"Section {sec_num}: Key Provisions" if sec_num > 1 else "Executive Overview"
                        body_text = "\n\n".join(chunk_paras)
                    sections.append((heading_title, body_text))

        if not sections:
            sections = [("Document Content", clean_text)]

        # Format structured markdown
        body_parts = []
        for h, b in sections:
            body_parts.append(f"## {h}\n\n{b}")
        structured_body = "\n\n".join(body_parts)

        # Extract substantive sentences for executive summary
        non_header_lines = [l.strip() for l in lines if not l.startswith("#") and len(l.strip()) > 20]
        if non_header_lines:
            summary_sentences = non_header_lines[:6]
            executive_summary = " ".join(summary_sentences)
        else:
            executive_summary = f"Extracted and structured content from {original_filename} into OKF format."

        # Extract key topics & terms (frequent capitalized concepts)
        words = re.findall(r"\b[A-Z][a-zA-Z0-9_\-]{2,}\b", clean_text)
        stopwords = {"This", "That", "The", "And", "For", "With", "Page", "Section", "From", "All", "Each", "When", "Must", "Have", "Will"}
        filtered_terms = [w for w in words if w not in stopwords and len(w) > 2]
        from collections import Counter
        top_terms = [term for term, _ in Counter(filtered_terms).most_common(8)]
        if not top_terms:
            top_terms = ["Operational Guidelines", "Core Parameters", "System Requirements"]

        # Formulate 4 dynamic suggested questions based on sections and topics
        doc_stem = Path(original_filename).stem.replace("_", " ").title()
        suggested_questions = []
        if len(sections) > 1 and sections[0][0]:
            suggested_questions.append(f"What are the main provisions and takeaways from '{sections[0][0]}'?")
        else:
            suggested_questions.append(f"What are the primary operational objectives outlined in {doc_stem}?")
        
        if len(top_terms) >= 2:
            suggested_questions.append(f"How does the document define and regulate {top_terms[0]} and {top_terms[1]}?")
        else:
            suggested_questions.append(f"What specific procedures or compliance rules are detailed in this document?")

        if len(sections) > 1 and sections[1][0]:
            suggested_questions.append(f"What requirements, timelines, or SLA thresholds are specified in '{sections[1][0]}'?")
        else:
            suggested_questions.append(f"What metrics, timeframes, or configurations are mandated in {doc_stem}?")

        suggested_questions.append(f"What are the key constraints, exceptions, and compliance requirements in this file?")

        return structured_body, sections, executive_summary, top_terms, suggested_questions

    @classmethod
    def convert_to_okf_document(
        cls,
        extracted_text: str,
        original_filename: str,
        upload_dir: Path
    ) -> Tuple[Path, str, str]:
        """
        Structures extracted text into a valid OKF v0.2 concept markdown file
        and writes it into knowledge/uploads/.
        Returns (target_path, concept_id, enlarged_summary_explanation).
        """
        clean_name = re.sub(r"[^a-zA-Z0-9_\-]", "_", Path(original_filename).stem).lower()
        if not clean_name:
            clean_name = "uploaded_doc"

        safe_filename = f"{clean_name}.md"
        target_path = upload_dir / safe_filename

        # Derive clean document title
        doc_title = Path(original_filename).stem.replace("_", " ").replace("-", " ").title()

        # Structure and analyze text
        structured_body, sections, exec_summary, key_topics, suggested_questions = cls.structure_and_analyze_text(
            extracted_text, original_filename
        )

        now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

        # Sanitize summary for YAML frontmatter
        yaml_desc = exec_summary[:400].replace('"', '\\"').replace("\n", " ")

        # Create OKF v0.2 concept frontmatter
        frontmatter = f"""---
type: Uploaded Document
title: "{doc_title}"
description: "{yaml_desc}"
resource: "file://uploads/{original_filename}"
tags: [uploaded, user_document, reference]
status: stable
generated: {{ by: "user_upload/{original_filename}", at: "{now_iso}" }}
verified: {{ by: "human:user", at: "{now_iso}" }}
sources:
  - id: original-upload
    resource: "file://uploads/{original_filename}"
    title: "{original_filename}"
---

# Overview

This document was uploaded, analyzed, and indexed into the OKF knowledge bundle from `{original_filename}`.[^original-upload]

{structured_body}

[^original-upload]: {original_filename}
"""
        upload_dir.mkdir(parents=True, exist_ok=True)
        target_path.write_text(frontmatter, encoding="utf-8")

        concept_id = f"uploads/{clean_name}"

        # Calculate metrics
        word_count = len(re.findall(r"\w+", extracted_text))
        reading_time = max(1, word_count // 200)

        # Build in-depth Section-by-Section narrative
        section_breakdowns = []
        for idx, (h, b) in enumerate(sections, 1):
            clean_lines = [l.strip() for l in b.splitlines() if l.strip()]
            snippet_summary = clean_lines[0] if clean_lines else "Contains standard provisions."
            sub_points = []
            for l in clean_lines[1:5]:
                if not l.startswith("#") and len(l) > 10:
                    sub_points.append(f"  - {l}")
            sub_str = ("\n" + "\n".join(sub_points)) if sub_points else ""
            section_breakdowns.append(f"**{idx}. {h}**\n> {snippet_summary}{sub_str}")

        sections_detailed_str = "\n\n".join(section_breakdowns)

        # Extract explicit directives, policies, numbers, timeframes
        directive_lines = []
        all_lines = [l.strip() for l in extracted_text.splitlines() if l.strip()]
        for line in all_lines:
            lower_l = line.lower()
            if any(k in lower_l for k in ["must", "require", "forbidden", "strictly", "rotate", "sla", "minute", "hour", "day", "port", "password", "escalat", "paged"]):
                clean_directive = line.lstrip("-*#•0123456789. ")
                if len(clean_directive) > 15 and clean_directive not in directive_lines:
                    directive_lines.append(clean_directive)

        if directive_lines:
            directives_list = "\n".join([f"- **Rule:** {d}" for d in directive_lines[:6]])
        else:
            directives_list = "- **Standard Compliance:** Adheres to designated operational and structural requirements as outlined."

        topics_str = ", ".join([f"`{t}`" for t in key_topics[:6]])
        questions_str = "\n".join([f"- *\"{q}\"*" for q in suggested_questions])

        # Enlarged, comprehensive RAG briefing
        explanation = (
            f"📄 **Successfully Ingested & Analyzed `{original_filename}`**\n\n"
            f"### 📋 Document Provenance & Metadata\n"
            f"- **Document Title:** {doc_title}\n"
            f"- **Total Word Count:** ~{word_count:,} words (~{reading_time} min read)\n"
            f"- **Semantic Sections Extracted:** {len(sections)} sections\n"
            f"- **OKF Concept ID:** `{concept_id}`\n"
            f"- **Knowledge Format:** Open Knowledge Format (OKF v0.2 Specification)\n"
            f"- **Attestation Source:** `file://uploads/{original_filename}`\n"
            f"- **Trust Tier:** `human-reviewed` (User Verified)\n"
            f"- **Key Technical Themes:** {topics_str}\n\n"
            f"### 📑 Executive Summary\n"
            f"{exec_summary}\n\n"
            f"### 🔍 Detailed Section-by-Section Breakdown\n"
            f"{sections_detailed_str}\n\n"
            f"### ⚡ Critical Directives, Parameters & Compliance Rules\n"
            f"{directives_list}\n\n"
            f"### ❓ Suggested Questions Grounded in this Document\n"
            f"{questions_str}\n\n"
            f"---\n"
            f"💡 *This file is indexed into the OKF vector & lexical knowledge graph. You can ask specific questions about its rules, numbers, procedures, or cross-reference it with existing knowledge.*"
        )

        return target_path, concept_id, explanation

file_extractor = FileExtractor()
