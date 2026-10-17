import React, { useState } from 'react';
import {
  X,
  ExternalLink,
  Copy,
  Check,
  Compass,
  Bot,
  Cpu,
  Smartphone,
  Library,
  Globe,
  Search,
  Swords,
} from 'lucide-react';

export interface EcosystemLink {
  id: string;
  name: string;
  category: string;
  url: string;
  badge: string;
  badgeClass: string;
  iconBg: string;
  iconColor: string;
  description: string;
  highlights: string[];
  icon: React.ComponentType<{ className?: string }>;
}

export const ECOSYSTEM_LINKS: EcosystemLink[] = [
  {
    id: 'finder',
    name: 'Finder — Startup & App Ideas',
    category: 'Idea Discovery & Validation',
    url: 'https://finder-d17.pages.dev/',
    badge: 'LIVE IDEAS',
    badgeClass: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
    iconBg: 'bg-emerald-500/10 border-emerald-500/20',
    iconColor: 'text-emerald-400',
    description: 'Discover market-validated startup opportunities from Reddit, TrustMRR, Product Hunt & App Store, then push them directly into your launch pipeline.',
    highlights: ['Idea Research', 'Market Validation', '1-Click Import'],
    icon: Compass,
  },
  {
    id: 'bots',
    name: 'Enterprise Bot Product Factory',
    category: 'Automation & Bot Runtimes',
    url: 'https://botserusable.pages.dev/',
    badge: 'BOT FACTORY',
    badgeClass: 'bg-sky-500/10 text-sky-300 border-sky-500/20',
    iconBg: 'bg-sky-500/10 border-sky-500/20',
    iconColor: 'text-sky-400',
    description: 'Enterprise bot architecture & reusable code library for chat bots, automation workflows, multi-channel listeners, and background workers.',
    highlights: ['Bot Workflows', 'Chat Runtimes', 'Webhook Listeners'],
    icon: Bot,
  },
  {
    id: 'agents',
    name: 'AI Agent Product Factory',
    category: 'Autonomous AI Agents',
    url: 'https://agentsreusable.pages.dev/',
    badge: 'AI AGENTS',
    badgeClass: 'bg-purple-500/10 text-purple-300 border-purple-500/20',
    iconBg: 'bg-purple-500/10 border-purple-500/20',
    iconColor: 'text-purple-400',
    description: 'Production-ready AI agent architectures, memory persistence, autonomous coding agent hubs, and multi-agent coordination systems.',
    highlights: ['Multi-Agent Runtime', 'Memory Persistence', 'Tool Calling'],
    icon: Cpu,
  },
  {
    id: 'app-reusable',
    name: 'Mobile Product Factory',
    category: 'Mobile Applications',
    url: 'https://appreusable.pages.dev/',
    badge: '163 MOBILE MODULES',
    badgeClass: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
    iconBg: 'bg-amber-500/10 border-amber-500/20',
    iconColor: 'text-amber-400',
    description: '163 production-grade mobile app components, offline-first sync engines, native device capabilities, and responsive UI foundations.',
    highlights: ['163 Mobile Modules', 'Offline-First Sync', 'Production Ready'],
    icon: Smartphone,
  },
  {
    id: 'reusable-library',
    name: 'Reusable Code Library & Agent Hub',
    category: 'Backend & Infrastructure Modules',
    url: 'https://reusable-library.foundershivanand.workers.dev/',
    badge: '33 CORE MODULES',
    badgeClass: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20',
    iconBg: 'bg-indigo-500/10 border-indigo-500/20',
    iconColor: 'text-indigo-400',
    description: '33 battle-tested enterprise modules: Session Auth & RBAC, Stripe/LemonSqueezy Billing, Cloudflare R2 Storage, Rate Limiting, Audit Trails & Edge DB.',
    highlights: ['33 Enterprise Modules', 'Auth & Payments', 'Cloudflare Edge Ready'],
    icon: Library,
  },
  {
    id: 'mentor-api',
    name: 'AI Mentor Operating System',
    category: 'Adversarial Founder Mentorship & OS',
    url: 'https://mentor-api.foundershivanand.workers.dev/',
    badge: 'MENTOR OS',
    badgeClass: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
    iconBg: 'bg-rose-500/10 border-rose-500/20',
    iconColor: 'text-rose-400',
    description: 'Adversarial Socratic mentor for founders: zero empty praise, extreme accountability, bottleneck analysis, training debt tracking & flaw remediation.',
    highlights: ['Adversarial Socratic', 'Excuse Audit', 'Bottleneck Remediation'],
    icon: Swords,
  },
];

