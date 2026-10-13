import {
  HealthStatus,
  Message,
  ConversationSummary,
  KnowledgeOverview,
  DocumentDetail,
  Citation,
  IntelligenceStats,
  ConceptAnalysis,
  LibraryResponse,
  DocumentIntelligenceReport,
  ModelStatus,
} from '../types';

export interface ChatResponsePayload {
  answer: string;
  sources: Citation[];
  conversation_id: string;
  retrieval_count: number;
  confidence: 'grounded' | 'unsupported' | 'fallback';
}

export interface UploadResponsePayload {
  success: boolean;
  filename: string;
  concept_id: string;
  explanation: string;
  conversation_id: string;
  sources: Citation[];
  indexed_concepts: number;
  indexed_chunks: number;
}

export async function fetchHealth(): Promise<HealthStatus> {
  const res = await fetch('/health');
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function sendChatMessage(
  question: string,
  conversationId?: string | null
): Promise<ChatResponsePayload> {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, conversation_id: conversationId || undefined }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Failed to send message');
  }
  return res.json();
}

export async function fetchConversations(): Promise<ConversationSummary[]> {
  const res = await fetch('/api/conversations');
  if (!res.ok) throw new Error('Failed to load conversation history');
  return res.json();
}

export async function fetchConversationMessages(conversationId: string): Promise<Message[]> {
  const res = await fetch(`/api/conversations/${conversationId}`);
  if (!res.ok) throw new Error('Failed to load conversation messages');
  return res.json();
}

export async function deleteConversation(conversationId: string): Promise<void> {
  const res = await fetch(`/api/conversations/${conversationId}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete conversation');
}

export async function fetchKnowledgeOverview(): Promise<KnowledgeOverview> {
  const res = await fetch('/api/knowledge');
  if (!res.ok) throw new Error('Failed to fetch knowledge catalog');
  return res.json();
}

export async function fetchDocumentDetail(conceptId: string): Promise<DocumentDetail> {
  const res = await fetch(`/api/knowledge/documents/${encodeURIComponent(conceptId)}`);
  if (!res.ok) throw new Error('Failed to fetch document details');
  return res.json();
}

export async function createOrUpdateDocument(
  category: string,
  filename: string,
  content: string
): Promise<{ success: boolean; message: string; concept_id: string }> {
  const res = await fetch('/api/knowledge/documents', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ category, filename, content }),
  });
  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    const detailMsg = typeof errorData.detail === 'object' ? JSON.stringify(errorData.detail) : errorData.detail;
    throw new Error(detailMsg || 'Failed to save document');
  }
  return res.json();
}

export async function reindexKnowledge(): Promise<{
  success: boolean;
  total_documents: number;
  total_chunks: number;
  validation_findings_count: number;
}> {
  const res = await fetch('/api/knowledge/reindex', {
    method: 'POST',
  });
  if (!res.ok) throw new Error('Failed to trigger reindexing');
  return res.json();
}

export async function uploadDocument(
  file: File,
  conversationId?: string | null,
  question?: string | null
): Promise<UploadResponsePayload> {
  const formData = new FormData();
  formData.append('file', file);
  if (conversationId) {
    formData.append('conversation_id', conversationId);
  }
  if (question && question.trim()) {
    formData.append('question', question.trim());
  }

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(errorData.detail || 'Failed to upload document');
  }

  return res.json();
}

export async function fetchIntelligenceStats(): Promise<IntelligenceStats> {
  const res = await fetch('/api/intelligence/stats');
  if (!res.ok) throw new Error('Failed to load intelligence workspace stats');
  return res.json();
}

export async function acknowledgeConcept(
  conceptId: string,
  actor: string,
  notes?: string
): Promise<{ success: boolean; new_trust_tier: string; message: string }> {
  const res = await fetch('/api/intelligence/acknowledge', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ concept_id: conceptId, actor, notes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to acknowledge concept');
  }
  return res.json();
}

export async function analyzeConcept(conceptId: string): Promise<ConceptAnalysis> {
  const res = await fetch(`/api/intelligence/analyze/${encodeURIComponent(conceptId)}`);
  if (!res.ok) throw new Error('Failed to load concept analysis');
  return res.json();
}

export async function fetchLibraryDocuments(): Promise<LibraryResponse> {
  const res = await fetch('/api/library');
  if (!res.ok) throw new Error('Failed to load library catalog');
  return res.json();
}

export async function fetchDocumentIntelligence(conceptId: string): Promise<DocumentIntelligenceReport> {
  const res = await fetch(`/api/library/${encodeURIComponent(conceptId)}`);
  if (!res.ok) throw new Error('Failed to load document intelligence report');
  return res.json();
}

export async function deleteLibraryDocument(conceptId: string): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`/api/library/${encodeURIComponent(conceptId)}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to delete document');
  }
  return res.json();
}

export async function batchUploadDocuments(files: File[]): Promise<{
  success: boolean;
  total_uploaded: number;
  results: { filename: string; concept_id?: string; success: boolean; explanation?: string; error?: string }[];
}> {
  const formData = new FormData();
  for (const f of files) {
    formData.append('files', f);
  }

  const res = await fetch('/api/library/batch-upload', {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to batch upload documents');
  }
  return res.json();
}

export async function fetchModelStatus(): Promise<ModelStatus> {
  const res = await fetch('/api/model/status');
  if (!res.ok) throw new Error('Failed to load model status');
  return res.json();
}

export async function switchModel(payload: {
  provider: string;
  model?: string;
  groq_api_key?: string;
  ollama_base_url?: string;
}): Promise<{ success: boolean; status: ModelStatus }> {
  const res = await fetch('/api/model/switch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || 'Failed to switch model provider');
  }
  return res.json();
}

