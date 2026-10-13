import React, { useState, useEffect } from 'react';
import {
  X,
  HardDrive,
  Key,
  Globe,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Zap,
  ShieldCheck,
} from 'lucide-react';
import { ModelStatus } from '../types';
import { fetchModelStatus, switchModel } from '../services/api';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onModelSwitched?: () => void;
}

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({
  isOpen,
  onClose,
  onModelSwitched,
}) => {
  const [status, setStatus] = useState<ModelStatus | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<'mock' | 'groq' | 'ollama'>('mock');
  const [selectedModel, setSelectedModel] = useState<string>('llama-3.2-3b-preview');
  const [groqApiKey, setGroqApiKey] = useState<string>('');
  const [ollamaBaseUrl, setOllamaBaseUrl] = useState<string>('http://localhost:11434');
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    setIsLoading(true);
    setMessage(null);
    try {
      const data = await fetchModelStatus();
      setStatus(data);
      setSelectedProvider(data.provider);
      setSelectedModel(data.model_id);
      if (data.ollama_base_url) {
        setOllamaBaseUrl(data.ollama_base_url);
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to fetch model status' });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleApply = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await switchModel({
        provider: selectedProvider,
        model: selectedModel,
        groq_api_key: groqApiKey ? groqApiKey.trim() : undefined,
        ollama_base_url: ollamaBaseUrl ? ollamaBaseUrl.trim() : undefined,
      });

      setStatus(res.status);
      setMessage({
        type: 'success',
        text: `Active model successfully switched to ${res.status.display_name}!`,
      });
      onModelSwitched?.();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to switch model provider' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xl p-4 animate-glass-appear">
      <div className="w-full max-w-2xl glass-heavy rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-5 border-b border-white/[0.08] flex items-center justify-between bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-2xl glass-amber flex items-center justify-center text-lg shadow-lg">
              🦙
              <div className="absolute top-0 left-2 right-2 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Llama 3.2 Chatbot Model
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold glass-blue text-blue-200">
                  RAG Core
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure your active Meta Llama 3.2 generation engine & RAG inference provider
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl glass text-slate-400 hover:text-slate-100 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5">
          {/* Active Model Status */}
          {status && (
            <div className="p-4 rounded-2xl glass-blue flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="live-dot" />
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-blue-300">
                    Active Engine
                  </span>
                  <div className="text-sm font-bold text-slate-100">
                    {status.display_name}
                  </div>
                </div>
              </div>
              <span className="text-[11px] px-2.5 py-1 rounded-xl glass font-mono text-slate-400">
                {status.model_id}
              </span>
            </div>
          )}

          {/* Feedback Toast */}
          {message && (
            <div
              className={`p-3.5 rounded-2xl flex items-center gap-2.5 text-xs font-medium ${
                message.type === 'success'
                  ? 'glass-teal text-teal-200'
                  : 'border border-red-400/25 glass text-red-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-teal-300 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Provider Selection Cards */}
          <div>
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">
              Select Llama 3.2 Provider
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Offline Engine */}
              <button
                type="button"
                onClick={() => { setSelectedProvider('mock'); setSelectedModel('llama-3.2-offline'); }}
                className={`p-4 rounded-2xl text-left transition-all relative overflow-hidden ${
                  selectedProvider === 'mock'
                    ? 'glass-violet ring-2 ring-violet-400/30 scale-[1.02]'
                    : 'glass hover:bg-white/[0.12] hover:scale-[1.01]'
                }`}
              >
                <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-xl glass flex items-center justify-center text-violet-300">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full glass-teal text-teal-200">Zero Setup</span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 mb-1">Offline Engine</h4>
                <p className="text-[10px] text-slate-400 leading-snug">Deterministic Llama 3.2. 100% grounded, no keys needed.</p>
              </button>

              {/* Groq Cloud */}
              <button
                type="button"
                onClick={() => { setSelectedProvider('groq'); setSelectedModel('llama-3.2-3b-preview'); }}
                className={`p-4 rounded-2xl text-left transition-all relative overflow-hidden ${
                  selectedProvider === 'groq'
                    ? 'glass-amber ring-2 ring-amber-400/30 scale-[1.02]'
                    : 'glass hover:bg-white/[0.12] hover:scale-[1.01]'
                }`}
              >
                <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-xl glass flex items-center justify-center text-amber-300">
                    <Zap className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full glass-amber text-amber-200">~550 tok/s</span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 mb-1">Groq Cloud</h4>
                <p className="text-[10px] text-slate-400 leading-snug">Ultra-fast real-time Llama 3.2 inference via Groq LPUs.</p>
              </button>

              {/* Ollama Local */}
              <button
                type="button"
                onClick={() => { setSelectedProvider('ollama'); setSelectedModel('llama3.2'); }}
                className={`p-4 rounded-2xl text-left transition-all relative overflow-hidden ${
                  selectedProvider === 'ollama'
                    ? 'glass-blue ring-2 ring-blue-400/30 scale-[1.02]'
                    : 'glass hover:bg-white/[0.12] hover:scale-[1.01]'
                }`}
              >
                <div className="absolute top-0 left-3 right-3 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-8 h-8 rounded-xl glass flex items-center justify-center text-blue-300">
                    <HardDrive className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full glass-blue text-blue-200">On-Device</span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 mb-1">Ollama Local</h4>
                <p className="text-[10px] text-slate-400 leading-snug">Private on-device inference via local Ollama daemon.</p>
              </button>
            </div>
          </div>

          {/* Model Specific Configurations */}
          {selectedProvider === 'groq' && (
            <div className="p-4 rounded-2xl glass space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">
                  Llama 3.2 Model Variant
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium text-slate-200 focus:outline-none bg-transparent border-0"
                >
                  <option value="llama-3.2-3b-preview">Llama 3.2 3B Instruct (Recommended - High Speed)</option>
                  <option value="llama-3.2-1b-preview">Llama 3.2 1B Instruct (Ultra Lightweight)</option>
                  <option value="llama-3.2-11b-vision-preview">Llama 3.2 11B Vision Instruct</option>
                  <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile (Maximum Depth)</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-semibold text-slate-400">Groq API Key</label>
                  {status?.groq_api_key_configured && (
                    <span className="text-[10px] text-teal-400 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Key Saved
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    type="password"
                    value={groqApiKey}
                    onChange={(e) => setGroqApiKey(e.target.value)}
                    placeholder={status?.groq_api_key_configured ? '••••••••••••••••••••' : 'gsk_...'}
                    className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-slate-200 font-mono focus:outline-none bg-transparent"
                  />
                  <Key className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Keys are saved in runtime memory only — never logged or persisted.
                </p>
              </div>
            </div>
          )}

          {selectedProvider === 'ollama' && (
            <div className="p-4 rounded-2xl glass space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ollama Model Tag</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl glass-input text-xs font-medium text-white/80 focus:outline-none bg-transparent border-0"
                >
                  <option value="llama3.2">llama3.2 (3B Default)</option>
                  <option value="llama3.2:1b">llama3.2:1b (1B Parameter)</option>
                  <option value="llama3.2:3b">llama3.2:3b (3B Parameter)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-1.5">Ollama Daemon URL</label>
                <div className="relative">
                  <input
                    type="text"
                    value={ollamaBaseUrl}
                    onChange={(e) => setOllamaBaseUrl(e.target.value)}
                    placeholder="http://localhost:11434"
                    className="w-full pl-9 pr-3 py-2 rounded-xl glass-input text-xs text-white/80 font-mono focus:outline-none bg-transparent"
                  />
                  <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Ensure Ollama is running with <code className="font-mono text-slate-300">ollama run llama3.2</code>.
                </p>
              </div>
            </div>
          )}

          {selectedProvider === 'mock' && (
            <div className="p-4 rounded-2xl glass-violet text-xs text-violet-200">
              <div className="flex items-center gap-2 font-bold mb-2">
                <Sparkles className="w-4 h-4 text-violet-300" />
                <span>Zero-Latency Offline Llama 3.2 Engine</span>
              </div>
              <p className="text-[11px] leading-relaxed text-violet-300/80">
                Runs entirely locally — no internet, no GPU required. Synthesizes multi-passage answers with Llama 3.2 prompt formatting and strict OKF evidence citations.
              </p>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-700/50 bg-slate-800/30 flex items-center justify-between">
          <button
            type="button"
            onClick={loadStatus}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Reload Status</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-2xl glass text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all hover:scale-[1.02]"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleApply}
              disabled={isSaving}
              className="px-5 py-2 rounded-2xl glass-blue text-slate-100 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40 hover:scale-[1.03]"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Switching…</span>
                </>
              ) : (
                <span>Apply & Activate</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
