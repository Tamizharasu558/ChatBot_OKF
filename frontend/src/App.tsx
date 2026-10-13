import React, { useState, useEffect, useRef } from 'react';
import {
  Menu,
  Moon,
  Sun,
  RotateCcw,
  AlertCircle,
  Database,
  BookOpen,
  Activity,
} from 'lucide-react';
import { Sidebar } from './components/Sidebar';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { WelcomeHero } from './components/WelcomeHero';
import { KnowledgeModal } from './components/KnowledgeModal';
import { IntelligenceWorkspace } from './components/IntelligenceWorkspace';
import { DocumentLibrary } from './components/DocumentLibrary';
import { ModelSettingsModal } from './components/ModelSettingsModal';
import { Message, ConversationSummary, HealthStatus } from './types';
import {
  fetchHealth,
  fetchConversations,
  fetchConversationMessages,
  deleteConversation,
  sendChatMessage,
  uploadDocument,
} from './services/api';

export const App: React.FC = () => {
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [isKnowledgeModalOpen, setIsKnowledgeModalOpen] = useState(false);
  const [isIntelligenceWorkspaceOpen, setIsIntelligenceWorkspaceOpen] = useState(false);
  const [isDocumentLibraryOpen, setIsDocumentLibraryOpen] = useState(false);
  const [isModelModalOpen, setIsModelModalOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [errorToast, setErrorToast] = useState<string | null>(null);
  const [isDarkMode, setIsDarkMode] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Default to dark for iOS 26 glass look
    document.documentElement.classList.add('dark');
    setIsDarkMode(true);

    loadHealth();
    loadConversations();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    if (next) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const loadHealth = async () => {
    try {
      const h = await fetchHealth();
      setHealth(h);
    } catch (e) {
      console.error('Error fetching health status', e);
    }
  };

  const loadConversations = async () => {
    try {
      const convs = await fetchConversations();
      setConversations(convs);
    } catch (e) {
      console.error('Error loading conversations', e);
    }
  };

  const handleSelectConversation = async (id: string) => {
    setActiveConversationId(id);
    setIsIntelligenceWorkspaceOpen(false);
    setIsDocumentLibraryOpen(false);
    setIsLoading(true);
    setErrorToast(null);
    try {
      const msgs = await fetchConversationMessages(id);
      setMessages(msgs);
    } catch (e: any) {
      setErrorToast(e.message || 'Failed to load conversation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setActiveConversationId(null);
    setIsIntelligenceWorkspaceOpen(false);
    setIsDocumentLibraryOpen(false);
    setMessages([]);
    setErrorToast(null);
  };

  const handleChatWithDocument = (_conceptId: string, docTitle: string, suggestedQuestion?: string) => {
    setIsDocumentLibraryOpen(false);
    setIsIntelligenceWorkspaceOpen(false);
    const prompt = suggestedQuestion || `Please explain the key requirements and details of ${docTitle}.`;
    handleSendMessage(prompt);
  };

  const handleDeleteConversation = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeConversationId === id) {
        handleNewChat();
      }
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to delete conversation');
    }
  };

  const handleSendMessage = async (text: string) => {
    setErrorToast(null);
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const res = await sendChatMessage(text, activeConversationId);
      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
      if (!activeConversationId) {
        setActiveConversationId(res.conversation_id);
      }
      await loadConversations();
    } catch (err: any) {
      setErrorToast(err.message || 'Failed to retrieve answer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadFiles = async (files: File[], promptText?: string) => {
    setErrorToast(null);
    setIsUploading(true);

    for (const file of files) {
      const userMessageContent = promptText
        ? `📎 Attached: **${file.name}**\n\n${promptText}`
        : `📎 Attached: **${file.name}**`;

      const userMessage: Message = {
        id: `user-${Date.now()}-${Math.random()}`,
        role: 'user',
        content: userMessageContent,
        created_at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMessage]);

      try {
        const res = await uploadDocument(file, activeConversationId, promptText);
        const assistantMessage: Message = {
          id: `assistant-${Date.now()}-${Math.random()}`,
          role: 'assistant',
          content: res.explanation,
          sources: res.sources,
          created_at: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
        if (!activeConversationId) {
          setActiveConversationId(res.conversation_id);
        }
      } catch (err: any) {
        setErrorToast(err.message || `Failed to process ${file.name}`);
      }
    }

    await loadConversations();
    await loadHealth();
    setIsUploading(false);
  };

  const handleRetryLastMessage = () => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === 'user');
    if (lastUserMsg) {
      handleSendMessage(lastUserMsg.content);
    }
  };

  const pageTitle = isDocumentLibraryOpen
    ? 'Document Library'
    : isIntelligenceWorkspaceOpen
    ? 'Intelligence Workspace'
    : activeConversationId
    ? conversations.find((c) => c.id === activeConversationId)?.title || 'Conversation'
    : 'New Conversation';

  return (
    <div className="flex h-screen overflow-hidden font-sans relative">
      {/* ── iOS 26 Animated Background ── */}
      <div className="ios26-bg" />

      {/* ── All content above background ── */}
      <div className="relative z-10 flex w-full h-full">

        {/* ── Sidebar ── */}
        <Sidebar
          conversations={conversations}
          activeConversationId={activeConversationId}
          onSelectConversation={handleSelectConversation}
          onNewChat={handleNewChat}
          onDeleteConversation={handleDeleteConversation}
          onOpenKnowledgeModal={() => setIsKnowledgeModalOpen(true)}
          onOpenIntelligenceWorkspace={() => {
            setIsIntelligenceWorkspaceOpen(true);
            setIsDocumentLibraryOpen(false);
          }}
          onOpenDocumentLibrary={() => {
            setIsDocumentLibraryOpen(true);
            setIsIntelligenceWorkspaceOpen(false);
          }}
          onOpenModelModal={() => setIsModelModalOpen(true)}
          health={health}
          isOpenMobile={isMobileSidebarOpen}
          onCloseMobile={() => setIsMobileSidebarOpen(false)}
        />

        {/* ── Main Area ── */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">

          {/* ── Top Navigation Bar ── */}
          <header className="h-14 px-4 sm:px-5 flex items-center justify-between border-b border-slate-700/50 backdrop-blur-2xl bg-slate-900/60 z-10 flex-shrink-0">
            {/* Left: hamburger + title */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsMobileSidebarOpen(true)}
                className="md:hidden p-2 rounded-xl glass text-slate-400 hover:text-slate-100 transition-all"
                aria-label="Open sidebar"
              >
                <Menu className="w-4 h-4" />
              </button>
              <span className="text-sm font-semibold text-slate-200 tracking-tight truncate max-w-[180px] sm:max-w-xs">
                {pageTitle}
              </span>
            </div>

            {/* Right: action buttons */}
            <div className="flex items-center gap-2">
              {/* Llama 3.2 model pill */}
              <button
                onClick={() => setIsModelModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-2xl glass-amber text-amber-300 text-xs font-semibold hover:scale-[1.03] transition-all duration-200"
                title="Configure Llama 3.2 Model"
              >
                <span className="text-sm">🦙</span>
                <span className="hidden sm:inline font-bold">Llama 3.2</span>
                <span className="live-dot scale-75" />
              </button>

              {/* Document Library */}
              <button
                onClick={() => {
                  setIsDocumentLibraryOpen(!isDocumentLibraryOpen);
                  if (!isDocumentLibraryOpen) setIsIntelligenceWorkspaceOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all duration-200 ${
                  isDocumentLibraryOpen
                    ? 'glass-violet text-violet-300 scale-[1.03]'
                    : 'glass text-slate-400 hover:text-slate-200 hover:scale-[1.02]'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Library</span>
              </button>

              {/* Intelligence Workspace */}
              <button
                onClick={() => {
                  setIsIntelligenceWorkspaceOpen(!isIntelligenceWorkspaceOpen);
                  if (!isIntelligenceWorkspaceOpen) setIsDocumentLibraryOpen(false);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-2xl text-xs font-medium transition-all duration-200 ${
                  isIntelligenceWorkspaceOpen
                    ? 'glass-blue text-blue-300 scale-[1.03]'
                    : 'glass text-slate-400 hover:text-slate-200 hover:scale-[1.02]'
                }`}
              >
                <Activity className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Intelligence</span>
              </button>

              {/* Knowledge Base */}
              <button
                onClick={() => setIsKnowledgeModalOpen(true)}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-2xl glass text-slate-400 hover:text-slate-200 hover:scale-[1.02] text-xs font-medium transition-all duration-200"
              >
                <Database className="w-3.5 h-3.5 text-blue-400" />
                <span>Knowledge</span>
              </button>

              {/* Dark/Light Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-xl glass text-slate-400 hover:text-slate-100 transition-all duration-200 hover:scale-105"
                aria-label="Toggle theme"
              >
                {isDarkMode
                  ? <Sun className="w-4 h-4 text-amber-300" />
                  : <Moon className="w-4 h-4" />}
              </button>
            </div>
          </header>

          {/* ── Error Toast ── */}
          {errorToast && (
            <div className="mx-4 mt-3 flex-shrink-0 animate-glass-appear">
              <div className="p-3 rounded-2xl glass border border-red-500/25 flex items-center justify-between text-xs text-red-300">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{errorToast}</span>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button
                    onClick={handleRetryLastMessage}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-lg glass-pill text-xs font-medium text-slate-200 hover:text-white"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Retry</span>
                  </button>
                  <button onClick={() => setErrorToast(null)} className="p-1 text-slate-500 hover:text-slate-200 transition-colors font-bold">
                    ×
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Content: Library / Intelligence / Chat ── */}
          {isDocumentLibraryOpen ? (
            <DocumentLibrary
              onClose={() => setIsDocumentLibraryOpen(false)}
              onChatWithDocument={handleChatWithDocument}
            />
          ) : isIntelligenceWorkspaceOpen ? (
            <IntelligenceWorkspace
              onClose={() => setIsIntelligenceWorkspaceOpen(false)}
              onRefreshHealth={loadHealth}
            />
          ) : (
            <>
              {/* ── Conversation Stream ── */}
              <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 space-y-3">
                {messages.length === 0 ? (
                  <WelcomeHero onSelectPrompt={handleSendMessage} />
                ) : (
                  <div className="max-w-3xl mx-auto w-full space-y-3 stagger-children">
                    {messages.map((m) => (
                      <ChatMessage key={m.id} message={m} />
                    ))}

                    {/* Typing indicator */}
                    {isLoading && (
                      <div className="flex items-start gap-3 animate-bubble-in">
                        <div className="w-8 h-8 rounded-2xl glass-blue flex items-center justify-center shrink-0 text-blue-300">
                          <Database className="w-4 h-4" />
                        </div>
                        <div className="msg-assistant rounded-2xl rounded-tl-md px-4 py-3 flex items-center gap-1.5">
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                          <span className="typing-dot" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* ── Chat Input ── */}
              <div className="flex-shrink-0 border-t border-slate-700/50 bg-slate-900/40 backdrop-blur-xl pb-safe">
                <ChatInput
                  onSendMessage={handleSendMessage}
                  onUploadFiles={handleUploadFiles}
                  isLoading={isLoading}
                  isUploading={isUploading}
                />
              </div>
            </>
          )}
        </main>
      </div>

      {/* ── Modals ── */}
      <KnowledgeModal
        isOpen={isKnowledgeModalOpen}
        onClose={() => setIsKnowledgeModalOpen(false)}
        onIndexedRefresh={loadHealth}
      />
      <ModelSettingsModal
        isOpen={isModelModalOpen}
        onClose={() => setIsModelModalOpen(false)}
        onModelSwitched={loadHealth}
      />
    </div>
  );
};

export default App;
