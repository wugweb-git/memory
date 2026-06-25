"use client";
import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sparkles, CheckCircle2, ChevronDown, ChevronUp,
  Linkedin, Calendar, DollarSign, MapPin, X, ArrowRight,
  Twitter, Github, Youtube, Database, Brain, ShieldCheck,
  User, Grid, ExternalLink, Loader2
} from 'lucide-react';
import { IDENTITY_CONFIG, resolveUserId } from '@/config/identity';

/* ── Navigation helper ─────────────────────────────────────────
   EnhancementHub doesn't have access to page.tsx setSection.
   We use a CustomEvent so page.tsx can listen and switch sections
   without prop drilling.
──────────────────────────────────────────────────────────────── */
const navigate = (section: string) =>
  window.dispatchEvent(new CustomEvent('prism:navigate', { detail: { section } }));

/* ── Rec definition ─────────────────────────────────────────── */
interface Rec {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  cta?: string;
  action: () => void | Promise<void>;
}

/* ── Stored completion state in localStorage ─────────────────── */
const STORAGE_KEY = 'enhancement_hub_completed';
const loadCompleted = (): Set<string> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set(['1']); // id:1 completed by default
  } catch {
    return new Set(['1']);
  }
};
const saveCompleted = (ids: Set<string>) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...ids])); } catch {}
};

