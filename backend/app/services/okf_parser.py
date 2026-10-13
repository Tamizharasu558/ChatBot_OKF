from __future__ import annotations
import re
import yaml
from pathlib import Path
from typing import Tuple, Optional, List, Dict, Any
from datetime import datetime, timezone
from backend.app.models.okf_models import (
    ConceptDocument,
    ConceptFrontmatter,
    ParsedSection,
    ValidationFinding,
    VerificationEntry,
    SourceEntry,
    GeneratedInfo,
    ParameterEntry,
    ExecutorInfo,
    AttesterInfo,
)

RESERVED_FILENAMES = {"index.md", "log.md"}

class OKFParser:
    """
    Parser and validator conforming strictly to the Open Knowledge Format (OKF v0.2).
    """

    @staticmethod
    def is_reserved_file(file_path: str | Path) -> bool:
        path = Path(file_path)
        return path.name.lower() in RESERVED_FILENAMES

    @classmethod
    def parse_file(
        cls,
        file_path: str | Path,
        bundle_root: str | Path
    ) -> Tuple[Optional[ConceptDocument], List[ValidationFinding]]:
        """
        Parses a markdown file into a ConceptDocument or logs validation findings.
        """
        path = Path(file_path)
        root = Path(bundle_root)
        findings: List[ValidationFinding] = []

        try:
            rel_path = path.relative_to(root).as_posix()
        except ValueError:
            rel_path = path.name

        # Reserved files check
        if cls.is_reserved_file(path):
            findings.append(ValidationFinding(
                file_path=rel_path,
                kind="reserved_file",
                code="okf.reserved_name",
                message=f"{path.name} is a reserved bundle navigation/history file, not a concept document.",
                severity="info"
            ))
            return None, findings

        if not path.is_file():
            findings.append(ValidationFinding(
                file_path=rel_path,
                kind="file_not_found",
                code="okf.missing_file",
                message=f"File not found: {path}",
                severity="error"
            ))
            return None, findings

        try:
            content = path.read_text(encoding="utf-8")
        except Exception as e:
            findings.append(ValidationFinding(
                file_path=rel_path,
                kind="read_error",
                code="okf.encoding_error",
                message=f"Could not read file as UTF-8: {str(e)}",
                severity="error"
            ))
            return None, findings

        file_stat = path.stat()
        return cls.parse_content(
            content=content,
            relative_path=rel_path,
            full_path=str(path),
            file_mtime=file_stat.st_mtime,
            findings=findings
        )

    @classmethod
    def parse_content(
        cls,
        content: str,
        relative_path: str,
        full_path: str = "",
        file_mtime: float = 0.0,
        findings: Optional[List[ValidationFinding]] = None
    ) -> Tuple[Optional[ConceptDocument], List[ValidationFinding]]:
        if findings is None:
            findings = []

        # Check for YAML frontmatter delimited by '---'
        frontmatter_dict, body, fm_raw = cls._extract_frontmatter(content, relative_path, findings)
        if frontmatter_dict is None:
            return None, findings

        # Validate required 'type' field per OKF v0.2 section 4.1
        concept_type = frontmatter_dict.get("type")
        if not concept_type or not str(concept_type).strip():
            findings.append(ValidationFinding(
                file_path=relative_path,
                line=1,
                kind="validation",
                code="okf.missing_required_type",
                message="OKF v0.2 requires a non-empty 'type' field in YAML frontmatter.",
                severity="error"
            ))
            return None, findings

        concept_type = str(concept_type).strip()

        # Concept ID is relative path with .md suffix removed per OKF v0.2 section 2
        concept_id = relative_path
        if concept_id.endswith(".md"):
            concept_id = concept_id[:-3]

        # Recommended fields linting
        title = frontmatter_dict.get("title")
        if not title:
            # OKF v0.2 section 4.1: derive from filename if omitted
            title = Path(relative_path).stem.replace("_", " ").replace("-", " ").title()
            findings.append(ValidationFinding(
                file_path=relative_path,
                kind="lint",
                code="okf.recommended_title_missing",
                message=f"Frontmatter lacks recommended 'title'. Derived title: '{title}'.",
                severity="warning"
            ))
        else:
            title = str(title).strip()

        description = str(frontmatter_dict.get("description", "")).strip()
        if not description:
            findings.append(ValidationFinding(
                file_path=relative_path,
                kind="lint",
                code="okf.recommended_description_missing",
                message="Frontmatter lacks recommended 'description' summary sentence.",
                severity="warning"
            ))

        resource = frontmatter_dict.get("resource")
        if resource:
            resource = str(resource).strip()

        tags_raw = frontmatter_dict.get("tags", [])
        tags = [str(t).strip() for t in tags_raw if str(t).strip()] if isinstance(tags_raw, list) else []

        # Sources (OKF section 5.1)
        sources_list: List[SourceEntry] = []
        raw_sources = frontmatter_dict.get("sources", [])
        if isinstance(raw_sources, list):
            for idx, s in enumerate(raw_sources):
                if isinstance(s, dict) and "resource" in s:
                    sources_list.append(SourceEntry(
                        resource=str(s["resource"]),
                        id=s.get("id"),
                        title=s.get("title"),
                        author=s.get("author"),
                        usage_count=s.get("usage_count"),
                        last_modified=s.get("last_modified")
                    ))
                else:
                    findings.append(ValidationFinding(
                        file_path=relative_path,
                        kind="validation",
                        code="okf.invalid_source_entry",
                        message=f"Source entry at index {idx} must be a mapping with a 'resource' field.",
                        severity="warning"
                    ))

        # Generated (OKF section 5.2)
        generated_info: Optional[GeneratedInfo] = None
        raw_gen = frontmatter_dict.get("generated")
        if isinstance(raw_gen, dict) and "by" in raw_gen:
            generated_info = GeneratedInfo(
                by=str(raw_gen["by"]),
                at=raw_gen.get("at")
            )

        # Verified & Trust Tier derivation (OKF section 5.2, 5.3)
        raw_verified = frontmatter_dict.get("verified")
        verification_entries: List[VerificationEntry] = []
        if isinstance(raw_verified, dict) and "by" in raw_verified:
            # Single verifier bare mapping accepted per OKF v0.2 section 5.2
            verification_entries.append(VerificationEntry(
                by=str(raw_verified["by"]),
                at=raw_verified.get("at")
            ))
        elif isinstance(raw_verified, list):
            for v in raw_verified:
                if isinstance(v, dict) and "by" in v:
                    verification_entries.append(VerificationEntry(
                        by=str(v["by"]),
                        at=v.get("at")
                    ))

        trust_tier = cls._derive_trust_tier(verification_entries)

        # Lifecycle: status and staleness (OKF section 5.4, 5.5)
        status = str(frontmatter_dict.get("status", "stable")).strip().lower()
        if status not in {"draft", "stable", "deprecated"}:
            status = "stable"

        stale_after = frontmatter_dict.get("stale_after")
        is_stale = cls._check_is_stale(stale_after)

        # Attested computation fields (OKF section 10)
        runtime = frontmatter_dict.get("runtime")
        parameters: Optional[List[ParameterEntry]] = None
        if isinstance(frontmatter_dict.get("parameters"), list):
            parameters = []
            for p in frontmatter_dict["parameters"]:
                if isinstance(p, dict) and "name" in p and "type" in p:
                    parameters.append(ParameterEntry(
                        name=str(p["name"]),
                        type=str(p["type"]),
                        required=bool(p.get("required", True))
                    ))

        executor = None
        if isinstance(frontmatter_dict.get("executor"), dict):
            ex_data = frontmatter_dict["executor"]
            if "resource" in ex_data:
                executor = ExecutorInfo(
                    resource=str(ex_data["resource"]),
                    receipt=ex_data.get("receipt") if isinstance(ex_data.get("receipt"), list) else None
                )

        attester = None
        if isinstance(frontmatter_dict.get("attester"), dict):
            at_data = frontmatter_dict["attester"]
            if "resource" in at_data:
                attester = AttesterInfo(resource=str(at_data["resource"]))

        computation = frontmatter_dict.get("computation")

        # Collect extension keys
        known_keys = {
            "type", "title", "description", "resource", "tags", "sources",
            "generated", "verified", "status", "stale_after", "runtime",
            "parameters", "executor", "attester", "computation"
        }
        extra_fields = {k: v for k, v in frontmatter_dict.items() if k not in known_keys}

        frontmatter_obj = ConceptFrontmatter(
            type=concept_type,
            title=title,
            description=description,
            resource=resource,
            tags=tags,
            sources=sources_list,
            generated=generated_info,
            verified=verification_entries,
            status=status,
            stale_after=stale_after,
            runtime=runtime,
            parameters=parameters,
            computation=computation,
            executor=executor,
            attester=attester,
            extra_fields=extra_fields
        )

        # Parse body sections & markdown footnotes
        sections, footnotes = cls._parse_body(body)

        import hashlib
        file_hash = hashlib.md5(content.encode("utf-8")).hexdigest()

        concept_doc = ConceptDocument(
            concept_id=concept_id,
            relative_path=relative_path,
            file_path=full_path,
            frontmatter=frontmatter_obj,
            title=title,
            type=concept_type,
            description=description,
            tags=tags,
            trust_tier=trust_tier,
            is_stale=is_stale,
            status=status,
            body=body,
            sections=sections,
            footnotes=footnotes,
            file_hash=file_hash,
            last_modified=file_mtime
        )

        return concept_doc, findings

    @classmethod
    def _extract_frontmatter(
        cls,
        content: str,
        relative_path: str,
        findings: List[ValidationFinding]
    ) -> Tuple[Optional[Dict[str, Any]], str, str]:
        stripped = content.strip()
        if not stripped.startswith("---"):
            findings.append(ValidationFinding(
                file_path=relative_path,
                line=1,
                kind="validation",
                code="okf.no_frontmatter",
                message="OKF concept document must begin with '---' YAML frontmatter delimiter.",
                severity="error"
            ))
            return None, content, ""

        # Find closing delimiter '---'
        lines = content.splitlines(keepends=True)
        if not lines or lines[0].strip() != "---":
            findings.append(ValidationFinding(
                file_path=relative_path,
                line=1,
                kind="validation",
                code="okf.frontmatter_delimiter_error",
                message="First line must be exactly '---'.",
                severity="error"
            ))
            return None, content, ""

        closing_idx = -1
        for i in range(1, len(lines)):
            if lines[i].strip() == "---":
                closing_idx = i
                break

        if closing_idx == -1:
            findings.append(ValidationFinding(
                file_path=relative_path,
                kind="validation",
                code="okf.unclosed_frontmatter",
                message="Frontmatter block missing closing '---' delimiter.",
                severity="error"
            ))
            return None, content, ""

        fm_text = "".join(lines[1:closing_idx])
        body_text = "".join(lines[closing_idx + 1:]).strip()

        try:
            parsed_fm = yaml.safe_load(fm_text)
            if not isinstance(parsed_fm, dict):
                findings.append(ValidationFinding(
                    file_path=relative_path,
                    kind="validation",
                    code="okf.invalid_frontmatter_structure",
                    message="Frontmatter YAML must parse to a key-value mapping.",
                    severity="error"
                ))
                return None, body_text, fm_text
            return parsed_fm, body_text, fm_text
        except yaml.YAMLError as exc:
            findings.append(ValidationFinding(
                file_path=relative_path,
                kind="yaml_syntax_error",
                code="okf.yaml_syntax",
                message=f"YAML parsing error in frontmatter: {str(exc)}",
                severity="error"
            ))
            return None, body_text, fm_text

    @classmethod
    def _derive_trust_tier(cls, verifications: List[VerificationEntry]) -> str:
        """
        Derives trust tier strictly per OKF v0.2 section 5.3:
        - No verified key => unverified
        - verified by non-human: actors only => machine-confirmed
        - verified by a human:<id> actor => human-reviewed
        """
        if not verifications:
            return "unverified"

        has_human = any(v.by.startswith("human:") for v in verifications)
        if has_human:
            return "human-reviewed"

        return "machine-confirmed"

    @classmethod
    def _check_is_stale(cls, stale_after: Any) -> bool:
        """
        OKF section 5.5: concept is stale when now >= stale_after
        """
        if not stale_after:
            return False

        try:
            if isinstance(stale_after, datetime):
                target_dt = stale_after
            else:
                target_dt = datetime.fromisoformat(str(stale_after).replace("Z", "+00:00"))
            
            if target_dt.tzinfo is None:
                target_dt = target_dt.replace(tzinfo=timezone.utc)
            
            now_dt = datetime.now(timezone.utc)
            return now_dt >= target_dt
        except Exception:
            return False

    @classmethod
    def _parse_body(cls, body: str) -> Tuple[List[ParsedSection], Dict[str, str]]:
        sections: List[ParsedSection] = []
        footnotes: Dict[str, str] = {}

        # Footnote extraction: [^id]: description
        fn_pattern = re.compile(r"^\[\^([a-zA-Z0-9_\-]+)\]:\s*(.+)$", re.MULTILINE)
        clean_body = body
        for match in fn_pattern.finditer(body):
            fn_id = match.group(1)
            fn_text = match.group(2).strip()
            footnotes[fn_id] = fn_text

        # Remove footnote definitions from body for sectioning
        clean_body = fn_pattern.sub("", clean_body).strip()

        # Split into sections based on markdown headers #, ##, ###
        header_pattern = re.compile(r"^(#{1,3})\s+(.+)$", re.MULTILINE)
        splits = list(header_pattern.finditer(clean_body))

        if not splits:
            if clean_body:
                sections.append(ParsedSection(
                    heading="General",
                    content=clean_body,
                    level=1
                ))
            return sections, footnotes

        # Content before first heading
        first_start = splits[0].start()
        lead_content = clean_body[:first_start].strip()
        if lead_content:
            sections.append(ParsedSection(
                heading="Overview",
                content=lead_content,
                level=1
            ))

        for i, match in enumerate(splits):
            level = len(match.group(1))
            heading = match.group(2).strip()
            start_pos = match.end()
            end_pos = splits[i + 1].start() if i + 1 < len(splits) else len(clean_body)
            section_content = clean_body[start_pos:end_pos].strip()

            sections.append(ParsedSection(
                heading=heading,
                content=section_content,
                level=level
            ))

        return sections, footnotes
