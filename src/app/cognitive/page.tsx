'use client';

import { useState, useEffect, useRef } from 'react';
import {
  Brain, Zap, RefreshCw, Layers, Target, Activity,
  AlertCircle, CheckCircle, X, FileText, Share2,
  Shield, History, Sparkles, ChevronDown, ChevronUp,
  ArrowUpRight, TrendingDown, AlertTriangle, BarChart2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── types ──────────────────────────────────────────────── */
type Mode   = 'architect' | 'founder' | 'operator';
type SubTab = 'decide' | 'evaluate' | 'gaps' | 'history';

const MODE_CONFIG: Record<Mode, { label: string; desc: string; icon: any }> = {
  architect: { label: 'Architect', desc: 'Systems & structure',    icon: Layers  },
  founder:   { label: 'Founder',   desc: 'Business outcomes',      icon: Target  },
  operator:  { label: 'Operator',  desc: 'Execution & momentum',   icon: Activity },
};

/* ─── small shared primitives ────────────────────────────── */
const Panel: React.FC<{
  title: string;
  accent?: string;
  children: React.ReactNode;
}> = ({ title, accent = 'border-border-secondary', children }) => (
  <div className={`glass-panel rounded-[2rem] border ${accent} p-6 space-y-4 shadow-2xl`}>
    <h3 className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em]">
      {title}
    </h3>
    {children}
  </div>
);

const ConfidenceBar: React.FC<{ value: number }> = ({ value }) => (
  <div className="space-y-1.5">
    <div className="flex justify-between text-[10px] font-mono text-text-tertiary">
      <span>Confidence</span>
      <span className="font-bold text-text-primary">{Math.round(value * 100)}%</span>
    </div>
    <div className="h-1.5 bg-secondary rounded-full overflow-hidden border border-border-primary">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${value * 100}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className={`h-full rounded-full ${
          value >= 0.7 ? 'bg-success' : value >= 0.4 ? 'bg-warning' : 'bg-danger'
        }`}
      />
    </div>
  </div>
);

const FeedbackBar: React.FC<{ decisionId: string }> = ({ decisionId }) => {
  const [sent, setSent] = useState(false);

  async function submit(type: string) {
    await fetch('/api/cognitive/feedback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ decisionId, userId: 'system_user', feedbackType: type })
    });
    setSent(true);
  }

  if (sent) return (
    <div className="flex items-center gap-2 text-[11px] text-success font-semibold">
      <CheckCircle size={14} /> Feedback recorded
    </div>
  );

  return (
    <div className="flex gap-2">
      {[
        { key: 'accepted', label: 'Accept',  color: 'hover:bg-success/10 hover:text-success hover:border-success/30' },
        { key: 'ignored',  label: 'Ignore',  color: 'hover:bg-secondary hover:text-text-primary' },
        { key: 'rejected', label: 'Reject',  color: 'hover:bg-danger/10  hover:text-danger  hover:border-danger/30'  },
      ].map(f => (
        <button
          key={f.key}
          onClick={() => submit(f.key)}
          className={`flex-1 py-2 rounded-xl border border-border-secondary text-[11px] font-bold text-text-tertiary uppercase tracking-widest transition-all ${f.color}`}
        >
          {f.label}
        </button>
      ))}
    </div>
  );
};

