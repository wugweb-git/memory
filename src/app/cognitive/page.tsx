'use client';

import { useState, useEffect, useRef } from 'react';
import { 
  Brain, Zap, RefreshCw, Layers, Target, Eye, AlertCircle, ChevronRight, 
  Activity, Lightbulb, TrendingUp, Share2, Send, CheckCircle, FileText, X,
  Shield, Radio, History, ThumbsUp, ThumbsDown, Settings, List, Globe,
  Command, Sparkles, MessageSquare, ArrowUpRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

type Mode = 'architect' | 'founder' | 'operator';
type Platform = 'linkedin' | 'blog' | 'memo';
type Tab = 'home' | 'stream' | 'content' | 'history' | 'system';

const MODE_CONFIG: Record<Mode, { color: string; label: string; description: string; icon: any }> = {
  architect: { color: '#00AAFF', label: 'Architect', description: 'Systems', icon: Layers },
  founder: { color: '#D97706', label: 'Founder', description: 'Leverage', icon: Target },
  operator: { color: '#059669', label: 'Operator', description: 'Momentum', icon: Activity }
};

export default function CognitivePage() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const [mode, setMode] = useState<Mode>('architect');
  const [loading, setLoading] = useState(false);
  const [output, setOutput] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [pastedInput, setPastedInput] = useState('');
  
  const [artifact, setArtifact] = useState<any>(null);
  const [generatingArtifact, setGeneratingArtifact] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [pushed, setPushed] = useState(false);

  const [history, setHistory] = useState<any[]>([]);
  const [signals, setSignals] = useState<any[]>([]);
  const [health, setHealth] = useState<any>(null);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeTab === 'history') fetchHistory();
    if (activeTab === 'stream') fetchSignals();
    if (activeTab === 'system') fetchHealth();
  }, [activeTab]);

  async function fetchHistory() {
    try {
      const res = await fetch('/api/cognitive/history?userId=system_user');
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (e) { console.error("History fetch failed"); }
  }

  async function fetchSignals() {
    try {
      const res = await fetch('/api/processing/signals');
      const data = await res.json();
      setSignals(Array.isArray(data) ? data : []);
    } catch (e) { console.error("Signals fetch failed"); }
  }

  async function fetchHealth() {
    try {
      const res = await fetch('/api/admin/system-health');
      const data = await res.json();
      setHealth(data);
    } catch (e) { console.error("Health fetch failed"); }
  }

  async function getDecision() {
    setLoading(true);
    setError(null);
    setArtifact(null);
    try {
      const res = await fetch('/api/cognitive/decide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'system_user', mode, external_input: pastedInput || undefined })
      });
      const data = await res.json();
      if (data.status === 'insufficient_data') {
        setError(data.message);
        setOutput(null);
      } else if (data.error) {
        setError(data.error);
        setOutput(null);
      } else {
        setOutput(data);
        fetchHistory();
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }
    } catch (e: any) {
      setError('Connection link severed.');
    } finally {
      setLoading(false);
    }
  }

  async function generateOutput(source: string, platform: Platform) {
    setGeneratingArtifact(true);
    setPushed(false);
    setActiveTab('content');
    try {
      const res = await fetch('/api/output/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'system_user',
          decisionId: output?.decision_id,
          sourceContent: source,
          platform
        })
      });
      const data = await res.json();
      setArtifact(data);
    } catch (e) {
      setError('Output generation failed.');
    } finally {
      setGeneratingArtifact(false);
    }
  }

  async function pushToAutomation() {
    if (!artifact?.output_id) return;
    setPushing(true);
    try {
       const res = await fetch('/api/output/publish', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({ outputId: artifact.output_id })
       });
       const data = await res.json();
       if (data.status === 'success' || data.success) setPushed(true);
    } catch (e) {
       console.error("Publish failed");
    } finally {
       setPushing(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#FDFDFB] text-[#1A1A1A] selection:bg-accent/20 flex flex-col font-sans overflow-x-hidden">
      
      {/* Porcelain Header & Mode Selector */}
      {activeTab === 'home' && (
        <header className="px-6 pt-12 pb-8 border-b border-[#F0F0EE] bg-white sticky top-0 z-50 shadow-sm">
          <div className="max-w-4xl mx-auto w-full space-y-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shadow-xl">
                   <Command size={18} />
                </div>
                <div className="flex flex-col">
                   <span className="text-[11px] font-black uppercase tracking-[0.3em] italic">Decision_Matrix</span>
                   <span className="text-[9px] font-bold text-[#A0A09E] uppercase tracking-widest">Protocol: COGNITIVE_v4</span>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-success/5 border border-success/20">
                <div className="w-1.5 h-1.5 rounded-full animate-pulse bg-success" />
                <span className="text-[9px] font-black uppercase tracking-widest text-success italic">Link_Active</span>
              </div>
            </div>

            <div className="flex gap-2 p-1.5 bg-[#F5F5F3] border border-[#E0E0DE] rounded-2xl shadow-inner">
              {(Object.keys(MODE_CONFIG) as Mode[]).map((m) => {
                const cfg = MODE_CONFIG[m];
                const isActive = mode === m;
                return (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all duration-500 border ${
                      isActive 
                      ? 'bg-white text-[#1A1A1A] border-[#E0E0DE] shadow-lg scale-[1.02]' 
                      : 'bg-transparent border-transparent text-[#888886] hover:text-[#1A1A1A]'
                    }`}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>
        </header>
      )}

      {/* Main Experience Area */}
      <main className="flex-1 overflow-y-auto px-6 py-12 lg:py-20 custom-scrollbar max-w-5xl mx-auto w-full bg-[#FBFBFA]">
        <AnimatePresence mode="wait">
          
          {/* Home Interaction Hub */}
          {activeTab === 'home' && (
            <motion.div key="home" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="space-y-16">
              <div className="relative group">
                <div className="absolute -inset-1 bg-accent/5 rounded-[2.5rem] blur-2xl opacity-0 group-focus-within:opacity-100 transition-opacity" />
                <textarea
                  value={pastedInput}
                  onChange={(e) => setPastedInput(e.target.value)}
                  placeholder="Pose a strategic query to the Matrix..."
                  className="w-full bg-white border border-[#E0E0DE] rounded-[2.5rem] p-10 text-2xl text-[#1A1A1A] placeholder:text-[#A0A09E] focus:outline-none focus:border-[#1A1A1A] transition-all resize-none min-h-[220px] shadow-2xl relative z-10 italic font-medium leading-relaxed"
                />
                <div className="absolute bottom-10 right-10 flex items-center gap-4 text-[10px] font-black text-[#888886] uppercase tracking-[0.3em] pointer-events-none z-20">
                   <div className="w-2 h-2 rounded-full bg-accent animate-pulse" /> INPUT_VECTOR_ACTIVE
                </div>
              </div>

              <button
                onClick={getDecision}
                disabled={loading}
                className={`w-full py-6 rounded-[2rem] font-black uppercase tracking-[0.4em] text-[12px] transition-all relative overflow-hidden flex items-center justify-center gap-4 shadow-xl ${
                  loading 
                  ? 'bg-[#F5F5F3] text-[#A0A09E] cursor-not-allowed' 
                  : 'bg-[#1A1A1A] text-white hover:scale-[1.01] active:scale-[0.98] hover:shadow-black/10'
                }`}
              >
                {loading ? <><RefreshCw className="w-4 h-4 animate-spin" /> Synthesizing Graph...</> : <><Zap className="w-4 h-4 fill-current" /> Initiate Decision Sync</>}
              </button>

               {/* Error State */}
               {error && (
                 <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="p-8 rounded-[2rem] border border-red-200 bg-red-50 flex items-start gap-6">
                   <AlertCircle size={20} className="text-red-500 shrink-0 mt-1" />
                   <div>
                     <p className="text-[11px] font-black uppercase tracking-widest text-red-600 mb-2">Engine Response</p>
                     <p className="text-sm font-medium text-red-700 italic">{error}</p>
                   </div>
                   <button onClick={() => setError(null)} className="ml-auto p-2 hover:bg-red-100 rounded-xl text-red-400 transition-colors">
                     <X size={16} />
                   </button>
                 </motion.div>
               )}

               {/* Result Matrix */}
               <AnimatePresence>
                 {output && (
                   <motion.section key="decision" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} className="space-y-10 pt-12">
                     <div className="p-12 rounded-[3.5rem] bg-white border border-[#E0E0DE] shadow-3xl space-y-12 relative overflow-hidden group">
                        <div className="absolute -top-20 -right-20 w-80 h-80 bg-accent/5 rounded-full blur-[100px] pointer-events-none" />
                        
                        <header className="flex items-center justify-between border-b border-[#F0F0EE] pb-8">
                          <div className="space-y-1">
                             <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-accent flex items-center gap-4 italic font-black">
                               Executive_Signal_Synthesis
                             </h3>
                             <p className="text-[9px] font-bold text-[#A0A09E] uppercase tracking-widest">Confidence: {Math.round(output.confidence * 100)}% // Alpha_Stability</p>
                          </div>
                          <div className="flex items-center gap-3 bg-[#F5F5F3] px-4 py-2 rounded-full border border-[#E0E0DE]">
                             <span className="text-[9px] font-black text-[#1A1A1A] uppercase tracking-widest">Realtime Synthesis</span>
                             <div className="w-2 h-2 rounded-full bg-success" />
                          </div>
                        </header>

                        <div className="grid grid-cols-1 gap-12">
                           {output.recommendations?.map((rec: string, i: number) => (
                             <div key={i} className="group/item flex flex-col md:flex-row gap-8 md:items-start">
                                <span className="text-5xl font-black italic tracking-tighter text-[#E0E0DE] group-hover/item:text-accent/20 transition-colors leading-[0.8]">0{i+1}</span>
                                <div className="space-y-6 flex-1">
                                   <p className={`text-2xl lg:text-3xl leading-tight tracking-tighter text-[#1A1A1A] italic uppercase ${i === 0 ? 'font-black' : 'font-bold opacity-80'}`}>
                                     {rec}
                                   </p>
                                   <div className="flex flex-wrap items-center gap-3 opacity-0 group-hover/item:opacity-100 transition-all transform translate-y-2 group-hover/item:translate-y-0 duration-500">
                                     <button onClick={() => generateOutput(rec, 'linkedin')} className="px-6 py-3 rounded-xl bg-white border border-[#E0E0DE] text-[10px] font-black uppercase tracking-widest text-[#1A1A1A] hover:bg-[#1A1A1A] hover:text-white transition-all flex items-center gap-3 shadow-sm">
                                       <Share2 className="w-4 h-4" /> Deploy LinkedIn
                                     </button>
                                     <button onClick={() => generateOutput(rec, 'memo')} className="px-6 py-3 rounded-xl bg-white border border-[#E0E0DE] text-[10px] font-black uppercase tracking-widest text-[#888886] hover:border-[#1A1A1A] hover:text-[#1A1A1A] transition-all flex items-center gap-3 shadow-sm">
                                       <FileText className="w-4 h-4" /> Archive Memo
                                     </button>
                                   </div>
                                </div>
                             </div>
                           ))}
                        </div>

                        <footer className="pt-8 border-t border-[#F0F0EE]">
                           <p className="text-[10px] text-[#A0A09E] font-medium leading-relaxed italic group-hover:text-[#1A1A1A] transition-colors">
                              {output.reasoning}
                           </p>
                        </footer>
                     </div>
                     <div ref={bottomRef} className="h-10" />
                   </motion.section>
                 )}
               </AnimatePresence>
            </motion.div>
          )}

          {/* Stream: Neural Pulse Hub */}
          {activeTab === 'stream' && (
            <motion.div key="stream" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-32">
               <header className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-accent underline-offset-8 underline decoration-accent/20">
                     <Radio className="w-4 h-4 animate-pulse" />
                     <span className="text-[11px] font-black uppercase tracking-[0.4em]">Neural_Pulse_Stream</span>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter uppercase italic">Live Signals</h2>
               </header>
               <div className="grid grid-cols-1 gap-6">
                 {signals.length > 0 ? signals.map((s, i) => (
                   <div key={i} className="p-10 rounded-[3rem] border border-[#E0E0DE] bg-white group hover:border-[#1A1A1A] transition-all shadow-xl flex items-center justify-between gap-8">
                      <div className="space-y-4 flex-1">
                         <div className="flex items-center gap-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#A0A09E]">{new Date(s.timestamp || s.createdAt).toLocaleTimeString()}</span>
                            <span className="px-3 py-1 bg-accent text-white text-[9px] font-black uppercase tracking-widest rounded-lg">{s.type || (s.category?.toUpperCase()) || 'SIGNAL'}</span>
                         </div>
                         <p className="text-xl font-bold tracking-tight text-[#1A1A1A] italic uppercase">{s.description || s.content || 'Cognitive Spike Detected'}</p>
                      </div>
                      <div className="w-24 h-1.5 bg-[#F5F5F3] rounded-full overflow-hidden border border-[#E0E0DE] shadow-inner shrink-0">
                         <motion.div initial={{ width: 0 }} animate={{ width: `${(s.intensity || s.strength || 0.5) * 100}%` }} className="h-full bg-accent" />
                      </div>
                   </div>
                 )) : (
                   <div className="py-40 flex flex-col items-center justify-center text-[#E0E0DE] gap-6 grayscale opacity-50">
                      <Activity size={60} strokeWidth={1} />
                      <span className="text-[11px] font-black uppercase tracking-[0.4em]">No Live Signals Detected</span>
                   </div>
                 )}
               </div>
            </motion.div>
          )}

          {activeTab === 'content' && (
            <motion.div key="content" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-32">
               <header className="space-y-2">
                  <h2 className="text-4xl font-black tracking-tighter uppercase italic">Command Output</h2>
                  <p className="text-[#888886] text-xs font-bold uppercase tracking-widest">Protocol: ARTIFACT_DEPLOYMENT</p>
               </header>
               <div className="glass-panel p-12 rounded-[3.5rem] min-h-[600px] flex flex-col bg-white border border-[#E0E0DE] shadow-2xl relative group">
                  {generatingArtifact ? (
                     <div className="flex-1 flex flex-col items-center justify-center gap-12">
                        <div className="w-20 h-20 border-4 border-[#F5F5F3] border-t-accent rounded-full animate-spin" />
                        <span className="text-[11px] font-black uppercase tracking-[0.4em] text-accent animate-pulse italic">Synthesizing_Artifact_Alpha...</span>
                     </div>
                  ) : artifact ? (
                     <>
                        <textarea className="flex-1 bg-transparent text-2xl font-medium leading-relaxed italic text-[#444442] resize-none focus:outline-none custom-scrollbar" defaultValue={artifact.content} />
                        <footer className="mt-12 pt-10 border-t border-[#F0F0EE] flex items-center justify-between">
                           <button className="text-[10px] font-black uppercase tracking-widest text-[#888886] hover:text-[#1A1A1A] transition-all flex items-center gap-3">
                              <RefreshCw size={14} /> Re-Calculate
                           </button>
                           <button 
                             onClick={pushToAutomation}
                             className={`px-12 py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl transition-all ${
                               pushed ? 'bg-success text-white' : (pushing ? 'bg-[#F5F5F3] text-[#A0A09E]' : 'bg-[#1A1A1A] text-white hover:scale-105 active:scale-95')
                             }`}
                           >
                              {pushed ? 'Pushed to n8n Queue' : (pushing ? 'Publishing...' : 'Deploy to Node')}
                           </button>
                        </footer>
                     </>
                  ) : (
                     <div className="flex-1 flex flex-col items-center justify-center text-[#E0E0DE] gap-8">
                        <Sparkles size={80} strokeWidth={1} />
                        <span className="text-[11px] font-black uppercase tracking-[0.4em]">Artifact_Engine_Idle</span>
                     </div>
                  )}
               </div>
            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div key="history" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-12 pb-32">
               <h2 className="text-5xl font-black tracking-tighter uppercase italic">Registry</h2>
               <div className="grid grid-cols-1 gap-6">
                 {history.length > 0 ? history.map((h, i) => (
                   <div key={i} className="p-10 rounded-[3rem] border border-[#E0E0DE] bg-white group hover:border-[#1A1A1A] transition-all shadow-xl space-y-6">
                      <div className="flex items-center justify-between text-[#888886]">
                         <span className="text-[10px] font-black text-[#A0A09E] uppercase tracking-widest">{new Date(h.createdAt).toLocaleDateString()} // {new Date(h.createdAt).toLocaleTimeString()}</span>
                         <div className="flex items-center gap-3">
                            <span className="text-[9px] font-black uppercase tracking-widest px-3 py-1 bg-[#F5F5F3] rounded-lg border border-[#E0E0DE]">{h.mode}</span>
                            {h.lastFeedback && (
                                <div className={`p-1 rounded-full ${h.lastFeedback === 'accepted' ? 'bg-success/10 text-success' : 'bg-red-500/10 text-red-500'}`}>
                                   {h.lastFeedback === 'accepted' ? <CheckCircle size={14} /> : <X size={14} />}
                                </div>
                            )}
                         </div>
                      </div>
                      <p className="text-xl font-bold tracking-tight text-[#1A1A1A] italic uppercase line-clamp-2">
                         {h.outputJson?.recommendations?.[0] || 'Strategic Decision Record'}
                      </p>
                   </div>
                 )) : (
                   <div className="py-40 flex flex-col items-center justify-center text-[#E0E0DE] gap-6 opacity-40">
                      <History size={60} strokeWidth={1} />
                      <span className="text-[11px] font-black uppercase tracking-[0.4em]">Registry Archive Empty</span>
                   </div>
                 )}
               </div>
            </motion.div>
          )}

          {activeTab === 'system' && (
            <motion.div key="system" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-16 pb-32">
               <header className="flex flex-col gap-4">
                  <div className="flex items-center gap-3 text-[#A0A09E]">
                     <Shield className="w-4 h-4" />
                     <span className="text-[11px] font-black uppercase tracking-[0.4em]">System_Integrity_Index</span>
                  </div>
                  <h2 className="text-5xl font-black tracking-tighter uppercase italic">Control</h2>
               </header>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                  <div className="space-y-8">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#888886] border-b border-[#F0F0EE] pb-4">Automation Fabric</h3>
                     <div className="space-y-4">
                        {[
                           { label: 'Neural Ingestion', status: 'ACTIVE', color: 'success' },
                           { label: 'Semantic Bridge', status: 'LOCKED', color: 'accent' },
                           { label: 'Legacy Sync', status: 'IDLE', color: '#A0A09E' }
                        ].map((m, i) => (
                           <div key={i} className="p-8 rounded-[2rem] bg-white border border-[#E0E0DE] flex items-center justify-between group hover:border-[#1A1A1A] transition-all">
                              <span className="text-xs font-black uppercase tracking-widest">{m.label}</span>
                              <div className="flex items-center gap-3">
                                 <span className="text-[9px] font-black tracking-widest text-[#A0A09E]">{m.status}</span>
                                 <div className={`w-2 h-2 rounded-full ${m.status === 'ACTIVE' || m.status === 'LOCKED' ? 'bg-success animate-pulse' : 'bg-[#E0E0DE]'}`} />
                              </div>
                           </div>
                        ))}
                     </div>
                  </div>

                  <div className="space-y-8">
                     <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-[#888886] border-b border-[#F0F0EE] pb-4">Engine Health</h3>
                     <div className="space-y-4">
                        {health ? [
                           { l: 'MemPackets', v: health.metrics?.total_memory_packets || 0, s: 'Synced' },
                           { l: 'L2 Fallbacks', v: health.metrics?.semantic_fallbacks || 0, s: health.metrics?.semantic_fallbacks < 10 ? 'Optimal' : 'Checking' },
                           { l: 'L4 Variance', v: '0.05', s: 'Verified' }
                        ].map((m, i) => (
                           <div key={i} className="p-8 rounded-[2rem] bg-white border border-[#E0E0DE] flex flex-col gap-2">
                              <header className="flex items-center justify-between">
                                 <span className="text-[10px] font-black uppercase tracking-widest text-[#A0A09E]">{m.l}</span>
                                 <span className="text-[9px] font-black uppercase text-success">{m.s}</span>
                              </header>
                              <span className="text-3xl font-black italic">{m.v}</span>
                           </div>
                        )) : (
                           <div className="p-20 flex items-center justify-center text-[#E0E0DE] animate-spin"><RefreshCw size={30} /></div>
                        )}
                     </div>
                  </div>
               </div>
            </motion.div>
          )}

        </AnimatePresence>
      </main>

      {/* Porcelain Navigation Dock: PWA Optimized */}
      <nav className="fixed bottom-0 sm:bottom-10 left-0 sm:left-1/2 sm:-translate-x-1/2 z-[100] w-full sm:w-auto px-4 sm:px-3 py-6 sm:py-2 bg-white/90 backdrop-blur-3xl border-t sm:border border-[#E0E0DE] sm:rounded-[2.5rem] shadow-3xl flex items-center justify-around sm:justify-start sm:gap-1 safe-navbar">
          {[
            { id: 'home', icon: Command, label: 'Console' },
            { id: 'stream', icon: Activity, label: 'Pulse' },
            { id: 'content', icon: FileText, label: 'Output' },
            { id: 'history', icon: History, label: 'Registry' },
            { id: 'system', icon: Shield, label: 'System' },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = activeTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id as Tab)}
                className={`group relative flex flex-col items-center gap-1 px-4 sm:px-6 py-4 sm:rounded-[2rem] transition-all touch-manipulation ${
                  isActive ? 'text-accent sm:bg-black sm:text-white' : 'text-[#888886] hover:text-[#1A1A1A] sm:hover:bg-[#F5F5F3]'
                }`}
              >
                <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="sm:w-5 sm:h-5" />
                <span className={`text-[8px] sm:text-[9px] font-black uppercase tracking-widest sm:hidden ${isActive ? 'text-black' : 'text-[#A0A09E]'}`}>{t.label}</span>
                <span className={`hidden sm:block absolute -top-12 left-1/2 -translate-x-1/2 px-4 py-2 bg-black text-white text-[9px] font-black rounded-lg uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap`}>
                  {t.label}
                </span>
              </button>
            );
          })}
      </nav>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E0E0DE; border-radius: 20px; }
        
        @font-face {
          font-family: 'Inter';
          src: url('https://rsms.me/inter/font-files/Inter-Roman.var.woff2?v=3.19') format('woff2');
        }

        .safe-navbar {
          padding-bottom: calc(max(env(safe-area-inset-bottom), 16px) + 8px);
        }

        .glass-panel {
           background: rgba(255, 255, 255, 0.7);
           backdrop-filter: blur(20px);
        }
      `}</style>
    </div>
  );
}
