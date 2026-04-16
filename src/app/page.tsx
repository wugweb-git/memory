"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, User, Terminal, Plus, Search, 
  Bell, Command, Settings, Power, RefreshCcw, X, 
  Activity, ShieldCheck, Database, Zap
} from 'lucide-react';
import { useChat } from 'ai/react';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// System Components
import { StatusHUD, ViewMode } from './component/StatusHUD';
import { KnowledgeSource } from './component/KnowledgeSource';
import { VentureVault } from './component/VentureVault';
import { NeuralConnections } from './component/NeuralConnections';
import { ActivityLog } from './component/ActivityLog';
import { PublishedWorks } from './component/PublishedWorks';
import { JobSearchAgent } from './component/JobSearchAgent';
import { IndustryBento } from './component/IndustryBento';
import { VoiceIngestion } from './component/VoiceIngestion';
import { IdentityPillars } from './component/IdentityPillars';
import { InspirationHub } from './component/InspirationHub';
import { ProfileHeader } from './component/ProfileHeader';
import { ThemeToggle } from './component/ThemeToggle';
import { BlobBuffer } from './component/BlobBuffer';
import { ExperienceMatrix } from './component/ExperienceMatrix';
import { MemoryVault } from './component/MemoryVault';
import { JobPipeline } from './component/JobPipeline';

const SYSTEM_STATS = [
  { label: 'UPLINK_FLUX', value: '98.4%', icon: Zap, color: 'text-accent' },
  { label: 'NEURAL_DENSITY', value: '4.2k Nodes', icon: Brain, color: 'text-warning' },
  { label: 'MATRIX_INTEGRITY', value: 'NOMINAL', icon: ShieldCheck, color: 'text-success' },
];

