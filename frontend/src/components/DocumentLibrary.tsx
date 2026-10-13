import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Search,
  FileText,
  FileSpreadsheet,
  FileCode,
  RefreshCw,
  Trash2,
  MessageSquare,
  X,
  UploadCloud,
  Clock,
  Layers,
  BarChart3,
  ListTree,
  ChevronRight,
  ShieldCheck,
  Cpu,
  HelpCircle,
  Hash,
} from 'lucide-react';
import {
  LibraryDocumentItem,
  DocumentIntelligenceReport,
  LibraryStats,
} from '../types';
import {
  fetchLibraryDocuments,
  fetchDocumentIntelligence,
  deleteLibraryDocument,
  batchUploadDocuments,
} from '../services/api';

interface DocumentLibraryProps {
  onClose: () => void;
  onChatWithDocument: (conceptId: string, docTitle: string, suggestedQuestion?: string) => void;
}

export const DocumentLibrary: React.FC<DocumentLibraryProps> = ({
  onClose,
  onChatWithDocument,
}) => {
  const [documents, setDocuments] = useState<LibraryDocumentItem[]>([]);
  const [stats, setStats] = useState<LibraryStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Selected document report drawer
  const [selectedReport, setSelectedReport] = useState<DocumentIntelligenceReport | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  const [activeReportTab, setActiveReportTab] = useState<'overview' | 'entities' | 'outline' | 'preview'>('overview');

  // Batch upload state
  const [isUploadingBatch, setIsUploadingBatch] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  const loadLibrary = async () => {
    setIsLoading(true);
    try {
      const res = await fetchLibraryDocuments();
      setDocuments(res.documents);
      setStats(res.stats);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to load document library' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReport = async (conceptId: string) => {
    setIsLoadingReport(true);
    try {
      const report = await fetchDocumentIntelligence(conceptId);
      setSelectedReport(report);
      setActiveReportTab('overview');
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to load intelligence report' });
    } finally {
      setIsLoadingReport(false);
    }
  };

  const handleDelete = async (conceptId: string, docTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`Are you sure you want to delete '${docTitle}' from the library?`)) return;

    try {
      await deleteLibraryDocument(conceptId);
      setToast({ type: 'success', message: `Deleted '${docTitle}' and updated library.` });
      if (selectedReport?.concept_id === conceptId) {
        setSelectedReport(null);
      }
      await loadLibrary();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to delete document' });
    }
  };

  const handleBatchFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const files = Array.from(e.target.files);
      setIsUploadingBatch(true);
      try {
        const res = await batchUploadDocuments(files);
        setToast({ type: 'success', message: `Successfully batch uploaded & analyzed ${res.total_uploaded} documents!` });
        await loadLibrary();
      } catch (err: any) {
        setToast({ type: 'error', message: err.message || 'Batch upload failed' });
      } finally {
        setIsUploadingBatch(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    }
  };

  const getFormatBadge = (fmt: string) => {
    switch (fmt.toLowerCase()) {
      case 'pdf':
        return { label: 'PDF', color: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 border-red-200 dark:border-red-900/40', icon: FileText };
      case 'docx':
      case 'doc':
        return { label: 'DOCX', color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 border-blue-200 dark:border-blue-900/40', icon: FileText };
      case 'csv':
      case 'tsv':
        return { label: 'DATA', color: 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-200 dark:border-emerald-900/40', icon: FileSpreadsheet };
      case 'json':
        return { label: 'JSON', color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border-amber-200 dark:border-amber-900/40', icon: FileCode };
      default:
        return { label: 'MARKDOWN', color: 'bg-purple-50 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400 border-purple-200 dark:border-purple-900/40', icon: FileText };
    }
  };

  const renderTrustBadge = (tier: string) => {
    switch (tier) {
      case 'human-reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
            <ShieldCheck className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
            Human-Reviewed
          </span>
        );
      case 'machine-confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
            <Cpu className="w-3 h-3 text-blue-600 dark:text-blue-400" />
            Machine-Confirmed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
            <HelpCircle className="w-3 h-3 text-amber-500" />
            Unverified
          </span>
        );
    }
  };

  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.concept_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.top_entities.some((e) => e.toLowerCase().includes(searchQuery.toLowerCase()));

    if (formatFilter === 'all') return matchesSearch;
    if (formatFilter === 'uploaded') return matchesSearch && doc.is_uploaded;
    return matchesSearch && doc.file_format.toLowerCase() === formatFilter.toLowerCase();
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fbfbfd] dark:bg-[#121214] overflow-hidden">
      {/* Hidden Multi-file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleBatchFileSelect}
        multiple
        className="hidden"
      />

      {/* Header */}
      <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Document Intelligent Library
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800/40">
                OKF v0.2 Catalog
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Explore intelligent document extractions, structural outlines, readability metrics, and RAG grounding.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploadingBatch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>{isUploadingBatch ? 'Ingesting...' : 'Batch Ingest'}</span>
          </button>

          <button
            onClick={loadLibrary}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-black/[0.04] dark:hover:bg-white/[0.08] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Toast Alert */}
      {toast && (
        <div
          className={`px-6 py-2 text-xs flex items-center justify-between ${
            toast.type === 'success'
              ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300'
              : 'bg-red-50 dark:bg-red-950/40 text-red-800 dark:text-red-300'
          }`}
        >
          <span>{toast.message}</span>
          <button onClick={() => setToast(null)} className="font-bold">
            ×
          </button>
        </div>
      )}

      {/* Top Metrics Row */}
      <div className="p-6 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Documents in Library</span>
            <Layers className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.total_documents ?? 0}
          </div>
          <span className="text-[11px] text-indigo-600 dark:text-indigo-400 font-medium">
            Bundled & Uploaded
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Total Words Indexed</span>
            <Hash className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {(stats?.total_words ?? 0).toLocaleString()}
          </div>
          <span className="text-[11px] text-gray-400">
            Fine-grained RAG Chunks
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Average Readability</span>
            <BarChart3 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.avg_readability ?? 75}%
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Flesch Ease Metric
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Library Storage</span>
            <Clock className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {((stats?.total_size_bytes ?? 0) / 1024).toFixed(1)} KB
          </div>
          <span className="text-[11px] text-gray-400">
            Structured Markdown
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-6 py-3 flex flex-wrap items-center justify-between gap-3 border-b border-black/[0.06] dark:border-white/[0.08]">
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search library documents, topics, or entities..."
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#1c1c1e] text-xs border border-black/[0.08] dark:border-white/[0.1] text-gray-900 dark:text-gray-100 outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto text-xs">
          {['all', 'uploaded', 'md', 'pdf', 'docx', 'csv', 'json'].map((f) => (
            <button
              key={f}
              onClick={() => setFormatFilter(f)}
              className={`px-3 py-1 rounded-xl font-medium transition-colors uppercase text-[11px] ${
                formatFilter === f
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-[#1c1c1e] text-gray-600 dark:text-gray-300 border border-black/[0.06] dark:border-white/[0.08] hover:bg-gray-50 dark:hover:bg-white/[0.05]'
              }`}
            >
              {f}
            </button>
          ))}

          <div className="h-4 w-px bg-gray-200 dark:bg-white/10 mx-1" />

          <button
            onClick={() => setViewMode(viewMode === 'grid' ? 'table' : 'grid')}
            className="px-2.5 py-1 rounded-xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] text-gray-600 dark:text-gray-300 text-[11px] font-medium"
          >
            {viewMode === 'grid' ? 'Table View' : 'Grid View'}
          </button>
        </div>
      </div>

      {/* Documents Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-400">
            No documents matched your filter. Ingest files using the button above!
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredDocuments.map((doc) => {
              const badge = getFormatBadge(doc.file_format);
              const BadgeIcon = badge.icon;
              return (
                <div
                  key={doc.concept_id}
                  onClick={() => handleOpenReport(doc.concept_id)}
                  className="group p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] hover:border-indigo-500/40 hover:shadow-md transition-all cursor-pointer flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                        <BadgeIcon className="w-3 h-3" />
                        {badge.label}
                      </span>
                      {renderTrustBadge(doc.trust_tier)}
                    </div>

                    <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-1 mb-1">
                      {doc.title}
                    </h3>
                    <span className="font-mono text-[10px] text-gray-400 block mb-2 truncate">
                      {doc.concept_id}
                    </span>

                    <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-3 mb-3 leading-relaxed">
                      {doc.executive_summary}
                    </p>

                    {doc.top_entities.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {doc.top_entities.slice(0, 3).map((ent, i) => (
                          <span
                            key={i}
                            className="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300 text-[10px]"
                          >
                            {ent}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between text-[11px] text-gray-400">
                    <span>
                      ~{doc.word_count} words • {doc.reading_time_minutes} min read
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onChatWithDocument(doc.concept_id, doc.title);
                        }}
                        className="p-1.5 rounded-lg text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors"
                        title="Chat grounded in this document"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                      {doc.is_uploaded && (
                        <button
                          onClick={(e) => handleDelete(doc.concept_id, doc.title, e)}
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                          title="Delete from library"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shadow-sm">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-gray-50 dark:bg-[#16181d] border-b border-black/[0.06] dark:border-white/[0.08] text-gray-500 dark:text-gray-400">
                  <th className="py-3 px-4 font-semibold">Document Title</th>
                  <th className="py-3 px-4 font-semibold">Format</th>
                  <th className="py-3 px-4 font-semibold">Trust Tier</th>
                  <th className="py-3 px-4 font-semibold">Words</th>
                  <th className="py-3 px-4 font-semibold">Sections</th>
                  <th className="py-3 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                {filteredDocuments.map((doc) => {
                  const badge = getFormatBadge(doc.file_format);
                  return (
                    <tr
                      key={doc.concept_id}
                      onClick={() => handleOpenReport(doc.concept_id)}
                      className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{doc.title}</div>
                        <span className="font-mono text-[10px] text-gray-400">{doc.concept_id}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.color}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">{renderTrustBadge(doc.trust_tier)}</td>
                      <td className="py-3 px-4">{doc.word_count}</td>
                      <td className="py-3 px-4">{doc.section_count}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onChatWithDocument(doc.concept_id, doc.title);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-medium hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                        >
                          <MessageSquare className="w-3 h-3" />
                          <span>Chat</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Document Intelligence Report Modal / Drawer */}
      {selectedReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-xl h-full bg-white dark:bg-[#1c1c1e] border-l border-black/[0.08] dark:border-white/[0.1] shadow-2xl flex flex-col overflow-hidden">
            {/* Drawer Header */}
            <div className="p-5 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center justify-between">
              <div>
                <span className="font-mono text-xs text-gray-400">{selectedReport.concept_id}</span>
                <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  {selectedReport.title}
                </h3>
              </div>
              <button
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Action Banner */}
            <div className="px-5 py-3 bg-indigo-50/60 dark:bg-indigo-950/20 border-b border-indigo-100 dark:border-indigo-900/30 flex items-center justify-between">
              <span className="text-xs text-indigo-900 dark:text-indigo-200 font-medium">
                ~{selectedReport.word_count} words • {selectedReport.reading_time_minutes} min read
              </span>
              <button
                onClick={() => onChatWithDocument(selectedReport.concept_id, selectedReport.title)}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-colors flex items-center gap-1.5"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Chat with this Document</span>
              </button>
            </div>

            {/* Drawer Sub-Tabs */}
            <div className="px-5 pt-2 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 text-xs">
              <button
                onClick={() => setActiveReportTab('overview')}
                className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors ${
                  activeReportTab === 'overview'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Overview & Metrics
              </button>
              <button
                onClick={() => setActiveReportTab('entities')}
                className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors ${
                  activeReportTab === 'entities'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Entities & Concepts ({selectedReport.entities.length})
              </button>
              <button
                onClick={() => setActiveReportTab('outline')}
                className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors ${
                  activeReportTab === 'outline'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Outline Tree ({selectedReport.outline.length})
              </button>
              <button
                onClick={() => setActiveReportTab('preview')}
                className={`pb-2 px-2.5 font-semibold border-b-2 transition-colors ${
                  activeReportTab === 'preview'
                    ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                    : 'border-transparent text-gray-500 hover:text-gray-800'
                }`}
              >
                Raw Preview
              </button>
            </div>

            {/* Drawer Tab Content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs">
              {activeReportTab === 'overview' && (
                <>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1.5 uppercase tracking-wider text-[11px]">
                      Executive Briefing & Summary
                    </h4>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed p-3.5 rounded-xl bg-gray-50 dark:bg-[#16181d] border border-black/[0.04] dark:border-white/[0.06]">
                      {selectedReport.executive_summary}
                    </p>
                  </div>

                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1.5 uppercase tracking-wider text-[11px]">
                      Readability & Linguistic Complexity
                    </h4>
                    <div className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#16181d] flex items-center justify-between">
                      <div>
                        <div className="text-xl font-bold text-gray-900 dark:text-gray-100">
                          {selectedReport.readability_score} / 100
                        </div>
                        <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                          {selectedReport.complexity_level}
                        </span>
                      </div>
                      <BarChart3 className="w-6 h-6 text-indigo-500" />
                    </div>
                  </div>

                  {selectedReport.suggested_questions.length > 0 && (
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-gray-100 mb-1.5 uppercase tracking-wider text-[11px]">
                        Suggested Probing Questions
                      </h4>
                      <div className="space-y-1.5">
                        {selectedReport.suggested_questions.map((q, idx) => (
                          <div
                            key={idx}
                            onClick={() => onChatWithDocument(selectedReport.concept_id, selectedReport.title, q)}
                            className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#16181d] hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <span>"{q}"</span>
                            <ChevronRight className="w-3.5 h-3.5 text-gray-400 group-hover:text-indigo-500 transition-colors" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}

              {activeReportTab === 'entities' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    {selectedReport.entities.map((ent, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 rounded-xl bg-gray-50 dark:bg-[#16181d] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between"
                      >
                        <div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">{ent.name}</div>
                          <span className="text-[10px] text-gray-400">{ent.category}</span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                          {ent.count}x
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeReportTab === 'outline' && (
                <div className="space-y-2">
                  {selectedReport.outline.map((node, idx) => (
                    <div
                      key={idx}
                      className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d] border border-black/[0.04] dark:border-white/[0.06]"
                    >
                      <div className="flex items-center gap-1.5 font-semibold text-gray-900 dark:text-gray-100 mb-1">
                        <ListTree className="w-3.5 h-3.5 text-indigo-500" />
                        <span>{node.title}</span>
                      </div>
                      {node.preview && (
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
                          {node.preview}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {activeReportTab === 'preview' && (
                <div>
                  <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 font-mono text-[11px] overflow-x-auto leading-relaxed whitespace-pre-wrap">
                    {selectedReport.raw_preview}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading overlay for report fetching */}
      {isLoadingReport && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-xs">
          <div className="px-4 py-3 rounded-2xl bg-white dark:bg-[#1c1c1e] shadow-xl border border-black/10 dark:border-white/10 flex items-center gap-3 text-xs font-medium text-gray-800 dark:text-gray-200">
            <RefreshCw className="w-4 h-4 text-indigo-600 animate-spin" />
            <span>Analyzing document intelligence...</span>
          </div>
        </div>
      )}
    </div>
  );
};
