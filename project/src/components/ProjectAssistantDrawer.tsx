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
    <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-md animate-in fade-in duration-200">
      {/* Background click to dismiss */}
      <div className="flex-1" onClick={onClose} />

      {/* Main Drawer Container */}
      <div className="relative flex h-full w-full max-w-lg flex-col border-l border-white/[0.08] bg-[#090b10]/95 backdrop-blur-2xl shadow-2xl animate-in slide-in-from-right duration-300 font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-4 backdrop-blur-md">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-white shadow-inner-light">
              <Bot className="h-4 w-4 text-sky-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white tracking-tight">AI Assistant</h3>
                <span className="flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono font-medium text-emerald-300 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">
                {products.length} projects &bull; {hasGeminiApiKey() ? 'Gemini 2.5 Flash' : 'Smart Engine'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => {
                setApiKeyInput(getGeminiApiKey());
                setShowKeyModal(true);
              }}
              title="Configure Gemini API Key"
              className={`flex h-8 w-8 items-center justify-center rounded-lg border transition-colors ${
                hasGeminiApiKey()
                  ? 'border-emerald-500/30 bg-emerald-950/20 text-emerald-300 hover:bg-emerald-900/40'
                  : 'border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white'
              }`}
            >
              <Key className="h-3.5 w-3.5" />
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
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-white/[0.02] text-zinc-400 hover:text-white transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>

            <button
              onClick={onClose}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-400 hover:bg-white/[0.06] hover:text-white transition-colors ml-0.5"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* API Key Modal Banner / Popover */}
        {showKeyModal && (
          <div className="border-b border-white/[0.08] bg-[#0c0e14]/95 p-4 shadow-xl">
            <div className="flex items-center justify-between pb-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-200">
                <Key className="h-3.5 w-3.5 text-sky-400" />
                <span>Google Gemini API Key</span>
              </div>
              <button
                onClick={() => setShowKeyModal(false)}
                className="text-zinc-500 hover:text-white text-xs"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Powers conversational workspace intelligence and multimodal image extraction with Gemini 2.5 Flash.
            </p>
            <form onSubmit={handleSaveKey} className="mt-3 space-y-2">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full rounded-xl border border-white/[0.08] bg-black/40 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/30 font-mono"
              />
              <div className="flex items-center justify-between pt-1">
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white underline underline-offset-2"
                >
                  <span>Get Free Key at Google AI Studio</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
                <button
                  type="submit"
                  className="rounded-xl bg-white hover:bg-zinc-200 px-3.5 py-1.5 text-xs font-semibold text-black transition-colors flex items-center gap-1"
                >
                  {keySavedMessage ? (
                    <>
                      <Check className="h-3 w-3" />
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
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-sky-400 border border-white/[0.08] mt-0.5">
                  <Bot className="h-3.5 w-3.5" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-white/[0.08] text-white border border-white/[0.1] rounded-br-xs shadow-md'
                    : 'border border-white/[0.06] bg-[#0f121a]/90 text-zinc-200 rounded-bl-xs shadow-lg'
                }`}
              >
                {/* Message Text with simple Markdown rendering */}
                <div className="whitespace-pre-wrap space-y-1.5 break-words">
                  {renderFormattedText(msg.text, (productId) => handleOpenProduct(productId))}
                </div>

                {/* Filter Action Button */}
                {msg.filterAction && (
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => handleFilterClick(msg.filterAction)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] px-3 py-1.5 text-[11px] font-semibold text-zinc-200 transition-all"
                    >
                      <Filter className="h-3 w-3" />
                      <span>{msg.filterAction.label}</span>
                      <ArrowRight className="h-3 w-3 ml-0.5" />
                    </button>
                  </div>
                )}

                {/* Suggested Product Quick Chips */}
                {msg.suggestedProductIds && msg.suggestedProductIds.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-white/[0.06]">
                    <p className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 mb-1.5">
                      Referenced Projects:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {msg.suggestedProductIds.map((id) => {
                        const prod = products.find((p) => p.id === id);
                        if (!prod) return null;
                        return (
                          <button
                            key={id}
                            onClick={() => handleOpenProduct(id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[11px] text-zinc-300 hover:border-white/25 hover:text-white transition-colors"
                          >
                            <span>{prod.name}</span>
                            <span className="text-[9px] font-mono text-sky-400">({prod.tag})</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {msg.role === 'user' && (
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/[0.06] text-zinc-300 border border-white/[0.08] mt-0.5">
                  <User className="h-3.5 w-3.5" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3 justify-start">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl bg-white/[0.04] text-sky-400 border border-white/[0.08]">
                <Bot className="h-3.5 w-3.5" />
              </div>
              <div className="rounded-2xl rounded-bl-xs border border-white/[0.06] bg-[#0f121a]/90 px-4 py-3 text-xs text-zinc-400">
                <div className="flex items-center gap-2">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse" />
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse delay-100" />
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400 animate-pulse delay-200" />
                  <span className="text-zinc-400 font-mono text-[11px] ml-1">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Prompt Starters Chips */}
        <div className="border-t border-white/[0.06] bg-white/[0.01] px-4 py-2.5">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {DEFAULT_PROMPTS.map((p) => (
              <button
                key={p.label}
                onClick={() => handleSend(p.query)}
                className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.03] hover:bg-white/[0.08] hover:border-white/[0.14] px-3 py-1 text-[11px] font-medium text-zinc-300 transition-colors"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input Form */}
        <div className="border-t border-white/[0.06] bg-black/40 p-4">
          <div className="relative flex items-end rounded-2xl border border-white/[0.08] bg-[#0c0e14] px-3.5 py-2.5 focus-within:border-white/25 transition-colors">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Ask about app ideas, working projects, stack recommendations..."
              className="max-h-24 min-h-[1.75rem] flex-1 resize-none bg-transparent text-xs text-white placeholder-zinc-500 outline-none"
            />
            <button
              onClick={() => handleSend()}
              disabled={!input.trim() || loading}
              className="ml-2 flex h-7 w-7 items-center justify-center rounded-xl bg-white text-black transition-colors hover:bg-zinc-200 disabled:opacity-30 shrink-0 font-bold"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-mono text-zinc-500">
            <span>Enter to send &bull; Shift+Enter for newline</span>
            <span>{products.length} Projects Indexed</span>
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
