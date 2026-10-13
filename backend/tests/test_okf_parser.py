import pytest
from backend.app.services.okf_parser import OKFParser

VALID_OKF_CONTENT = """---
type: API Endpoint
title: User Service Authentication
description: OAuth2 endpoints for authenticating mobile and web users.
resource: https://api.example.com/v1/auth
tags: [auth, security, oauth2]
status: stable
generated: { by: agent:okf_generator/v1, at: 2026-10-01T12:00:00Z }
verified:
  - { by: human:alice, at: 2026-10-02T15:00:00Z }
sources:
  - id: oauth-rfc
    resource: https://datatracker.ietf.org/doc/html/rfc6749
    title: The OAuth 2.0 Authorization Framework
    author: human:ietf
---

# Endpoints

The service provides `/oauth/token` for token exchange.[^oauth-rfc]

# Rate Limiting

Requests are capped at 120 calls per minute.

[^oauth-rfc]: The OAuth 2.0 Authorization Framework
"""

MISSING_TYPE_CONTENT = """---
title: Broken Concept Without Type
description: Missing the required type field.
tags: [broken]
---

# Details
This document violates the OKF v0.2 specification.
"""

MALFORMED_YAML_CONTENT = """---
type: API Endpoint
title: Bad YAML
tags: [incomplete
---

# Body
Content here.
"""

MACHINE_ONLY_VERIFIED = """---
type: Dataset
title: Nightly Telemetry
verified:
  - { by: process:etl_validator, at: 2026-10-01T00:00:00Z }
---
# Content
Processed telemetry.
"""

UNVERIFIED_CONTENT = """---
type: Guide
title: Internal Draft
---
# Content
Draft guide.
"""

def test_parse_valid_okf_concept():
    doc, findings = OKFParser.parse_content(
        content=VALID_OKF_CONTENT,
        relative_path="technical/auth.md"
    )
    assert doc is not None
    assert doc.concept_id == "technical/auth"
    assert doc.type == "API Endpoint"
    assert doc.title == "User Service Authentication"
    assert doc.trust_tier == "human-reviewed"
    assert doc.status == "stable"
    assert "oauth2" in doc.tags
    assert len(doc.frontmatter.sources) == 1
    assert doc.frontmatter.sources[0].id == "oauth-rfc"
    assert "oauth-rfc" in doc.footnotes
    assert len(doc.sections) >= 2

def test_missing_required_type_fails():
    doc, findings = OKFParser.parse_content(
        content=MISSING_TYPE_CONTENT,
        relative_path="general/broken.md"
    )
    assert doc is None
    error_codes = [f.code for f in findings if f.severity == "error"]
    assert "okf.missing_required_type" in error_codes

def test_malformed_yaml_fails():
    doc, findings = OKFParser.parse_content(
        content=MALFORMED_YAML_CONTENT,
        relative_path="general/bad_yaml.md"
    )
    assert doc is None
    error_codes = [f.code for f in findings if f.severity == "error"]
    assert "okf.yaml_syntax" in error_codes

def test_trust_tier_inference():
    # Human-reviewed
    doc1, _ = OKFParser.parse_content(VALID_OKF_CONTENT, "a.md")
    assert doc1.trust_tier == "human-reviewed"

    # Machine-confirmed
    doc2, _ = OKFParser.parse_content(MACHINE_ONLY_VERIFIED, "b.md")
    assert doc2.trust_tier == "machine-confirmed"

    # Unverified
    doc3, _ = OKFParser.parse_content(UNVERIFIED_CONTENT, "c.md")
    assert doc3.trust_tier == "unverified"

def test_reserved_filenames_detected():
    assert OKFParser.is_reserved_file("index.md") is True
    assert OKFParser.is_reserved_file("log.md") is True
    assert OKFParser.is_reserved_file("technical/index.md") is True
    assert OKFParser.is_reserved_file("technical/api.md") is False
