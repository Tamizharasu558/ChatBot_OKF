from __future__ import annotations
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field
from datetime import datetime

class SourceEntry(BaseModel):
    resource: str
    id: Optional[str] = None
    title: Optional[str] = None
    author: Optional[str] = None
    usage_count: Optional[int] = None
    last_modified: Optional[Union[str, datetime]] = None

class GeneratedInfo(BaseModel):
    by: str
    at: Optional[Union[str, datetime]] = None

class VerificationEntry(BaseModel):
    by: str
    at: Optional[Union[str, datetime]] = None

class ParameterEntry(BaseModel):
    name: str
    type: str
    required: bool = True

class ExecutorInfo(BaseModel):
    resource: str
    receipt: Optional[List[str]] = None

class AttesterInfo(BaseModel):
    resource: str

class ConceptFrontmatter(BaseModel):
    type: str = Field(..., description="Required OKF concept type")
    title: Optional[str] = None
    description: Optional[str] = None
    resource: Optional[str] = None
    tags: List[str] = Field(default_factory=list)
    sources: List[SourceEntry] = Field(default_factory=list)
    generated: Optional[GeneratedInfo] = None
    verified: Optional[Union[VerificationEntry, List[VerificationEntry]]] = None
    status: Optional[str] = "stable"
    stale_after: Optional[Union[str, datetime]] = None
    
    # Attested computation fields (OKF Section 10)
    runtime: Optional[str] = None
    parameters: Optional[List[ParameterEntry]] = None
    computation: Optional[str] = None
    executor: Optional[ExecutorInfo] = None
    attester: Optional[AttesterInfo] = None
    
    # Extension fields
    extra_fields: Dict[str, Any] = Field(default_factory=dict)

class ParsedSection(BaseModel):
    heading: str
    content: str
    level: int = 1

class ConceptDocument(BaseModel):
    concept_id: str
    relative_path: str
    file_path: str
    frontmatter: ConceptFrontmatter
    title: str
    type: str
    description: str
    tags: List[str] = Field(default_factory=list)
    trust_tier: str = "unverified"  # unverified | machine-confirmed | human-reviewed
    is_stale: bool = False
    status: str = "stable"
    body: str
    sections: List[ParsedSection] = Field(default_factory=list)
    footnotes: Dict[str, str] = Field(default_factory=dict)
    file_hash: str = ""
    last_modified: float = 0.0

class ValidationFinding(BaseModel):
    file_path: str
    line: Optional[int] = None
    kind: str  # validation | lint | warning
    code: str
    message: str
    severity: str = "error"  # error | warning | info

class PassageChunk(BaseModel):
    chunk_id: str
    concept_id: str
    document_title: str
    document_type: str
    document_resource: Optional[str] = None
    section_heading: str
    text: str
    tags: List[str] = Field(default_factory=list)
    trust_tier: str = "unverified"
    status: str = "stable"
    is_stale: bool = False
    source_references: List[SourceEntry] = Field(default_factory=list)

class RetrievedPassage(BaseModel):
    chunk: PassageChunk
    score: float
    matched_terms: List[str] = Field(default_factory=list)

class Citation(BaseModel):
    document_title: str
    concept_id: str
    section_heading: str
    resource_url: Optional[str] = None
    passage_snippet: str
    trust_tier: str
    source_author: Optional[str] = None

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = None

class ChatResponse(BaseModel):
    answer: str
    sources: List[Citation] = Field(default_factory=list)
    conversation_id: str
    retrieval_count: int = 0
    confidence: str = "grounded"  # grounded | unsupported | fallback

class MessageResponse(BaseModel):
    id: str
    role: str
    content: str
    sources: List[Citation] = Field(default_factory=list)
    created_at: str

class ConversationSummary(BaseModel):
    id: str
    title: str
    created_at: str
    updated_at: str
    message_count: int = 0

class KnowledgeDocumentSummary(BaseModel):
    concept_id: str
    title: str
    type: str
    description: str
    tags: List[str]
    trust_tier: str
    status: str
    is_stale: bool
    relative_path: str
    sources_count: int
    resource: Optional[str] = None

class KnowledgeOverview(BaseModel):
    total_concepts: int
    categories: Dict[str, int]
    types: Dict[str, int]
    trust_tiers: Dict[str, int]
    documents: List[KnowledgeDocumentSummary]
    validation_issues: List[ValidationFinding] = Field(default_factory=list)
    last_indexed_at: str

class DocumentDetailResponse(BaseModel):
    concept_id: str
    title: str
    type: str
    description: str
    tags: List[str]
    trust_tier: str
    status: str
    is_stale: bool
    relative_path: str
    frontmatter_yaml: str
    raw_markdown: str
    body_markdown: str
    sections: List[ParsedSection]
    sources: List[SourceEntry]
    footnotes: Dict[str, str]

class ExtractedEntity(BaseModel):
    name: str
    category: str  # Technology | Policy | Metric | Organization | Role
    count: int = 1

class DocumentOutlineNode(BaseModel):
    title: str
    level: int = 2
    preview: Optional[str] = None

class LibraryDocumentItem(BaseModel):
    concept_id: str
    title: str
    type: str
    filename: str
    relative_path: str
    category: str
    file_format: str
    size_bytes: int
    word_count: int
    reading_time_minutes: int
    section_count: int
    trust_tier: str
    status: str
    is_stale: bool
    is_uploaded: bool
    executive_summary: str
    top_entities: List[str] = Field(default_factory=list)
    created_at: Optional[str] = None

class DocumentIntelligenceReport(BaseModel):
    concept_id: str
    title: str
    type: str
    filename: str
    file_format: str
    size_bytes: int
    word_count: int
    reading_time_minutes: int
    trust_tier: str
    executive_summary: str
    readability_score: float
    complexity_level: str
    entities: List[ExtractedEntity] = Field(default_factory=list)
    outline: List[DocumentOutlineNode] = Field(default_factory=list)
    suggested_questions: List[str] = Field(default_factory=list)
    sample_passages: List[Dict[str, Any]] = Field(default_factory=list)
    raw_preview: str

class LibraryStats(BaseModel):
    total_documents: int
    total_words: int
    total_size_bytes: int
    format_distribution: Dict[str, int]
    category_distribution: Dict[str, int]
    avg_readability: float

