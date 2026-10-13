import React, { useState } from 'react';
import {
  Sparkles,
  User,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ShieldCheck,
  Cpu,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react';
import { Message } from '../types';

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const renderTrustBadge = (tier: string) => {
    switch (tier) {
      case 'human-reviewed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium glass-teal text-teal-300 border border-teal-500/20">
            <ShieldCheck className="w-3 h-3" />
            Human-Verified
          </span>
        );
      case 'machine-confirmed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium glass-blue text-blue-300 border border-blue-500/20">
            <Cpu className="w-3 h-3" />
            Machine-Confirmed
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium glass text-slate-400 border border-slate-600/30">
            <HelpCircle className="w-3 h-3" />
            Unverified
          </span>
        );
    }
  };

  const formatContent = (content: string) => {
    const lines = content.split('\n');
    const textColor = isUser ? 'text-white' : 'text-slate-200';
    const headingColor = isUser ? 'text-white' : 'text-slate-100';

    return lines.map((line, idx) => {
      if (line.startsWith('### ')) {
        return (
          <h4 key={idx} className={`text-sm font-semibold mt-3 mb-1 ${headingColor}`}>
            {line.replace('### ', '')}
          </h4>
        );
      }
      if (line.startsWith('## ')) {
        return (
          <h3 key={idx} className={`text-base font-bold mt-4 mb-1.5 ${headingColor} gradient-text-blue`}>
            {line.replace('## ', '')}
          </h3>
        );
      }
      if (line.startsWith('# ')) {
        return (
          <h2 key={idx} className={`text-lg font-bold mt-4 mb-2 ${headingColor}`}>
            {line.replace('# ', '')}
          </h2>
        );
      }
      // Horizontal rule
      if (line.trim() === '---') {
        return <div key={idx} className="my-3 border-t border-slate-600/30" />;
      }
      // List items
      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className={`ml-4 list-disc text-sm ${textColor} my-0.5 leading-relaxed`}>
            {line.trim().replace(/^[-*]\s+/, '')}
          </li>
        );
      }
      // Empty line
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return (
        <p key={idx} className={`text-sm ${textColor} leading-relaxed`}>
          {line}
        </p>
      );
    });
  };

  return (
    <div className={`max-w-3xl mx-auto w-full flex ${isUser ? 'justify-end' : 'justify-start'} gap-3 items-end animate-bubble-in`}>

      {/* Assistant avatar — left side */}
      {!isUser && (
        <div className="w-8 h-8 rounded-2xl glass-blue flex items-center justify-center shrink-0 mb-1 shadow-lg">
          <Sparkles className="w-4 h-4 text-blue-400" />
        </div>
      )}

      {/* Message bubble */}
      <div className={`relative max-w-[75%] group ${isUser ? 'items-end' : 'items-start'} flex flex-col`}>

        {/* Sender label */}
        <div className={`flex items-center gap-2 mb-1.5 px-1 ${isUser ? 'justify-end' : 'justify-start'}`}>
          <span className="text-[10px] font-semibold text-slate-500 tracking-wide uppercase">
            {isUser ? 'You' : 'OKF Assistant'}
          </span>
          {!isUser && (
            <button
              onClick={handleCopy}
              className="opacity-0 group-hover:opacity-100 p-1 rounded-lg glass text-slate-500 hover:text-slate-200 transition-all"
              title="Copy"
              aria-label="Copy response"
            >
              {copied ? <Check className="w-3 h-3 text-teal-400" /> : <Copy className="w-3 h-3" />}
            </button>
          )}
        </div>

        {/* Bubble */}
        <div className={`px-4 py-3 rounded-3xl relative overflow-hidden ${
          isUser
            ? 'msg-user rounded-br-md'
            : 'msg-assistant rounded-bl-md'
        }`}>
          {/* Specular highlight on top */}
          <div className="absolute top-0 left-6 right-6 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

          <div className="space-y-0.5 relative z-10">
            {formatContent(message.content)}
          </div>
        </div>

        {/* Sources disclosure */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="mt-2.5 w-full max-w-full">
            <button
              onClick={() => setSourcesOpen(!sourcesOpen)}
              className="flex items-center gap-1.5 text-[11px] font-medium text-slate-500 hover:text-slate-300 transition-colors px-1"
            >
              <span>Sources & Grounding ({message.sources.length})</span>
              {sourcesOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>

            {sourcesOpen && (
              <div className="mt-2 grid gap-2 sm:grid-cols-2 animate-glass-appear">
                {message.sources.map((src, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-2xl glass hover:bg-white/[0.06] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-1 mb-2">
                        <span className="text-xs font-semibold text-slate-200 truncate">
                          {src.document_title}
                        </span>
                        {renderTrustBadge(src.trust_tier)}
                      </div>

                      <div className="text-[10px] text-slate-500 font-mono truncate mb-1.5">
                        {src.concept_id} · {src.section_heading}
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-3 leading-snug italic">
                        "{src.passage_snippet}"
                      </p>
                    </div>

                    {src.resource_url && src.resource_url.startsWith('http') && (
                      <div className="mt-2.5 pt-2 border-t border-slate-700/30">
                        <a
                          href={src.resource_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-400 hover:text-blue-300 hover:underline transition-colors"
                        >
                          <span>Canonical Source</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* User avatar — right side */}
      {isUser && (
        <div className="w-8 h-8 rounded-2xl glass-heavy flex items-center justify-center shrink-0 mb-1 text-slate-300 shadow-lg">
          <User className="w-4 h-4" />
        </div>
      )}
    </div>
  );
};
