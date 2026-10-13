import React, { useState, useEffect } from 'react';
import {
  X,
  RefreshCw,
  Search,
  BookOpen,
  AlertTriangle,
  CheckCircle,
} from 'lucide-react';
import {
  KnowledgeOverview,
  KnowledgeDocumentSummary,
  DocumentDetail,
  ParsedSection,
  ValidationFinding,
} from '../types';
import {
  fetchKnowledgeOverview,
  fetchDocumentDetail,
  createOrUpdateDocument,
  reindexKnowledge,
} from '../services/api';

interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onIndexedRefresh?: () => void;
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({
  isOpen,
  onClose,
  onIndexedRefresh,
}) => {
  const [activeTab, setActiveTab] = useState<'catalog' | 'detail' | 'create' | 'diagnostics'>('catalog');
  const [overview, setOverview] = useState<KnowledgeOverview | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<DocumentDetail | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLoading, setIsLoading] = useState(false);
  const [isReindexing, setIsReindexing] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form states for creating concept
  const [newCategory, setNewCategory] = useState('technical');
  const [newFilename, setNewFilename] = useState('');
  const [newContent, setNewContent] = useState(`---
type: Guide
title: My New Concept
description: A concise one-line summary of this concept.
resource: https://docs.internal/concept
tags: [sample, guide]
status: stable
verified: { by: human:reviewer, at: 2026-10-10T12:00:00Z }
sources:
  - id: sample-doc
    resource: https://docs.internal/sample
    title: Sample Reference Material
---

# Overview

Describe your new concept here. Every statement is indexed into searchable chunks for the chatbot.
`);

  useEffect(() => {
    if (isOpen) {
      loadOverview();
    }
  }, [isOpen]);

  const loadOverview = async () => {
    setIsLoading(true);
    try {
      const data = await fetchKnowledgeOverview();
      setOverview(data);
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to load catalog' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleReindex = async () => {
    setIsReindexing(true);
    try {
      const res = await reindexKnowledge();
      setNotification({
        type: 'success',
        message: `Indexed ${res.total_documents} documents (${res.total_chunks} chunks).`,
      });
      await loadOverview();
      if (onIndexedRefresh) onIndexedRefresh();
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Reindex failed' });
    } finally {
      setIsReindexing(false);
    }
  };

  const handleSelectDoc = async (conceptId: string) => {
    setIsLoading(true);
    try {
      const detail = await fetchDocumentDetail(conceptId);
      setSelectedDoc(detail);
      setActiveTab('detail');
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Failed to fetch document detail' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFilename.trim()) {
      setNotification({ type: 'error', message: 'Filename is required' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await createOrUpdateDocument(newCategory, newFilename, newContent);
      setNotification({ type: 'success', message: res.message });
      await loadOverview();
      if (onIndexedRefresh) onIndexedRefresh();
      setActiveTab('catalog');
    } catch (err: any) {
      setNotification({ type: 'error', message: err.message || 'Validation or creation failed' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredDocs: KnowledgeDocumentSummary[] = overview?.documents.filter((doc: KnowledgeDocumentSummary) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.concept_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.tags.some((t: string) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const category = doc.relative_path.split('/')[0];
    const matchesCategory = selectedCategory === 'all' || category === selectedCategory;

    return matchesSearch && matchesCategory;
  }) || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl h-[90vh] max-h-[800px] flex flex-col rounded-3xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#16181d]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-600 flex items-center justify-center text-white">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                OKF Knowledge Catalog
              </h2>
              <span className="text-[11px] text-gray-400">
                {overview?.total_concepts ?? 0} Concepts • OKF v0.2 Specification
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReindex}
              disabled={isReindexing}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isReindexing ? 'animate-spin' : ''}`} />
              <span>{isReindexing ? 'Indexing...' : 'Re-Index'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-white/[0.08] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-black/[0.06] dark:border-white/[0.08] bg-[#fbfbfd] dark:bg-[#16181d] text-xs">
          <button
            onClick={() => setActiveTab('catalog')}
            className={`pb-2.5 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'catalog'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
            }`}
          >
            Concept Catalog
          </button>
          {selectedDoc && (
            <button
              onClick={() => setActiveTab('detail')}
              className={`pb-2.5 px-2 font-medium border-b-2 transition-colors ${
                activeTab === 'detail'
                  ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
              }`}
            >
              Document Inspector
            </button>
          )}
          <button
            onClick={() => setActiveTab('create')}
            className={`pb-2.5 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'create'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
            }`}
          >
            Add New Concept
          </button>
          <button
            onClick={() => setActiveTab('diagnostics')}
            className={`pb-2.5 px-2 font-medium border-b-2 transition-colors ${
              activeTab === 'diagnostics'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
            }`}
          >
            Diagnostics ({overview?.validation_issues?.length ?? 0})
          </button>
        </div>

        {/* Toast Notification */}
        {notification && (
          <div
            className={`px-6 py-2.5 text-xs flex items-center justify-between ${
              notification.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
                : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-xs font-bold ml-2">
              ×
            </button>
          </div>
        )}

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'catalog' && (
            <div className="space-y-4">
              {/* Search & Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search title, tag, or ID..."
                    className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.06] text-xs border-0 outline-none text-gray-900 dark:text-gray-100"
                  />
                </div>

                {/* Category Pills */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  {['all', 'technical', 'products', 'faq', 'general'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-colors ${
                        selectedCategory === cat
                          ? 'bg-blue-600 text-white font-medium'
                          : 'bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-white/[0.1]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Concept Document Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {filteredDocs.map((doc: KnowledgeDocumentSummary) => (
                  <div
                    key={doc.concept_id}
                    onClick={() => handleSelectDoc(doc.concept_id)}
                    className="p-4 rounded-2xl bg-white dark:bg-[#16181d] border border-black/[0.06] dark:border-white/[0.08] hover:border-blue-500/40 hover:shadow-md cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300">
                          {doc.type}
                        </span>
                        <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                          {doc.trust_tier}
                        </span>
                      </div>

                      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        {doc.title}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed mb-3">
                        {doc.description || 'No description provided.'}
                      </p>
                    </div>

                    <div className="pt-2 border-t border-black/[0.04] dark:border-white/[0.04] flex items-center justify-between text-[11px] text-gray-400">
                      <span className="font-mono text-[10px]">{doc.concept_id}</span>
                      <span>{doc.sources_count} Sources</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'detail' && selectedDoc && (
            <div className="space-y-6">
              <div className="flex items-center justify-between pb-3 border-b border-black/[0.06] dark:border-white/[0.08]">
                <div>
                  <span className="text-[11px] font-mono text-gray-400">{selectedDoc.concept_id}</span>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    {selectedDoc.title}
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                    {selectedDoc.type}
                  </span>
                  <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
                    {selectedDoc.trust_tier}
                  </span>
                </div>
              </div>

              {/* Frontmatter YAML Preview */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  OKF YAML Frontmatter
                </h4>
                <pre className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#121214] border border-black/[0.06] dark:border-white/[0.08] text-xs font-mono text-gray-800 dark:text-gray-200 overflow-x-auto">
                  {selectedDoc.frontmatter_yaml}
                </pre>
              </div>

              {/* Document Sections */}
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                  Parsed Structural Sections ({selectedDoc.sections.length})
                </h4>
                <div className="space-y-3">
                  {selectedDoc.sections.map((sec: ParsedSection, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-white dark:bg-[#16181d] border border-black/[0.06] dark:border-white/[0.08]"
                    >
                      <h5 className="text-xs font-bold text-gray-900 dark:text-gray-100 mb-1">
                        #{sec.level} {sec.heading}
                      </h5>
                      <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed font-mono">
                        {sec.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'create' && (
            <form onSubmit={handleCreateDocument} className="space-y-4 max-w-2xl mx-auto">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category Subdirectory
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.06] text-xs text-gray-900 dark:text-gray-100 outline-none border border-transparent focus:border-blue-500"
                  >
                    <option value="technical">technical</option>
                    <option value="products">products</option>
                    <option value="faq">faq</option>
                    <option value="general">general</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Filename (e.g. security_policy.md)
                  </label>
                  <input
                    type="text"
                    value={newFilename}
                    onChange={(e) => setNewFilename(e.target.value)}
                    placeholder="my_concept.md"
                    className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.06] text-xs text-gray-900 dark:text-gray-100 outline-none border border-transparent focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  OKF Content (Markdown with YAML Frontmatter)
                </label>
                <textarea
                  rows={12}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl bg-gray-100 dark:bg-[#121214] text-xs font-mono text-gray-900 dark:text-gray-100 outline-none border border-transparent focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors disabled:opacity-50"
                >
                  {isLoading ? 'Validating & Indexing...' : 'Save & Index Concept'}
                </button>
              </div>
            </form>
          )}

          {activeTab === 'diagnostics' && (
            <div className="space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                Bundle Validation & Linter Findings
              </h4>
              {overview?.validation_issues.length === 0 ? (
                <div className="p-6 text-center text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/40">
                  <CheckCircle className="w-6 h-6 mx-auto mb-2 text-emerald-500" />
                  All concept files strictly conform to the OKF v0.2 specification!
                </div>
              ) : (
                overview?.validation_issues.map((f: ValidationFinding, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-white dark:bg-[#16181d] border border-black/[0.06] dark:border-white/[0.08] flex items-start gap-3"
                  >
                    <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-xs font-semibold text-gray-900 dark:text-gray-100">
                          {f.code}
                        </span>
                        <span className="text-[10px] font-mono text-gray-400">{f.file_path}</span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-300">{f.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