interface AllLinksModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AllLinksModal: React.FC<AllLinksModalProps> = ({ isOpen, onClose }) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  if (!isOpen) return null;

  const handleCopy = async (e: React.MouseEvent, id: string, url: string) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(url);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.warn('Failed to copy link:', err);
    }
  };

  const filteredLinks = ECOSYSTEM_LINKS.filter((item) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.name.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      item.highlights.some((h) => h.toLowerCase().includes(q))
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative z-10 flex h-full max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl sm:rounded-3xl border border-white/[0.08] bg-[#0c0e14] shadow-2xl overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.06] bg-white/[0.02] px-5 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-sky-500/30 bg-sky-500/10 text-sky-400 shadow-inner">
              <Globe className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  All Links & Ecosystem Hubs
                </h2>
                <span className="rounded-full bg-white/[0.06] border border-white/[0.08] px-2 py-0.5 text-[11px] font-mono text-zinc-300">
                  {ECOSYSTEM_LINKS.length} Hubs
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Instant access to all {ECOSYSTEM_LINKS.length} companion tools, idea engines & reusable factories
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-zinc-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Close (Esc)"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search Filter */}
        <div className="border-b border-white/[0.06] bg-white/[0.01] px-5 py-2.5 sm:px-6">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search links by name, category, or module (e.g. bots, mobile, auth)..."
              className="w-full rounded-xl border border-white/[0.06] bg-white/[0.02] py-1.5 pl-8 pr-3 text-xs text-white placeholder-zinc-500 outline-none focus:border-white/20 transition-colors"
            />
          </div>
        </div>

        {/* Links List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3">
          {filteredLinks.map((item) => {
            const Icon = item.icon;
            const isCopied = copiedId === item.id;

            return (
              <div
                key={item.id}
                onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                className="group relative flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.15] p-4 sm:p-5 transition-all cursor-pointer shadow-sm hover:shadow-lg"
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${item.iconBg} ${item.iconColor} shadow-inner-light group-hover:scale-105 transition-transform`}
                  >
                    <Icon className="h-5 w-5" />
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-white tracking-tight group-hover:text-sky-300 transition-colors">
                        {item.name}
                      </h3>
                      <span
                        className={`rounded-full border px-2 py-0.2 text-[9px] font-bold font-mono tracking-wider ${item.badgeClass}`}
                      >
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-400 leading-relaxed line-clamp-2">
                      {item.description}
                    </p>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      {item.highlights.map((h) => (
                        <span
                          key={h}
                          className="rounded-md bg-white/[0.04] px-1.5 py-0.5 text-[10px] font-mono text-zinc-400"
                        >
                          {h}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={(e) => handleCopy(e, item.id, item.url)}
                    className="flex items-center gap-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-2.5 py-1.5 text-xs text-zinc-300 hover:bg-white/[0.08] hover:text-white transition-colors"
                    title="Copy URL to clipboard"
                  >
                    {isCopied ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span className="text-[11px] text-emerald-300">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3 text-zinc-400" />
                        <span className="text-[11px] hidden xs:inline">Copy</span>
                      </>
                    )}
                  </button>

                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 hover:text-sky-200 transition-all shadow-sm"
                  >
                    <span>Open</span>
                    <ExternalLink className="h-3 w-3 group-hover:translate-x-0.5 transition-transform" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.06] bg-white/[0.02] px-5 py-3 sm:px-6 text-xs text-zinc-500">
          <span>Personal Product Factory Ecosystem</span>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
