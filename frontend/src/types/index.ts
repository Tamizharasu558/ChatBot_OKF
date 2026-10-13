export interface Citation {
  document_title: string;
  concept_id: string;
  section_heading: string;
  resource_url?: string | null;
  passage_snippet: string;
  trust_tier: 'unverified' | 'machine-confirmed' | 'human-reviewed';
  source_author?: string | null;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  sources?: Citation[];
  created_at?: string;
  isStreaming?: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

export interface HealthStatus {
  status: string;
  app_env: string;
  version: string;
  provider: string;
  model: string;
  indexed_concepts: number;
  indexed_chunks: number;
  validation_issues_count: number;
}

export interface ValidationFinding {
  file_path: string;
  line?: number | null;
  kind: string;
  code: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export interface KnowledgeDocumentSummary {
  concept_id: string;
  title: string;
  type: string;
  description: string;
  tags: string[];
  trust_tier: 'unverified' | 'machine-confirmed' | 'human-reviewed';
  status: string;
  is_stale: boolean;
  relative_path: string;
  sources_count: number;
  resource?: string | null;
}

export interface KnowledgeOverview {
  total_concepts: number;
  categories: Record<string, number>;
  types: Record<string, number>;
  trust_tiers: Record<string, number>;
  documents: KnowledgeDocumentSummary[];
  validation_issues: ValidationFinding[];
  last_indexed_at: string;
}

export interface ParsedSection {
  heading: string;
  content: string;
  level: number;
}

export interface SourceEntry {
  resource: string;
  id?: string | null;
  title?: string | null;
  author?: string | null;
  usage_count?: number | null;
  last_modified?: string | null;
}

export interface DocumentDetail {
  concept_id: string;
  title: string;
  type: string;
  description: string;
  tags: string[];
  trust_tier: string;
  status: string;
  is_stale: boolean;
  relative_path: string;
  frontmatter_yaml: string;
  raw_markdown: string;
  body_markdown: string;
  sections: ParsedSection[];
  sources: SourceEntry[];
  footnotes: Record<string, string>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  category: string;
  trust_tier: string;
  status: string;
  is_stale: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface IntelligenceStats {
  total_concepts: number;
  total_chunks: number;
  total_sources: number;
  health_score: number;
  trust_distribution: Record<string, number>;
  type_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  stale_concepts_count: number;
  graph: {
    nodes: GraphNode[];
    edges: GraphEdge[];
  };
  last_audit_at: string;
}

export interface ConceptAnalysis {
  concept_id: string;
  title: string;
  type: string;
  trust_tier: string;
  status: string;
  is_stale: boolean;
  metrics: {
    word_count: number;
    sections_count: number;
    code_blocks: number;
    tables_count: number;
    declared_sources: number;
    footnote_citations: number;
  };
  sections: string[];
  executive_summary: string;
  tags: string[];
  sources: SourceEntry[];
  verifications: { by: string; at?: string }[];
}

export interface ExtractedEntity {
  name: string;
  category: string;
  count: number;
}

export interface DocumentOutlineNode {
  title: string;
  level: number;
  preview?: string | null;
}

export interface LibraryDocumentItem {
  concept_id: string;
  title: string;
  type: string;
  filename: string;
  relative_path: string;
  category: string;
  file_format: string;
  size_bytes: number;
  word_count: number;
  reading_time_minutes: number;
  section_count: number;
  trust_tier: string;
  status: string;
  is_stale: boolean;
  is_uploaded: boolean;
  executive_summary: string;
  top_entities: string[];
  created_at?: string | null;
}

export interface DocumentIntelligenceReport {
  concept_id: string;
  title: string;
  type: string;
  filename: string;
  file_format: string;
  size_bytes: number;
  word_count: number;
  reading_time_minutes: number;
  trust_tier: string;
  executive_summary: string;
  readability_score: number;
  complexity_level: string;
  entities: ExtractedEntity[];
  outline: DocumentOutlineNode[];
  suggested_questions: string[];
  sample_passages: { section: string; snippet: string; word_count: number }[];
  raw_preview: string;
}

export interface LibraryStats {
  total_documents: number;
  total_words: number;
  total_size_bytes: number;
  format_distribution: Record<string, number>;
  category_distribution: Record<string, number>;
  avg_readability: number;
}

export interface LibraryResponse {
  documents: LibraryDocumentItem[];
  stats: LibraryStats;
}

export interface ModelOption {
  id: string;
  name: string;
  speed: string;
}

export interface ModelStatus {
  provider: 'groq' | 'ollama' | 'mock';
  model_id: string;
  display_name: string;
  is_llama_3_2: boolean;
  groq_api_key_configured: boolean;
  ollama_base_url: string;
  available_models: {
    groq: ModelOption[];
    ollama: ModelOption[];
    mock: ModelOption[];
  };
}