export default function IdentityPrismWorkspace() {
  const [currentView, setCurrentView] = useState<ViewMode>('L3');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'MMR' | 'Vector'>('MMR');
  const [temp, setTemp] = useState(0.8);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [showAudit, setShowAudit] = useState(false);
  const [auditReport, setAuditReport] = useState<any>(null);

  const performAudit = async () => {
    setAuditReport(null);
    try {
      const res = await fetch('/api/memory/audit');
      const data = await res.json();
      setAuditReport(data);
    } catch (err) {
      toast.error('Audit Failure');
    }
  };

  useEffect(() => {
    if (showAudit) performAudit();
  }, [showAudit]);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat({
    body: { searchMode, temperature: temp },
    onError: (err) => {
        toast.error('System Link Failure: ' + (err.message || 'Check connection.'));
    }
  });

  const sendQuery = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim()) {
        toast.warning('Input required: Vector space is empty.');
        return;
    }
    handleSubmit(e);
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const highlightKeywords = (text: string) => {
    const keywords = ['AI', 'Fintech', 'Identity', 'UX', 'Spirit', 'Architecture', 'Prism', 'RAG', 'Vector'];
    const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'gi'));
    return parts.map((part, i) => 
      keywords.some(k => k.toLowerCase() === part.toLowerCase()) 
        ? <span key={i} className="text-accent font-bold">{part}</span> 
        : part
    );
  };

  return (
    <div className="min-h-screen bg-primary text-text-primary flex flex-col selection:bg-accent/30 transition-colors duration-1000">
      <ToastContainer 
        position="bottom-right" 
        theme="light" 
        toastClassName="!bg-secondary !border !border-primary !rounded-2xl !backdrop-blur-3xl !text-text-primary" 
      />
      
      {/* Background Interactivity */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="absolute top-[10%] left-[5%] w-[60vw] h-[60vh] bg-accent/5 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[10%] right-[5%] w-[40vw] h-[40vh] bg-accent/3 rounded-full blur-[120px]" />
        <div className="scanline" />
      </div>

      <StatusHUD 
        stats={SYSTEM_STATS} 
        currentView={currentView} 
        onViewChange={setCurrentView} 
      />

      <div className="flex-1 flex overflow-hidden relative z-10">
        <main className="flex-1 overflow-y-auto custom-scrollbar relative flex flex-col pt-8" role="main">
          <div className="max-w-[1400px] mx-auto w-full px-[var(--space-page)] space-y-[var(--space-2xl)] pb-40">
            <AnimatePresence mode="wait">
              {/* L0: GENESIS — Intake Layer */}
              {currentView === 'L0' && (
                <motion.div 
                  key="L0"
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}
                  className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                >
                  <div className="lg:col-span-8 space-y-8">
                     <section className="glass-panel p-8 rounded-3xl border border-primary relative overflow-hidden">
                        <div className="flex items-center justify-between mb-8">
                           <div className="space-y-1 kinetic-text">
                              <h3 className="text-xl font-black tracking-tight uppercase italic">Cognitive Intake Panel</h3>
                              <p className="text-xs font-mono text-text-tertiary font-bold">LAYER_0 // UNSTRUCTURED_INGRESS</p>
                           </div>
                           <Activity className="text-accent animate-pulse" size={20} />
                        </div>
                        <VoiceIngestion />
                     </section>
                     <ActivityLog />
                  </div>
                  <div className="lg:col-span-4 space-y-8">
                     <InspirationHub />
                     <section className="glass-panel p-6 rounded-2xl border border-primary">
                        <h4 className="text-xs font-black tracking-widest text-accent mb-4 uppercase">Capture Sources</h4>
                        <KnowledgeSource />
                     </section>
                  </div>
                </motion.div>
              )}

              {/* L1: MEMORY — Storage Layer */}
              {currentView === 'L1' && (
                <motion.div 
                  key="L1"
                  initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.02 }}
                  className="space-y-8"
                >
                  <MemoryVault />
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                     <BlobBuffer />
                     <VentureVault selectedIndustry={selectedIndustry || undefined} />
                  </div>
                </motion.div>
              )}

              {/* L2: LOGIC — Processing Layer */}
              {currentView === 'L2' && (
                <motion.div 
                  key="L2"
                  initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                  className="space-y-8"
                >
                  <ExperienceMatrix selectedIndustry={selectedIndustry || undefined} />
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                     <div className="lg:col-span-12">
                        <NeuralConnections />
                     </div>
                  </div>
                </motion.div>
              )}

              {/* L3: IDENTITY — Synthesis Layer (Digital Twin) */}
              {currentView === 'L3' && (
                <motion.div 
                  key="L3"
                  initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }}
                  className="space-y-16"
                >
                  <div className="space-y-12">
                     <ProfileHeader />
                     <div className="kinetic-text">
                        <IdentityPillars />
                     </div>
                  </div>

                  <section className="space-y-6">
                    <h2 className="text-[10px] font-black uppercase tracking-[0.4em] text-text-tertiary ml-2 kinetic-text">Sector_Synthesis</h2>
                    <IndustryBento 
                      selected={selectedIndustry || undefined} 
                      onSelect={setSelectedIndustry} 
                    />
                  </section>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-8 space-y-10">
                      {/* Interaction Core / Digital Twin Chat */}
                      <section className="space-y-8">
                         <div className="flex items-center justify-between px-4 pb-4 border-b border-border-secondary">
                           <div className="flex items-center gap-4">
                              <h3 className="text-xs font-black tracking-[0.3em] text-text-primary flex items-center gap-4 uppercase kinetic-text">
                                <Brain size={18} className="text-accent" /> Neural Sync Interface
                              </h3>
                              <div className="w-2 h-2 rounded-full bg-success animate-ping" />
                           </div>
                           {messages.length > 0 && (
                             <button onClick={() => setMessages([])} className="text-[10px] font-black text-danger/60 hover:text-danger tracking-widest bg-danger/5 px-3 py-1.5 rounded-full border border-danger/10 uppercase transition-all hover:bg-danger/10">
                                Wipe Neural Context
                             </button>
                           )}
                         </div>

                         <div className="glass-panel rounded-radius-2xl min-h-[60vh] flex flex-col p-12 relative overflow-hidden transition-all duration-700 group border-white/5 focus-within:border-accent/40 shadow-3xl">
                            <AnimatePresence mode="popLayout">
                              {messages.length === 0 ? (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                                  className="flex flex-col items-center justify-center flex-1 text-center py-20"
                                >
                                  <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mb-10 border border-accent/20 shadow-[0_0_50px_rgba(0,170,255,0.1)]">
                                     <Sparkles size={40} className="text-accent" />
                                  </div>
                                  <h2 className="text-4xl font-black text-text-primary mb-4 italic tracking-tighter kinetic-text">Prism Awakens</h2>
                                  <p className="text-xs font-bold text-text-tertiary tracking-[0.3em] uppercase opacity-40">Awaiting semantic ignition</p>
                                </motion.div>
                              ) : (
                                <div className="space-y-16 relative z-10">
                                  {messages.map((m) => (
                                    <motion.div 
                                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                      key={m.id}
                                      className={`flex gap-10 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                                    >
                                      <div className={`w-14 h-14 rounded-3xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                                        m.role === 'user' 
                                          ? 'bg-accent/10 border-accent/40 text-accent shadow-[0_0_30px_rgba(0,170,255,0.2)]' 
                                          : 'bg-bg-secondary border-border-primary text-text-tertiary shadow-2xl'
                                      }`}>
                                        {m.role === 'user' ? <User size={26} /> : <Brain size={26} />}
                                      </div>
                                      <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-10 rounded-radius-2xl text-lg font-medium leading-relaxed shadow-3xl ${
                                          m.role === 'user' 
                                          ? 'bg-bg-secondary border-2 border-border-primary text-text-primary rounded-tr-none' 
                                          : 'bg-bg-elevated border-2 border-border-primary text-text-primary rounded-tl-none backdrop-blur-3xl'
                                        }`}>
                                          <div className="kinetic-text">
                                            {m.role !== 'user' ? highlightKeywords(m.content) : m.content}
                                          </div>
                                        </div>
                                        <span className="text-[10px] mt-6 font-black font-mono text-text-disabled uppercase tracking-[0.25em] opacity-50 kinetic-text">
                                          {m.role === 'user' ? 'UPLINK_STABLE' : 'TWIN_REFLEX'}{' // '}{new Date().toLocaleTimeString()}
                                        </span>
                                      </div>
                                    </motion.div>
                                  ))}
                                  {isLoading && (
                                    <div className="flex gap-10 animate-pulse">
                                      <div className="w-14 h-14 rounded-3xl bg-bg-secondary border-2 border-border-primary flex items-center justify-center">
                                         <RefreshCcw size={22} className="text-accent animate-spin" />
                                      </div>
                                      <div className="space-y-5 w-[70%]">
                                         <div className="h-5 bg-bg-elevated rounded-full w-1/4" />
                                         <div className="h-24 bg-bg-elevated rounded-radius-xl w-full" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                            
                            {/* Decorative Corner Gradients */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[60px] pointer-events-none" />
                            <div className="absolute bottom-0 left-0 w-32 h-32 bg-accent/5 blur-[60px] pointer-events-none" />
                         </div>
                      </section>
                    </div>

                    <aside className="lg:col-span-4 space-y-8" role="complementary">
                       <PublishedWorks />
                       <JobPipeline />
                       <div className="glass-panel p-8 rounded-[2rem] border border-primary space-y-6">
                           <h4 className="text-xs font-black tracking-[0.2em] text-accent uppercase flex items-center justify-between">
                             System Matrix <Activity size={14} className={isLoading ? "animate-pulse" : ""} />
                           </h4>
                           <div className="space-y-6">
                              {[
                                 { label: 'Layer Sync', val: '99.2%', color: 'bg-accent', pct: 99 },
                                 { label: 'Twin Alignment', val: '84.5%', color: 'bg-success', pct: 84 },
                                 { label: 'Cache Depth', val: '12.4GB', color: 'bg-warning', pct: 45 },
                              ].map((sys) => (
                                <div key={sys.label} className="space-y-3">
                                   <div className="flex justify-between text-[10px] font-black text-text-tertiary uppercase tracking-widest">
                                      <span>{sys.label}</span>
                                      <span className="text-text-primary">{sys.val}</span>
                                   </div>
                                   <div className="h-1.5 w-full bg-primary rounded-full overflow-hidden p-[1px] border border-primary shadow-inner">
                                      <motion.div initial={{ width: 0 }} animate={{ width: `${sys.pct}%` }} className={`h-full ${sys.color} opacity-80 rounded-full shadow-[0_0_8px_rgba(255,255,255,0.2)]`} />
                                   </div>
                                 </div>
                               ))}
                           </div>
                       </div>
                    </aside>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Fixed Input Dock — Only in Identity View */}
          <AnimatePresence>
            {currentView === 'L3' && (
              <motion.section 
                initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 200, opacity: 0 }}
                className="fixed bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent z-[55] pointer-events-none"
              >
              <div className="max-w-4xl mx-auto pointer-events-auto">
                <form onSubmit={sendQuery} className="group relative glass-panel rounded-radius-2xl border-white/5 focus-within:border-accent/50 transition-all duration-700 shadow-3xl">
                  <div className="flex items-center px-10 py-4 border-b border-border-secondary bg-white/[0.02]">
                    <div className="flex items-center gap-8 text-[10px] font-black text-text-tertiary tracking-[0.3em] uppercase kinetic-text">
                      <span className="flex items-center gap-2"><RefreshCcw size={14} className="animate-spin text-accent" /> Uplink: Quantum_Stable</span>
                      <span className="flex items-center gap-2 border-l border-border-secondary pl-8">Core: Neural_Prism_v4 // MMR_Sync</span>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="rounded-radius-xl border border-border-secondary bg-bg-primary/40 px-8 py-6 flex items-start gap-6 shadow-inner transition-all focus-within:bg-bg-primary/60">
                      <Search size={26} className="mt-4 text-text-disabled shrink-0" aria-hidden="true" />
                      <textarea 
                        id="query-input"
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!isLoading && input.trim() !== '') sendQuery(e as any);
                          }
                        }}
                        placeholder="Pose a cognitive query to the Digital Twin..."
                        className="w-full h-28 p-2 bg-transparent text-xl font-bold text-text-primary placeholder:text-text-disabled placeholder:italic focus:outline-none resize-none scrollbar-hide kinetic-text"
                      />
                    </div>
                  </div>

                  <div className="px-10 py-8 flex items-center justify-between border-t border-border-secondary bg-white/[0.02]">
                    <div className="flex gap-6">
                       <button type="button" className="p-4 rounded-2xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-accent transition-all group hover:scale-110">
                          <Plus size={22} className="group-hover:rotate-90 transition-transform duration-500" />
                       </button>
                    </div>
                    <button 
                      type="submit"
                      disabled={isLoading || input.trim() === ''}
                      className="px-12 py-4 rounded-2xl font-black text-xs tracking-[0.2em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-accent text-bg-primary hover:bg-accent-high hover:scale-105 active:scale-95 shadow-2xl shadow-accent/40 kinetic-text"
                    >
                      {isLoading ? 'EXECUTING_SYNC...' : 'INITIATE_NEURAL_SYNAPSE'}
                    </button>
                  </div>
                </form>
              </div>
              </motion.section>
            )}
          </AnimatePresence>
        </main>
      </div>

      {/* Audit Modal */}
      <AnimatePresence>
        {showAudit && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-primary/90 backdrop-blur-md"
            role="dialog" aria-labelledby="audit-title"
          >
            <div className="glass-panel w-full max-w-xl p-8 rounded-3xl border border-primary shadow-3xl relative overflow-hidden">
               <div className="flex items-center justify-between mb-8">
                  <div className="space-y-1">
                     <h2 id="audit-title" className="text-xl font-semibold text-text-primary tracking-tight">System Audit</h2>
                     <p className="text-xs font-mono text-text-tertiary tracking-wide">DIAGNOSTICS_v4.2</p>
                  </div>
                  <button onClick={() => setShowAudit(false)} className="p-2 rounded-xl bg-tertiary border border-primary text-text-tertiary hover:text-text-primary transition-all focus-ring" aria-label="Close audit">
                     <X size={20} />
                  </button>
               </div>

               <div className="space-y-4">
                  {!auditReport ? (
                    <div className="py-12 flex flex-col items-center justify-center gap-4">
                       <RefreshCcw size={32} className="text-accent animate-spin" />
                       <span className="text-sm font-medium text-text-tertiary tracking-wide">Scanning layers...</span>
                    </div>
                  ) : (
                    <div className="space-y-3">
                       {Object.entries(auditReport.report.sectors).map(([sector, data]: [string, any]) => (
                         <div key={sector} className="p-4 rounded-xl bg-secondary border border-primary flex items-center justify-between">
                            <div className="flex items-center gap-4">
                               <ShieldCheck size={18} className={data.status === 'ONLINE' || data.status === 'SYNCHRONIZED' ? 'text-success' : 'text-danger'} />
                               <div className="text-left">
                                  <h4 className="text-sm font-semibold text-text-primary tracking-wide">{sector.replace('_', ' ')}</h4>
                                  <p className="text-xs text-text-tertiary font-medium">{data.note || 'Core Layer'}</p>
                               </div>
                            </div>
                            <span className={`text-xs font-semibold tracking-wide ${data.status === 'ONLINE' || data.status === 'SYNCHRONIZED' ? 'text-success' : 'text-danger'}`}>
                               {data.status}
                            </span>
                         </div>
                       ))}
                       <div className="pt-6 mt-6 border-t border-primary flex items-center justify-between">
                          <span className="text-xs font-mono text-text-disabled">ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                          <button onClick={performAudit} className="text-xs font-semibold text-accent hover:underline tracking-wide focus-ring">Re-run diagnostics</button>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
