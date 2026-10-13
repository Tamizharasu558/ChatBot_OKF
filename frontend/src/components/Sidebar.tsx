import React from 'react';
import {
  MessageSquarePlus,
  Trash2,
  BookOpen,
  Database,
  ExternalLink,
  X,
  Activity,
  MessageSquare,
} from 'lucide-react';
import { ConversationSummary, HealthStatus } from '../types';

interface SidebarProps {
  conversations: ConversationSummary[];
  activeConversationId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string, e: React.MouseEvent) => void;
  onOpenKnowledgeModal: () => void;
  onOpenIntelligenceWorkspace?: () => void;
  onOpenDocumentLibrary?: () => void;
  onOpenModelModal?: () => void;
  health: HealthStatus | null;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onOpenKnowledgeModal,
  onOpenIntelligenceWorkspace,
  onOpenDocumentLibrary,
  onOpenModelModal,
  health,
  isOpenMobile,
  onCloseMobile,
}) => {
  return (
    <>
      {/* Mobile backdrop */}
      {isOpenMobile && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
          onClick={onCloseMobile}
        />
      )}

      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 flex flex-col w-72 glass-sidebar transition-transform duration-300 ease-out ${
          isOpenMobile ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 pt-5 pb-3">
          <div className="flex items-center gap-3">
            {/* App icon */}
            <div className="w-9 h-9 rounded-2xl glass-blue flex items-center justify-center shadow-lg">
              <Database className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-slate-100 tracking-tight leading-none">
                OKF Assistant
              </h1>
              <span className="text-[10px] text-slate-500 font-medium tracking-wide">
                Open Knowledge v0.2
              </span>
            </div>
          </div>
          <button
            onClick={onCloseMobile}
            className="md:hidden p-1.5 rounded-xl glass text-slate-400 hover:text-slate-200 transition-colors"
            aria-label="Close sidebar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── New Conversation ── */}
        <div className="px-3 pb-2">
          <button
            onClick={() => { onNewChat(); onCloseMobile(); }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl glass text-slate-200 text-xs font-semibold hover:scale-[1.02] hover:bg-white/[0.08] transition-all duration-200 group"
          >
            <div className="flex items-center gap-2.5">
              <MessageSquarePlus className="w-4 h-4 text-blue-400" />
              <span>New Conversation</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[9px] text-slate-500 bg-white/[0.05] rounded-md border border-white/[0.08] font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* ── Quick Access Buttons ── */}
        <div className="px-3 pb-1 space-y-1.5">
          {/* Document Library */}
          <button
            onClick={() => { onOpenDocumentLibrary?.(); onCloseMobile(); }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl glass-violet text-violet-200 text-xs font-semibold hover:scale-[1.02] transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <BookOpen className="w-4 h-4" />
              <span>Document Library</span>
            </div>
            <span className="px-1.5 py-0.5 text-[9px] bg-white/[0.08] rounded-md font-bold tracking-wide text-violet-300">
              RAG
            </span>
          </button>

          {/* Intelligence Workspace */}
          <button
            onClick={() => { onOpenIntelligenceWorkspace?.(); onCloseMobile(); }}
            className="w-full flex items-center justify-between px-4 py-2.5 rounded-2xl glass-blue text-blue-200 text-xs font-semibold hover:scale-[1.02] transition-all duration-200"
          >
            <div className="flex items-center gap-2.5">
              <Activity className="w-4 h-4" />
              <span>Intelligence Workspace</span>
            </div>
            <span className="px-1.5 py-0.5 text-[9px] bg-white/[0.08] rounded-md font-bold tracking-wide text-blue-300">
              OKF
            </span>
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="mx-4 my-3 h-px bg-slate-700/50" />

        {/* ── Conversations List ── */}
        <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
          <div className="px-2 pb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">
            Recent Chats
          </div>

          {conversations.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-3">
              <div className="w-12 h-12 rounded-2xl glass flex items-center justify-center text-slate-600">
                <MessageSquare className="w-5 h-5" />
              </div>
              <p className="text-xs text-slate-500">No conversations yet.<br />Start a new chat!</p>
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = conv.id === activeConversationId;
              return (
                <div
                  key={conv.id}
                  onClick={() => { onSelectConversation(conv.id); onCloseMobile(); }}
                  className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl text-xs cursor-pointer transition-all duration-200 ${
                    isActive
                      ? 'active-glass text-blue-200 font-medium'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-600'}`} />
                    <span className="truncate">{conv.title || 'Conversation'}</span>
                  </div>
                  <button
                    onClick={(e) => onDeleteConversation(conv.id, e)}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-all ml-1 shrink-0"
                    title="Delete conversation"
                    aria-label="Delete conversation"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer: Knowledge Status Card ── */}
        <div className="p-3 border-t border-slate-700/50">
          <div
            onClick={onOpenKnowledgeModal}
            className="p-3 rounded-2xl glass hover:bg-white/[0.06] cursor-pointer transition-all duration-200 group hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-300">
                <BookOpen className="w-3.5 h-3.5 text-blue-400" />
                <span>Knowledge Base</span>
              </div>
              <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-blue-400 transition-colors" />
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500">
              <span>{health?.indexed_concepts ?? 0} concepts indexed</span>
              <div className="flex items-center gap-1.5">
                <span className="live-dot" style={{ width: 6, height: 6 }} />
                <span className="text-emerald-400 font-medium">Ready</span>
              </div>
            </div>

            {/* Llama model row */}
            <div
              onClick={(e) => { e.stopPropagation(); onOpenModelModal?.(); }}
              className="mt-2.5 pt-2.5 border-t border-slate-700/40 flex items-center justify-between text-[10px] text-slate-500 hover:text-amber-400 cursor-pointer transition-colors"
            >
              <div className="flex items-center gap-1.5 font-semibold">
                <span>🦙</span>
                <span>Llama 3.2</span>
              </div>
              <span className="px-1.5 py-0.5 rounded-lg bg-white/[0.04] font-mono border border-slate-700/50 text-slate-500">
                {health?.provider || 'offline'}
              </span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
