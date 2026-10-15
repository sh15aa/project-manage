import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User,
  Key,
  Filter,
  ArrowRight,
  ExternalLink,
  ChevronDown,
  Layers,
  RotateCcw,
  Check,
  AlertCircle,
  Zap,
} from 'lucide-react';
import type { ProductWithTasks } from '@/lib/turso';
import {
  type ChatMessage,
  askProjectAssistant,
  getGeminiApiKey,
  saveGeminiApiKey,
  hasGeminiApiKey,
} from '@/lib/gemini';

interface ProjectAssistantDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductWithTasks[];
  onApplyFilter: (filters: { tags?: string[]; statuses?: string[]; search?: string }) => void;
  onSelectProduct: (product: ProductWithTasks) => void;
}

const DEFAULT_PROMPTS = [
  { label: '📱 Give me app ideas', query: 'give me app ideas' },
  { label: '⚡ Ideas in progress', query: 'give me ideas that are in progress' },
  { label: '🛠️ Developer tools', query: 'show developer tools' },
  { label: '💼 SaaS opportunities', query: 'show saas ideas' },
  { label: '📊 Workspace stats', query: 'show workspace stats and progress' },
  { label: '🎯 What should I build next?', query: 'what should I build next?' },
];

export const ProjectAssistantDrawer: React.FC<ProjectAssistantDrawerProps> = ({
  isOpen,
  onClose,
  products,
  onApplyFilter,
  onSelectProduct,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    {
      id: 'welcome',
      role: 'assistant',
      text: `👋 **Welcome to your Product Hub AI Assistant!**\n\nI have complete, real-time knowledge of all **${products.length} projects** in your workspace.\n\nYou can ask me things like:\n• *"Give me app ideas"*\n• *"Give me ideas that are in progress"*\n• *"What are my top SaaS platforms?"*\n• *"What should I build this week?"*\n\nTap any starter prompt below to begin!`,
      timestamp: Date.now(),
    },
  ]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showKeyModal, setShowKeyModal] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [keySavedMessage, setKeySavedMessage] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Focus input on open
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  async function handleSend(queryText?: string) {
    const textToSend = (queryText || input).trim();
    if (!textToSend || loading) return;

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      text: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!queryText) setInput('');
    setLoading(true);

    try {
      const response = await askProjectAssistant({
        question: textToSend,
        products,
        history: [...messages, userMessage],
      });

      const assistantMessage: ChatMessage = {
        id: `assistant-${Date.now()}`,
        role: 'assistant',
        text: response.text,
        timestamp: Date.now(),
        filterAction: response.filterAction,
        suggestedProductIds: response.suggestedProductIds,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          id: `assistant-err-${Date.now()}`,
          role: 'assistant',
          text: `⚠️ Error fetching response: ${err?.message || 'Something went wrong.'} Try asking another question!`,
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  function handleFilterClick(filterAction: ChatMessage['filterAction']) {
    if (!filterAction) return;
    onApplyFilter({
      tags: filterAction.tags,
      statuses: filterAction.statuses,
      search: filterAction.search,
    });
    // On mobile, close drawer so user sees filtered dashboard
    if (window.innerWidth < 768) {
      onClose();
    }
  }

  function handleOpenProduct(productId: string) {
    const found = products.find((p) => p.id === productId);
    if (found) {
      onSelectProduct(found);
    }
  }

  function handleSaveKey(e: React.FormEvent) {
    e.preventDefault();
    saveGeminiApiKey(apiKeyInput.trim());
    setKeySavedMessage(true);
    setTimeout(() => {
      setKeySavedMessage(false);
      setShowKeyModal(false);
    }, 1200);
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Background click to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Main Drawer Container */}
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-slate-800 bg-slate-950 shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 bg-slate-900/80 px-4 py-3.5 backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 shadow-lg shadow-cyan-500/25">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white tracking-tight">Product Hub AI</h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 border border-emerald-500/30">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {products.length} projects indexed &bull; {hasGeminiApiKey() ? 'Gemini 1.5 Flash' : 'Smart Local Engine'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                setApiKeyInput(getGeminiApiKey());
                setShowKeyModal(true);
              }}
              title="Configure Gemini API Key"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                hasGeminiApiKey()
                  ? 'border-emerald-500/40 bg-emerald-950/40 text-emerald-300 hover:bg-emerald-900/60'
                  : 'border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white'
              }`}
            >
              <Key className="h-4 w-4" />
            </button>

            <button
              onClick={() => {
                setMessages([
                  {
                    id: 'welcome-reset',
                    role: 'assistant',
                    text: `Chat reset! How can I help you explore your **${products.length} projects**?`,
                    timestamp: Date.now(),
                  },
                ]);
              }}
              title="Reset conversation"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 text-slate-400 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white transition-colors ml-1"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* API Key Modal Banner / Popover */}
        {showKeyModal && (
          <div className="border-b border-cyan-500/30 bg-slate-900/95 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-cyan-400">
                <Key className="h-3.5 w-3.5" />
                <span>Google Gemini API Key</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-slate-400 hover:text-white text-xs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Power deep AI reasoning, conversational queries, and multimodal image extraction. Completely free with Google AI Studio.
            </p>
            <form onSubmit={handleSaveKey} className="mt-3 space-y-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 text-xs text-white placeholder-slate-500 outline-none focus:border-cyan-500 font-mono"
              />
              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-cyan-400 hover:underline"
                >
                  <span>Get Free Key at Google AI Studio</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="submit"
                  className="rounded-lg bg-cyan-600 hover:bg-cyan-500 px-3 py-1 text-xs font-semibold text-white transition-colors flex items-center gap-1"
                >
                  {keySavedMessage ? (
                    <>
                      <Check className="h-3 w-3 text-white" />
                      <span>Saved!</span>
                    </>
                  ) : (
                    <span>Save Key</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Messages List Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 mt-0.5">
                  <Bot className="h-4 w-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-xs shadow-md'
                    : 'border border-slate-800 bg-slate-900/90 text-slate-200 rounded-bl-xs shadow-md'
                }`}
              >
                {/* Message Text with simple Markdown rendering */}
                <div className="whitespace-pre-wrap space-y-1.5 break-words">
                  {renderFormattedText(msg.text, (productId) => handleOpenProduct(productId))}
                </div>

                {/* Filter Action Button */}
                {msg.filterAction && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleFilterClick(msg.filterAction)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 px-2.5 py-1 text-[11px] font-semibold text-cyan-300 transition-all hover:scale-[1.02]"
                    >
                      <Filter className="h-3 w-3" />
                      <span>{msg.filterAction.label}</span>
                      <ArrowRight className="h-3 w-3 ml-0.5" />
                    </button>
                  </div>
                )}

                {/* Suggested Product Quick Chips */}
                {msg.suggestedProductIds && msg.suggestedProductIds.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-800/80">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-slate-400 mb-1.5">
                      Quick View:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedProductIds.map((id) => {
                        const prod = products.find((p) => p.id === id);
                        if (!prod) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => handleOpenProduct(id)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-700/80 bg-slate-800/80 px-2 py-0.5 text-[11px] text-slate-300 hover:border-cyan-500/40 hover:text-white transition-colors"
                          >
                            <span>{prod.name}</span>
                            <span className="text-[9px] text-cyan-400">({prod.tag})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-slate-800 text-slate-300 border border-slate-700 mt-0.5">
                  <User className="h-4 w-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                <Bot className="h-4 w-4" />
              </div>
              <div className="rounded-2xl rounded-bl-xs border border-slate-800 bg-slate-900/90 px-4 py-3 text-xs text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse delay-100" />
                  <span className="h-2 w-2 rounded-full bg-cyan-400 animate-pulse delay-200" />
                  <span className="text-slate-400 font-mono text-[11px] ml-1">Analyzing workspace...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Starters Chips */}
        <div className="border-t border-slate-800/80 bg-slate-900/40 px-3 py-2">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {DEFAULT_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => handleSend(p.query)}
                className="shrink-0 rounded-full border border-slate-800 bg-slate-900/90 hover:bg-slate-800/90 hover:border-slate-700 px-2.5 py-1 text-[11px] font-medium text-slate-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="border-t border-slate-800 bg-slate-900/90 p-3">
          <div className="relative flex items-end rounded-xl border border-slate-700/80 bg-slate-950 px-3 py-2 focus-within:border-cyan-500 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask anything (e.g. 'give me app ideas', 'what's in progress?')..."
              className="max-h-24 min-h-[1.75rem] flex-1 resize-none bg-transparent text-xs text-white placeholder-slate-500 outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="ml-2 flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-600 text-white transition-colors hover:bg-cyan-500 disabled:opacity-40 shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-500">
            <span>Press Enter to send &bull; Shift+Enter for new line</span>
            <span>{products.length} Projects Loaded</span>
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Lightweight helper to format text, replace `#view-id` links with clickable buttons.
 */
function renderFormattedText(text: string, onOpenProduct: (id: string) => void) {
  // Look for markdown links like [Product Name](#view-xxx)
  const regex = /\[([^\]]+)\]\(#view-([^)]+)\)/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const name = match[1];
    const id = match[2];
    parts.push(
      <button
        key={`link-${id}-${match.index}`}
        onClick={(e) => {
          e.preventDefault();
          onOpenProduct(id);
        }}
        className="inline-flex items-center gap-0.5 font-bold text-cyan-300 hover:text-cyan-200 underline underline-offset-2 decoration-cyan-500/50 hover:decoration-cyan-400 transition-colors"
      >
        <span>{name}</span>
        <ExternalLink className="h-2.5 w-2.5 inline" />
      </button>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts;
}
