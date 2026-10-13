import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  HelpCircle,
  Activity,
  GitFork,
  CheckCircle2,
  FileCheck2,
  RefreshCw,
  Search,
  ArrowRight,
  Database,
  Code2,
  Sparkles,
  X,
} from 'lucide-react';
import { IntelligenceStats, ConceptAnalysis, GraphNode, GraphEdge } from '../types';
import { fetchIntelligenceStats, acknowledgeConcept, analyzeConcept } from '../services/api';

interface IntelligenceWorkspaceProps {
  onClose: () => void;
  onRefreshHealth: () => void;
}

export const IntelligenceWorkspace: React.FC<IntelligenceWorkspaceProps> = ({
  onClose,
  onRefreshHealth,
}) => {
  const [stats, setStats] = useState<IntelligenceStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'ledger' | 'graph' | 'attested' | 'deepdive'>('ledger');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedConceptId, setSelectedConceptId] = useState<string | null>(null);
  const [conceptAnalysis, setConceptAnalysis] = useState<ConceptAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Sign & Acknowledge Modal state
  const [signingModalOpen, setSigningModalOpen] = useState(false);
  const [signingConceptId, setSigningConceptId] = useState<string>('');
  const [actorName, setActorName] = useState('human:lead_reviewer');
  const [signingNotes, setSigningNotes] = useState('Full compliance audit and factual verification passed.');
  const [isSigning, setIsSigning] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    setIsLoading(true);
    try {
      const data = await fetchIntelligenceStats();
      setStats(data);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to load intelligence stats' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenSigning = (conceptId: string) => {
    setSigningConceptId(conceptId);
    setSigningModalOpen(true);
  };

  const handleExecuteAcknowledge = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signingConceptId) return;

    setIsSigning(true);
    try {
      const res = await acknowledgeConcept(signingConceptId, actorName, signingNotes);
      setToast({ type: 'success', message: res.message });
      setSigningModalOpen(false);
      await loadStats();
      onRefreshHealth();
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Acknowledgement failed' });
    } finally {
      setIsSigning(false);
    }
  };

  const handleSelectDeepDive = async (conceptId: string) => {
    setSelectedConceptId(conceptId);
    setActiveTab('deepdive');
    setIsAnalyzing(true);
    try {
      const analysis = await analyzeConcept(conceptId);
      setConceptAnalysis(analysis);
    } catch (err: any) {
      setToast({ type: 'error', message: err.message || 'Failed to analyze concept' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const renderTrustBadge = (tier: string) => {
    switch (tier) {
      case 'human-reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            Human-Reviewed
          </span>
        );
      case 'machine-confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
            <Cpu className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Machine-Confirmed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800/40">
            <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
            Unverified
          </span>
        );
    }
  };

  const nodes = stats?.graph?.nodes || [];
  const edges = stats?.graph?.edges || [];

  const filteredNodes = nodes.filter((n: GraphNode) =>
    n.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    n.type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-[#fbfbfd] dark:bg-[#121214] overflow-hidden">
      {/* Workspace Header */}
      <div className="px-6 py-4 border-b border-black/[0.06] dark:border-white/[0.08] bg-white/70 dark:bg-[#1c1c1e]/70 backdrop-blur-md flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                AI Acknowledgement Intelligence Workspace
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                OKF v0.2 Provenance
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Provenance auditing, trust tier sign-offs, attestation verification, and knowledge network intelligence.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadStats}
            disabled={isLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gray-100 dark:bg-white/[0.08] hover:bg-gray-200 dark:hover:bg-white/[0.12] text-xs font-medium text-gray-700 dark:text-gray-200 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Audit Refresh</span>
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

      {/* KPI Cards Row */}
      <div className="p-6 pb-2 grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Knowledge Health Index</span>
            <Activity className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.health_score ?? 100}%
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Strict OKF Conformance
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Human-Reviewed</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.trust_distribution['human-reviewed'] ?? 0}
          </div>
          <span className="text-[11px] text-gray-400">
            Signed by Human Authority
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Machine-Confirmed</span>
            <Cpu className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.trust_distribution['machine-confirmed'] ?? 0}
          </div>
          <span className="text-[11px] text-gray-400">
            Automated Agent Verification
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-1">
            <span>Active Provenance Sources</span>
            <Database className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {stats?.total_sources ?? 0}
          </div>
          <span className="text-[11px] text-gray-400">
            External RFCs, Policies & Schemas
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="px-6 pt-3 border-b border-black/[0.06] dark:border-white/[0.08] flex items-center gap-2 text-xs">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'ledger'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
          }`}
        >
          <FileCheck2 className="w-3.5 h-3.5" />
          <span>Trust & Acknowledgement Ledger</span>
        </button>

        <button
          onClick={() => setActiveTab('graph')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'graph'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>Knowledge Network & Cross-Links ({edges.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('attested')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
            activeTab === 'attested'
              ? 'border-blue-600 text-blue-600 dark:text-blue-400'
              : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
          }`}
        >
          <Code2 className="w-3.5 h-3.5" />
          <span>Attested Computations (§10)</span>
        </button>

        {selectedConceptId && (
          <button
            onClick={() => setActiveTab('deepdive')}
            className={`pb-2.5 px-3 font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'deepdive'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-500" />
            <span>AI Deep-Dive Analysis</span>
          </button>
        )}
      </div>

      {/* Main Tab Panels */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Tab 1: Ledger */}
        {activeTab === 'ledger' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div className="relative w-full max-w-sm">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter concepts by ID, title, or type..."
                  className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-white dark:bg-[#1c1c1e] text-xs border border-black/[0.08] dark:border-white/[0.1] text-gray-900 dark:text-gray-100 outline-none focus:border-blue-500"
                />
              </div>

              <span className="text-xs text-gray-400">
                {filteredNodes.length} Concepts Tracked
              </span>
            </div>

            <div className="rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-gray-50 dark:bg-[#16181d] border-b border-black/[0.06] dark:border-white/[0.08] text-gray-500 dark:text-gray-400">
                    <th className="py-3 px-4 font-semibold">Concept ID</th>
                    <th className="py-3 px-4 font-semibold">Title & Type</th>
                    <th className="py-3 px-4 font-semibold">Trust Tier</th>
                    <th className="py-3 px-4 font-semibold">Lifecycle</th>
                    <th className="py-3 px-4 font-semibold text-right">Acknowledgement Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.04] dark:divide-white/[0.04]">
                  {filteredNodes.map((n: GraphNode) => (
                    <tr key={n.id} className="hover:bg-gray-50/50 dark:hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600 dark:text-gray-300">
                        {n.id}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-gray-900 dark:text-gray-100">{n.label}</div>
                        <span className="text-[10px] text-gray-400 uppercase tracking-wider">{n.type}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {renderTrustBadge(n.trust_tier)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-medium uppercase tracking-wider bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-300">
                          {n.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleSelectDeepDive(n.id)}
                            className="px-2.5 py-1 rounded-lg bg-gray-100 dark:bg-white/[0.06] hover:bg-gray-200 dark:hover:bg-white/[0.1] text-[11px] font-medium text-gray-700 dark:text-gray-200 transition-colors"
                          >
                            AI Analyze
                          </button>
                          <button
                            onClick={() => handleOpenSigning(n.id)}
                            className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-medium transition-colors shadow-sm flex items-center gap-1"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Sign & Verify</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Tab 2: Knowledge Graph & Cross-Links */}
        {activeTab === 'graph' && (
          <div className="space-y-4">
            <div className="p-4 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1">
                Cross-Concept Relationship Graph
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Derived directional cross-links between OKF concept documents per OKF v0.2 Section 6.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {edges.map((e: GraphEdge, idx: number) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-xl bg-gray-50 dark:bg-[#16181d] border border-black/[0.04] dark:border-white/[0.06] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="font-mono text-blue-600 dark:text-blue-400 font-medium">
                        {e.source}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5 text-gray-400" />
                      <span className="font-mono text-purple-600 dark:text-purple-400 font-medium">
                        {e.target}
                      </span>
                    </div>
                    <span className="text-[11px] text-gray-400 italic">
                      "{e.label}"
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Attested Computations */}
        {activeTab === 'attested' && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                  Type: Attested Computation
                </span>
                <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Verified by CFO
                </span>
              </div>

              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
                Fiscal Year Recognized Revenue Computation
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Sanctioned deterministic computation contract for recognized company revenue under GAAP ASC 606.
              </p>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d]">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Runtime</span>
                  <p className="font-mono font-semibold text-gray-800 dark:text-gray-200">postgres</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d]">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Parameter</span>
                  <p className="font-mono font-semibold text-gray-800 dark:text-gray-200">fiscal_year (int)</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d]">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Executor</span>
                  <p className="font-mono font-semibold text-gray-800 dark:text-gray-200 truncate">run-postgres-query.md</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d]">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Attester Code</span>
                  <p className="font-mono font-semibold text-gray-800 dark:text-gray-200 truncate">revenue_check.py</p>
                </div>
              </div>

              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Sanctioned SQL Computation
              </h4>
              <pre className="p-4 rounded-xl bg-gray-900 text-gray-100 font-mono text-xs overflow-x-auto leading-relaxed">
{`SELECT 
    COALESCE(SUM(inv.subtotal_usd - inv.discount_usd), 0.00) AS total_revenue
FROM finance.invoices inv
JOIN finance.billing_accounts acc ON inv.account_id = acc.id
WHERE inv.status = 'PAID'
  AND inv.fiscal_year = :fiscal_year
  AND inv.refund_status IS NULL;`}
              </pre>
            </div>
          </div>
        )}

        {/* Tab 4: AI Concept Deep-Dive */}
        {activeTab === 'deepdive' && (
          isAnalyzing ? (
            <div className="p-12 text-center text-xs text-gray-500 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />
              <span>Analyzing concept architecture and linguistic structure...</span>
            </div>
          ) : conceptAnalysis ? (
            <div className="space-y-4">
              <div className="p-5 rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.06] dark:border-white/[0.08] shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-xs text-gray-400">{conceptAnalysis.concept_id}</span>
                {renderTrustBadge(conceptAnalysis.trust_tier)}
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">
                {conceptAnalysis.title}
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-4 leading-relaxed">
                {conceptAnalysis.executive_summary}
              </p>

              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                Structural & Linguistic Intelligence Metrics
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 mb-4 text-xs">
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d] text-center">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Words</span>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-200">{conceptAnalysis.metrics.word_count}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d] text-center">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Sections</span>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-200">{conceptAnalysis.metrics.sections_count}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d] text-center">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Code Blocks</span>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-200">{conceptAnalysis.metrics.code_blocks}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d] text-center">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Tables</span>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-200">{conceptAnalysis.metrics.tables_count}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d] text-center">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Sources</span>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-200">{conceptAnalysis.metrics.declared_sources}</p>
                </div>
                <div className="p-3 rounded-xl bg-gray-50 dark:bg-[#16181d] text-center">
                  <span className="text-gray-400 text-[10px] uppercase font-bold">Footnotes</span>
                  <p className="text-base font-bold text-gray-800 dark:text-gray-200">{conceptAnalysis.metrics.footnote_citations}</p>
                </div>
              </div>

              {conceptAnalysis.verifications.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
                    Signed Verification Signatures
                  </h4>
                  <div className="space-y-1.5">
                    {conceptAnalysis.verifications.map((v, i) => (
                      <div
                        key={i}
                        className="p-2.5 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/50 dark:border-emerald-800/20 text-xs flex items-center justify-between"
                      >
                        <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                          {v.by}
                        </span>
                        <span className="text-[11px] text-gray-400 font-mono">
                          {v.at || 'N/A'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : null)}
      </div>

      {/* Sign & Acknowledge Modal */}
      {signingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-[#1c1c1e] border border-black/[0.08] dark:border-white/[0.1] shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-blue-600" />
                <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                  Acknowledge & Sign Concept
                </h3>
              </div>
              <button
                onClick={() => setSigningModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExecuteAcknowledge} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-gray-500 mb-1 font-medium">Concept ID</label>
                <input
                  type="text"
                  disabled
                  value={signingConceptId}
                  className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.06] font-mono text-gray-700 dark:text-gray-300 outline-none"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">
                  Actor Identity (per OKF §7)
                </label>
                <input
                  type="text"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  placeholder="human:lead_reviewer or process:agent_name"
                  className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.06] border border-transparent focus:border-blue-500 text-gray-900 dark:text-gray-100 outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-gray-700 dark:text-gray-300 mb-1 font-medium">
                  Verification Notes / Audit Scope
                </label>
                <textarea
                  rows={3}
                  value={signingNotes}
                  onChange={(e) => setSigningNotes(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-gray-100 dark:bg-white/[0.06] border border-transparent focus:border-blue-500 text-gray-900 dark:text-gray-100 outline-none resize-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSigningModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-white/[0.06]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSigning}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-medium shadow-sm transition-colors disabled:opacity-50 flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{isSigning ? 'Signing...' : 'Sign & Verify Concept'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