export const EnhancementHub = () => {
  const [isOpen, setIsOpen]         = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [completed, setCompleted]   = useState<Set<string>>(new Set(['1']));
  const [generating, setGenerating] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [finalized, setFinalized]   = useState(false);

  /* Load from localStorage on mount */
  useEffect(() => { setCompleted(loadCompleted()); }, []);

  const markDone = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev).add(id);
      saveCompleted(next);
      return next;
    });
  }, []);

  /* Auto-generate semantic bio via cognitive API */
  const generateBio = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/cognitive/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: resolveUserId().userId, mode: 'architect' }),
      });
      if (res.ok) {
        markDone('6');
        setExpandedId(null);
      }
    } finally {
      setGenerating(false);
    }
  };

  /* Finalize sync — mark all as done */
  const finalizeSync = async () => {
    setFinalizing(true);
    await new Promise(r => setTimeout(r, 800));
    const all = new Set(RECS.map(r => r.id));
    saveCompleted(all);
    setCompleted(all);
    setFinalizing(false);
    setFinalized(true);
    setTimeout(() => { setFinalized(false); setIsOpen(false); }, 1800);
  };

  /* All recommendations with real action handlers */
  const RECS: Rec[] = [
    {
      id: '1',
      title: 'Add calendar & meeting link',
      description: 'Connect your calendars to automatically block availability during existing events.',
      icon: <Calendar size={18} />,
      // Already completed — no CTA
      action: () => {},
    },
    {
      id: '2',
      title: 'Let followers support your work',
      description: 'Let your followers pay as much as they can after booking. 40% more likely to pay.',
      icon: <DollarSign size={18} />,
      cta: 'Try it out',
      action: () => { navigate('syncs'); setIsOpen(false); },
    },
    {
      id: '3',
      title: 'Add position on LinkedIn',
      description: 'Sync your professional background to ground the Digital Twin in your career achievements.',
      icon: <Linkedin size={18} />,
      cta: 'Connect LinkedIn',
      action: () => window.open(IDENTITY_CONFIG.LINKEDIN_URL, '_blank'),
    },
    {
      id: '4',
      title: 'Enable location-wise dynamic pricing',
      description: 'Automatically adjust service rates based on the viewer\'s PPP and region.',
      icon: <MapPin size={18} />,
      cta: 'Configure',
      action: () => { navigate('settings'); setIsOpen(false); },
    },
    {
      id: '5',
      title: 'Initialize Neural Avatar',
      description: 'Upload a high-fidelity portrait to anchor the Digital Twin identity in space.',
      icon: <User size={18} />,
      cta: 'Upload',
      action: () => { navigate('memory'); setIsOpen(false); },
    },
    {
      id: '6',
      title: 'Calibrate Semantic Bio',
      description: 'Optimize your profile summary with LLM-extracted keywords for better memory grounding.',
      icon: <Sparkles size={18} />,
      cta: generating ? 'Generating…' : 'Auto-Generate',
      action: generateBio,
    },
    {
      id: '7',
      title: 'Bridge Twitter Sync',
      description: 'Uplink your social presence for real-time sentiment and persona alignment.',
      icon: <Twitter size={18} />,
      cta: 'Authorize',
      action: () => { navigate('syncs'); setIsOpen(false); },
    },
    {
      id: '8',
      title: 'Deploy Service Lattice',
      description: 'Configure your primary interaction nodes to allow followers to book cognitive syncs.',
      icon: <Grid size={18} />,
      cta: 'Open Grid',
      action: () => { navigate('showcase'); setIsOpen(false); },
    },
    {
      id: '9',
      title: 'Audit Memory Quarantine',
      description: 'Review pending fragments in the buffer for promotion to the vector core.',
      icon: <Database size={18} />,
      cta: 'Inspect',
      action: () => { navigate('buffer'); setIsOpen(false); },
    },
    {
      id: '10',
      title: 'Test Neural Chat reflex',
      description: 'Perform a test query to verify the RAG pipeline\'s grounding and reflex latency.',
      icon: <Brain size={18} />,
      cta: 'Launch Sync',
      action: () => { navigate('twin'); setIsOpen(false); },
    },
    {
      id: '11',
      title: 'Harden L4 Logic Gates',
      description: 'Finalize preference and behavior models for production-grade decision making.',
      icon: <ShieldCheck size={18} />,
      cta: 'Certify',
      action: () => { navigate('cognitive'); setIsOpen(false); },
    },
    {
      id: '12',
      title: 'Sync GitHub Repository',
      description: 'Connect your codebase to expose your technical graph and contribution history.',
      icon: <Github size={18} />,
      cta: 'Uplink',
      action: () => window.open(IDENTITY_CONFIG.GITHUB_URL, '_blank'),
    },
    {
      id: '13',
      title: 'Broadcast YouTube Feed',
      description: 'Display your creative video output as a primary identity facet.',
      icon: <Youtube size={18} />,
      cta: 'Feed Sync',
      action: () => window.open(IDENTITY_CONFIG.YOUTUBE_URL, '_blank'),
    },
    {
      id: '14',
      title: 'Achieve Matrix Alignment',
      description: 'Verify parity between the administrative core and your public profile mirror.',
      icon: <ExternalLink size={18} />,
      cta: 'Verify',
      action: () => window.open('/', '_blank'),
    },
  ];

  const pendingCount = RECS.filter(r => !completed.has(r.id)).length;

  return (
    <>
      {/* Floating trigger */}
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-4 md:bottom-10 md:right-10 z-[60] bg-black text-white px-5 md:px-8 py-3 md:py-4 rounded-full font-black text-2xs md:text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 overflow-hidden group border border-white/10"
        aria-label={`Enhance Profile — ${pendingCount} items pending`}
      >
        <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-20" />
        <span className="relative z-10 flex items-center gap-3">
          <Sparkles size={16} className="text-accent" />
          Enhance Profile
          {pendingCount > 0 && (
            <span className="bg-accent text-bg-primary text-2xs w-5 h-5 rounded-full flex items-center justify-center -mr-2">
              {pendingCount}
            </span>
          )}
        </span>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />

            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 100, opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-3xl overflow-hidden border border-[#F0F0EE]"
              role="dialog"
              aria-modal="true"
              aria-label="Enhancement hub checklist"
            >
              {/* Header */}
              <div className="p-10 pb-0 space-y-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center mb-4 border border-accent/10">
                      <Sparkles className="text-accent" size={24} />
                    </div>
                    <h2 className="text-3xl font-black text-[#1A1A1A] tracking-tighter ">
                      Advanced checklist
                    </h2>
                    <p className="text-sm font-medium text-[#888886]">
                      Unlock the potential of your Identity Prism
                    </p>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-3 rounded-full hover:bg-[#F5F5F3] text-[#888886] transition-colors"
                    aria-label="Close"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Progress bar */}
                <div className="space-y-3">
                  <div className="flex gap-1.5">
                    {RECS.map(r => (
                      <div key={r.id}
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${completed.has(r.id) ? 'bg-accent' : 'bg-[#F0F0EE]'}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-2xs font-black uppercase tracking-widest text-[#A0A09E]">
                    <span>Analysis Complete</span>
                    <span>{pendingCount} Nodes Pending</span>
                  </div>
                </div>
              </div>

              {/* Checklist */}
              <div className="p-10 pt-6 space-y-2 overflow-y-auto max-h-[45vh] custom-scrollbar">
                {RECS.map(rec => {
                  const isDone = completed.has(rec.id);
                  return (
                    <div key={rec.id}
                      className={`rounded-[1.5rem] border transition-all duration-300 ${
                        expandedId === rec.id
                          ? 'bg-[#F9F9F7] border-[#E0E0DE]'
                          : 'bg-transparent border-transparent hover:bg-[#F9F9F7]/50'
                      }`}
                    >
                      <button
                        onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                        className="w-full px-6 py-4 flex items-center justify-between text-left"
                        aria-expanded={expandedId === rec.id}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl border transition-colors ${
                            isDone
                              ? 'bg-success/10 border-success/20 text-success'
                              : 'bg-white border-[#E0E0DE] text-[#666664]'
                          }`}>
                            {isDone ? <CheckCircle2 size={18} /> : rec.icon}
                          </div>
                          <span className={`text-sm font-bold tracking-tight ${
                            isDone ? 'text-[#A0A09E] line-through' : 'text-[#1A1A1A]'
                          }`}>
                            {rec.title}
                          </span>
                        </div>
                        {expandedId === rec.id ? <ChevronUp size={16} className="text-[#888]" /> : <ChevronDown size={16} className="text-[#CCC]" />}
                      </button>

                      <AnimatePresence>
                        {expandedId === rec.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-16 pb-6 space-y-5">
                              <p className="text-xs leading-relaxed text-[#666664] font-medium ">
                                {rec.description}
                              </p>
                              {rec.cta && !isDone && (
                                <div className="flex items-center gap-3">
                                  <button
                                    onClick={async () => {
                                      await rec.action();
                                      markDone(rec.id);
                                    }}
                                    disabled={generating && rec.id === '6'}
                                    className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl text-2xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl disabled:opacity-50 flex items-center gap-2"
                                  >
                                    {generating && rec.id === '6' && <Loader2 size={12} className="animate-spin" />}
                                    {rec.cta}
                                  </button>
                                  <button
                                    onClick={() => markDone(rec.id)}
                                    className="p-3 rounded-xl bg-white border border-[#E0E0DE] text-[#666664] hover:border-success hover:text-success transition-all"
                                    title="Mark as done"
                                  >
                                    <CheckCircle2 size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="p-10 bg-[#1A1A1A] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/20">
                    <Brain className="text-accent" size={20} />
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-widest leading-none">Neural Mirror</h4>
                    <p className="text-2xs text-[#888886] font-bold uppercase tracking-[0.2em] mt-1">
                      {pendingCount === 0 ? 'Status: Aligned' : 'Status: Locked'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={finalizeSync}
                  disabled={finalizing}
                  className="bg-white text-black px-8 py-3 rounded-xl text-2xs font-black uppercase tracking-widest hover:bg-accent hover:text-white transition-all disabled:opacity-50 flex items-center gap-2"
                >
                  {finalizing
                    ? <><Loader2 size={13} className="animate-spin" /> Syncing…</>
                    : finalized
                    ? <><CheckCircle2 size={13} /> Synced!</>
                    : 'Finalize Sync'
                  }
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
