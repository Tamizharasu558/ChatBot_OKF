import React, { useState, useRef, useEffect } from 'react';
import { ArrowUp, Loader2, Paperclip, FileText, X } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onUploadFiles: (files: File[], question?: string) => void;
  isLoading: boolean;
  isUploading: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onUploadFiles,
  isLoading,
  isUploading,
}) => {
  const [input, setInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [input]);

  const removeStagedFile = (index: number) => {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (isLoading || isUploading) return;

    if (stagedFiles.length > 0) {
      onUploadFiles(stagedFiles, input.trim());
      setStagedFiles([]);
      setInput('');
      if (textareaRef.current) textareaRef.current.style.height = 'auto';
      return;
    }

    if (!input.trim()) return;
    onSendMessage(input.trim());
    setInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setStagedFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const items = e.dataTransfer.items;
    if (items && items.length > 0) {
      const collectedFiles: File[] = [];
      const readEntry = async (entry: any): Promise<void> => {
        if (!entry) return;
        if (entry.isFile) {
          await new Promise<void>((resolve) => {
            entry.file((file: File) => { collectedFiles.push(file); resolve(); }, () => resolve());
          });
        } else if (entry.isDirectory) {
          const dirReader = entry.createReader();
          const entries: any[] = await new Promise((resolve) => {
            dirReader.readEntries((ents: any[]) => resolve(ents || []), () => resolve([]));
          });
          for (const child of entries) await readEntry(child);
        }
      };
      const promises = [];
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        const entry = item.webkitGetAsEntry ? item.webkitGetAsEntry() : null;
        if (entry) promises.push(readEntry(entry));
        else { const file = item.getAsFile(); if (file) collectedFiles.push(file); }
      }
      await Promise.all(promises);
      if (collectedFiles.length > 0) { setStagedFiles((prev) => [...prev, ...collectedFiles]); return; }
    }
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setStagedFiles((prev) => [...prev, ...Array.from(e.dataTransfer.files)]);
    }
  };

  const canSend = (input.trim() || stagedFiles.length > 0) && !isLoading && !isUploading;

  return (
    <div className="max-w-3xl mx-auto w-full px-4 sm:px-6 py-4 space-y-2">

      {/* Uploading status bar */}
      {isUploading && (
        <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl glass-blue text-blue-300 text-xs font-medium animate-glass-appear">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          <span>Extracting & indexing into OKF knowledge base…</span>
        </div>
      )}

      {/* Staged files */}
      {stagedFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {stagedFiles.map((file, idx) => (
            <div
              key={`${file.name}-${idx}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-2xl glass text-xs text-slate-300 animate-glass-appear"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="font-medium truncate max-w-[180px]">{file.name}</span>
              <span className="text-slate-500 text-[10px]">({(file.size / 1024).toFixed(1)} KB)</span>
              <button
                type="button"
                onClick={() => removeStagedFile(idx)}
                className="p-0.5 rounded-full hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-colors"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main input form */}
      <form
        onSubmit={handleSubmit}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`relative flex items-end w-full rounded-3xl glass-input transition-all p-2 ${
          isDragging ? 'border-blue-400/50 bg-blue-500/10 ring-2 ring-blue-400/20' : ''
        }`}
      >
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileSelect}
          multiple
          className="hidden"
        />

        {/* Attach button */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading || isLoading}
          title="Attach files"
          className="w-9 h-9 rounded-2xl text-slate-500 hover:text-slate-200 hover:bg-white/[0.06] flex items-center justify-center shrink-0 transition-all disabled:opacity-30"
        >
          <Paperclip className="w-4 h-4" />
        </button>

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isDragging
              ? 'Drop files or folders here…'
              : stagedFiles.length > 0
              ? 'Ask a question about your file(s) or press Enter to summarize…'
              : 'Ask anything about the OKF knowledge base…'
          }
          rows={1}
          disabled={isLoading || isUploading}
          className="flex-1 max-h-40 min-h-[40px] py-2 px-3 text-sm bg-transparent border-0 outline-none resize-none text-slate-100 placeholder:text-slate-500 disabled:opacity-50"
        />

        {/* Send button */}
        <button
          type="submit"
          disabled={!canSend}
          aria-label="Send"
          className={`w-9 h-9 rounded-2xl flex items-center justify-center shrink-0 ml-1 transition-all ${
            canSend
              ? 'glass-blue text-blue-200 hover:scale-110 shadow-lg'
              : 'glass text-slate-600'
          }`}
        >
          {isLoading || isUploading
            ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
            : <ArrowUp className="w-4 h-4 stroke-[2.5]" />
          }
        </button>
      </form>

      {/* Footer hint */}
      <div className="flex items-center justify-between px-1 text-[10px] text-slate-600">
        <span>Attach .pdf · .docx · .txt · .md · .csv · .json or drop folders</span>
        <span className="font-medium text-slate-600">OKF v0.2 · Grounded</span>
      </div>
    </div>
  );
};