/* ─── Decide tab ─────────────────────────────────────────── */
const DecideTab: React.FC<{ mode: Mode }> = ({ mode }) => {
  const [loading, setLoading]         = useState(false);
  const [output, setOutput]           = useState<any>(null);
  const [error, setError]             = useState<string | null>(null);
  const [pastedInput, setPastedInput] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cognitive/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'system_user', mode, external_input: pastedInput || undefined })
      });
      const data = await res.json();
      if (data.status === 'insufficient_data' || data.error) {
        setError(data.message || data.error);
        setOutput(null);
      } else {
        setOutput(data);
        setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (e: any) {
      setError('Connection failure. Check your network.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Optional JD/Idea input */}
      <div>
        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] block mb-2">
          Optional Input (JD / Idea / Brief)
        </label>
        <textarea
          value={pastedInput}
          onChange={e => setPastedInput(e.target.value)}
          placeholder="Paste a job description, client brief, or idea to include in the decision context…"
          rows={3}
          className="w-full glass-panel rounded-[1.5rem] border border-border-secondary px-5 py-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent/50 transition-colors resize-none"
        />
      </div>

      {/* Trigger */}
      <button
        onClick={run}
        disabled={loading}
        className="w-full py-4 rounded-[1.5rem] bg-text-primary text-bg-primary font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-3 hover:bg-accent-high transition-all disabled:opacity-40 shadow-2xl"
      >
        {loading
          ? <><RefreshCw size={16} className="animate-spin" /> Synthesising…</>
          : <><Zap size={16} className="fill-current" /> Get Direction</>
        }
      </button>

      {/* Error */}
      {error && (
        <div className="glass-panel rounded-[1.5rem] border border-danger/20 bg-danger/5 p-4 flex items-start gap-3">
          <AlertCircle size={16} className="text-danger shrink-0 mt-0.5" />
          <p className="text-sm text-danger flex-1">{error}</p>
          <button onClick={() => setError(null)}>
            <X size={14} className="text-danger/60 hover:text-danger" />
          </button>
        </div>
      )}

      {/* Output panels */}
      <AnimatePresence>
        {output && (
          <motion.div
            key="output"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <ConfidenceBar value={output.confidence} />

            {/* Recommendations */}
            {output.recommendations?.length > 0 && (
              <Panel title="Recommendations" accent="border-accent/20">
                <ol className="space-y-3">
                  {output.recommendations.map((r: string, i: number) => (
                    <li key={i} className="flex gap-3 group">
                      <span className="text-[11px] font-black text-accent mt-0.5 shrink-0 w-5">{i + 1}.</span>
                      <p className="text-sm text-text-secondary leading-snug flex-1">{r}</p>
                    </li>
                  ))}
                </ol>
              </Panel>
            )}

            {/* Priorities */}
            {output.priorities?.length > 0 && (
              <Panel title="Priorities">
                <div className="space-y-2">
                  {output.priorities.map((p: string, i: number) => {
                    const isHigh = p.toLowerCase().startsWith('high');
                    const isMed  = p.toLowerCase().startsWith('medium');
                    return (
                      <div key={i} className="flex items-start gap-3">
                        <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border shrink-0 mt-0.5 uppercase ${
                          isHigh ? 'bg-danger/10  text-danger  border-danger/20'  :
                          isMed  ? 'bg-warning/10 text-warning border-warning/20' :
                                   'bg-secondary  text-text-tertiary border-border-secondary'
                        }`}>
                          {isHigh ? 'High' : isMed ? 'Med' : 'Low'}
                        </span>
                        <p className="text-sm text-text-secondary leading-snug">
                          {p.replace(/^(High|Medium|Low):\s*/i, '')}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            )}

            {/* Gaps */}
            {output.gaps?.length > 0 && (
              <Panel title="Gaps Detected" accent="border-warning/20">
                <ul className="space-y-2">
                  {output.gaps.map((g: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <TrendingDown size={14} className="text-warning mt-0.5 shrink-0" />
                      {g}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {/* Reasoning */}
            {output.reasoning && (
              <div className="glass-panel rounded-[1.5rem] border border-border-secondary p-4 shadow-xl">
                <p className="text-[10px] font-black text-text-disabled uppercase tracking-widest mb-1.5">Reasoning</p>
                <p className="text-xs text-text-tertiary leading-relaxed italic">{output.reasoning}</p>
              </div>
            )}

            {/* Feedback */}
            {output.decision_id && <FeedbackBar decisionId={output.decision_id} />}

            <div ref={endRef} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Evaluate tab ───────────────────────────────────────── */
const EvaluateTab: React.FC<{ mode: Mode }> = ({ mode }) => {
  const [input, setInput]     = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    if (!input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cognitive/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'system_user', input_text: input, mode })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setResult(null); }
      else setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  const verdictColor = (v: string) =>
    v?.includes('Strong') ? 'text-success border-success/20 bg-success/5' :
    v?.includes('Poor')   ? 'text-danger  border-danger/20  bg-danger/5'  :
    'text-warning border-warning/20 bg-warning/5';

  return (
    <div className="space-y-6">
      <div>
        <label className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] block mb-2">
          Paste Input (JD / Brief / Idea)
        </label>
        <textarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Paste a job description, client brief, or project idea to evaluate against your memory profile…"
          rows={5}
          className="w-full glass-panel rounded-[1.5rem] border border-border-secondary px-5 py-4 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-accent/50 resize-none transition-colors"
        />
      </div>

      <button
        onClick={run}
        disabled={loading || !input.trim()}
        className="w-full py-4 rounded-[1.5rem] bg-text-primary text-bg-primary font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-3 hover:bg-accent-high transition-all disabled:opacity-40 shadow-2xl"
      >
        {loading
          ? <><RefreshCw size={16} className="animate-spin" /> Evaluating…</>
          : <><Target size={16} /> Evaluate Fit</>
        }
      </button>

      {error && (
        <div className="glass-panel rounded-[1.5rem] border border-danger/20 bg-danger/5 p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-danger" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div key="eval" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Verdict badge */}
            <div className="glass-panel rounded-[2rem] border border-border-secondary p-6 flex items-center justify-between shadow-2xl">
              <div>
                <p className="text-[10px] font-black text-text-disabled uppercase tracking-widest mb-1">Fit Score</p>
                <p className="text-4xl font-black text-text-primary">{Math.round((result.fit_score || 0) * 100)}%</p>
              </div>
              <span className={`text-sm font-black px-4 py-2 rounded-2xl border uppercase tracking-widest ${verdictColor(result.verdict)}`}>
                {result.verdict || 'Moderate Fit'}
              </span>
            </div>

            <ConfidenceBar value={result.confidence} />

            {result.why_yes?.length > 0 && (
              <Panel title="Why Yes" accent="border-success/20">
                <ul className="space-y-2">
                  {result.why_yes.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <CheckCircle size={14} className="text-success mt-0.5 shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {result.why_no?.length > 0 && (
              <Panel title="Why Not" accent="border-danger/20">
                <ul className="space-y-2">
                  {result.why_no.map((r: string, i: number) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-text-secondary">
                      <X size={14} className="text-danger mt-0.5 shrink-0" />{r}
                    </li>
                  ))}
                </ul>
              </Panel>
            )}

            {result.action_items?.length > 0 && (
              <Panel title="Actions to Increase Fit">
                <ol className="space-y-2">
                  {result.action_items.map((a: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-text-secondary">
                      <span className="text-accent font-black shrink-0">{i + 1}.</span>{a}
                    </li>
                  ))}
                </ol>
              </Panel>
            )}

            {result.reasoning && (
              <div className="glass-panel rounded-[1.5rem] border border-border-secondary p-4">
                <p className="text-xs text-text-tertiary italic">{result.reasoning}</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── Gaps tab ───────────────────────────────────────────── */
const GapsTab: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult]   = useState<any>(null);
  const [error, setError]     = useState<string | null>(null);

  async function run() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/cognitive/gaps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'system_user' })
      });
      const data = await res.json();
      if (data.error) { setError(data.error); setResult(null); }
      else setResult(data);
    } catch (e: any) { setError(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-[2rem] border border-border-secondary p-5 shadow-xl">
        <p className="text-sm text-text-tertiary leading-relaxed">
          Analyses your memory and signal coverage against expected professional domains.
          Identifies weak areas, underutilised entities, and missing signals.
        </p>
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="w-full py-4 rounded-[1.5rem] bg-text-primary text-bg-primary font-black uppercase tracking-[0.3em] text-[11px] flex items-center justify-center gap-3 hover:bg-accent-high transition-all disabled:opacity-40 shadow-2xl"
      >
        {loading
          ? <><RefreshCw size={16} className="animate-spin" /> Analysing…</>
          : <><BarChart2 size={16} /> Analyse Profile Gaps</>
        }
      </button>

      {error && (
        <div className="glass-panel rounded-[1.5rem] border border-danger/20 bg-danger/5 p-4 flex items-center gap-3">
          <AlertCircle size={16} className="text-danger" />
          <p className="text-sm text-danger">{error}</p>
        </div>
      )}

      <AnimatePresence>
        {result && (
          <motion.div key="gaps" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {/* Coverage score */}
            <div className="glass-panel rounded-[2rem] border border-border-secondary p-6 flex items-center justify-between shadow-2xl">
              <div>
                <p className="text-[10px] font-black text-text-disabled uppercase tracking-widest mb-1">Domain Coverage</p>
                <p className="text-4xl font-black text-text-primary">{Math.round((result.coverage_score || 0) * 100)}%</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-text-tertiary">{result.total_entities} entities</p>
                <p className="text-[10px] text-text-tertiary">{result.total_signals} signals</p>
              </div>
            </div>

            {result.missing_domains?.length > 0 && (
              <Panel title="Missing Domains" accent="border-danger/20">
                <div className="flex flex-wrap gap-2">
                  {result.missing_domains.map((d: string) => (
                    <span key={d} className="px-3 py-1.5 bg-danger/5 border border-danger/20 text-danger text-[11px] font-bold rounded-xl uppercase tracking-wide">
                      {d}
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            {result.weak_entities?.length > 0 && (
              <Panel title="Weak Entities (low occurrences)" accent="border-warning/20">
                <div className="flex flex-wrap gap-2">
                  {result.weak_entities.map((e: string) => (
                    <span key={e} className="px-3 py-1 bg-warning/5 border border-warning/20 text-warning text-[11px] font-semibold rounded-xl">
                      {e}
                    </span>
                  ))}
                </div>
              </Panel>
            )}

            {result.underperforming_signals?.length > 0 && (
              <Panel title="Underperforming Signals">
                <div className="space-y-2">
                  {result.underperforming_signals.map((s: any, i: number) => (
                    <div key={i} className="flex items-center gap-3 text-sm text-text-tertiary">
                      <AlertTriangle size={13} className="text-warning shrink-0" />
                      <span className="font-mono">{s.type}</span>
                      <span className="text-text-disabled">·</span>
                      <span>{s.category}</span>
                    </div>
                  ))}
                </div>
              </Panel>
            )}

            <div className="glass-panel rounded-[1.5rem] border border-accent/20 bg-accent/5 p-4">
              <p className="text-xs text-accent font-semibold leading-relaxed">{result.recommendation}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ─── History tab ────────────────────────────────────────── */
const HistoryTab: React.FC = () => {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/cognitive/history?userId=system_user')
      .then(r => r.json())
      .then(d => setHistory(Array.isArray(d) ? d : []))
      .catch(() => setHistory([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center py-20 gap-3 text-text-tertiary">
      <RefreshCw size={18} className="animate-spin" />
      <span className="text-sm">Loading history…</span>
    </div>
  );

  if (history.length === 0) return (
    <div className="glass-panel rounded-[2rem] border border-border-secondary p-12 text-center shadow-xl">
      <History size={32} className="mx-auto text-text-disabled mb-3" strokeWidth={1.5} />
      <p className="text-sm font-semibold text-text-tertiary">No decision history yet.</p>
      <p className="text-[12px] text-text-disabled mt-1">Run "Get Direction" to generate your first decision.</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {history.map((h: any) => {
        const isOpen = expanded === h.id;
        const recs = h.outputJson?.recommendations || [];
        return (
          <div key={h.id} className="glass-panel rounded-[2rem] border border-border-secondary shadow-xl overflow-hidden">
            <button
              onClick={() => setExpanded(isOpen ? null : h.id)}
              className="w-full flex items-center justify-between px-5 py-4 hover:bg-secondary/30 transition-colors text-left gap-4"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full border uppercase tracking-widest shrink-0 ${
                  h.mode === 'architect' ? 'bg-accent/10 text-accent border-accent/20' :
                  h.mode === 'founder'   ? 'bg-warning/10 text-warning border-warning/20' :
                  'bg-success/10 text-success border-success/20'
                }`}>{h.mode}</span>
                <p className="text-sm font-semibold text-text-primary truncate">
                  {recs[0] || 'Decision record'}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {h.lastFeedback && (
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    h.lastFeedback === 'accepted' ? 'text-success' :
                    h.lastFeedback === 'rejected' ? 'text-danger'  : 'text-text-disabled'
                  }`}>{h.lastFeedback}</span>
                )}
                <span className="text-[10px] font-mono text-text-disabled">
                  {new Date(h.createdAt).toLocaleDateString()}
                </span>
                {isOpen ? <ChevronUp size={14} className="text-text-tertiary" /> : <ChevronDown size={14} className="text-text-tertiary" />}
              </div>
            </button>

            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-5 pb-5 pt-2 space-y-3 border-t border-border-secondary/60">
                    {recs.length > 0 && (
                      <div>
                        <p className="text-[10px] font-black text-text-disabled uppercase tracking-widest mb-2">Recommendations</p>
                        <ol className="space-y-1.5">
                          {recs.map((r: string, i: number) => (
                            <li key={i} className="flex gap-2.5 text-[12px] text-text-secondary">
                              <span className="text-accent font-black shrink-0">{i + 1}.</span>{r}
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {h.outputJson?.reasoning && (
                      <p className="text-xs text-text-disabled italic border-t border-border-secondary/60 pt-3">
                        {h.outputJson.reasoning}
                      </p>
                    )}
                    <div className="pt-2">
                      <FeedbackBar decisionId={h.id} />
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
};

/* ─── Root page ──────────────────────────────────────────── */
export default function CognitivePage() {
  const [mode, setMode]       = useState<Mode>('architect');
  const [subTab, setSubTab]   = useState<SubTab>('decide');

  const SUB_TABS: Array<{ id: SubTab; label: string; icon: any }> = [
    { id: 'decide',   label: 'Decision',  icon: Zap     },
    { id: 'evaluate', label: 'Evaluate',  icon: Target  },
    { id: 'gaps',     label: 'Gaps',      icon: BarChart2 },
    { id: 'history',  label: 'History',   icon: History },
  ];

  return (
    <div className="w-full max-w-3xl mx-auto px-4 md:px-6 py-8 space-y-8">

      {/* Page header */}
      <header className="flex items-start justify-between">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-2xl bg-secondary border border-border-secondary flex items-center justify-center shrink-0">
            <Brain size={17} className="text-text-tertiary" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-text-primary uppercase italic">Cognitive Engine</h1>
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-success/10 border border-success/20">
                <div className="w-1.5 h-1.5 rounded-full bg-success animate-pulse" />
                <span className="text-[9px] font-black text-success uppercase tracking-widest">Active</span>
              </div>
            </div>
            <p className="text-sm text-text-tertiary mt-0.5">L4 decision synthesis — read-only, structured output</p>
          </div>
        </div>
      </header>

      {/* Mode selector */}
      <div>
        <p className="text-[10px] font-black text-text-disabled uppercase tracking-[0.3em] mb-2">Mode</p>
        <div className="flex gap-2 p-1.5 glass-panel rounded-[2rem] border border-border-secondary shadow-xl">
          {(Object.keys(MODE_CONFIG) as Mode[]).map(m => {
            const cfg = MODE_CONFIG[m];
            const Icon = cfg.icon;
            const active = mode === m;
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-[1.5rem] text-[11px] font-bold uppercase tracking-widest transition-all duration-200 ${
                  active
                    ? 'bg-text-primary text-bg-primary shadow-sm'
                    : 'text-text-tertiary hover:bg-secondary hover:text-text-primary'
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2.5 : 2} />
                <span className="hidden sm:block">{cfg.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-text-disabled mt-1.5 pl-1 font-mono">
          {MODE_CONFIG[mode].desc}
        </p>
      </div>

      {/* Sub-tab nav */}
      <div className="flex gap-1 border-b border-border-secondary/60">
        {SUB_TABS.map(t => {
          const Icon = t.icon;
          const active = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={`flex items-center gap-2 px-4 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-all border-b-2 -mb-px ${
                active
                  ? 'border-text-primary text-text-primary'
                  : 'border-transparent text-text-tertiary hover:text-text-primary'
              }`}
            >
              <Icon size={13} />
              <span className="hidden sm:block">{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={subTab}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.12 }}
        >
          {subTab === 'decide'   && <DecideTab   mode={mode} />}
          {subTab === 'evaluate' && <EvaluateTab mode={mode} />}
          {subTab === 'gaps'     && <GapsTab />}
          {subTab === 'history'  && <HistoryTab />}
        </motion.div>
      </AnimatePresence>

    </div>
  );
}
