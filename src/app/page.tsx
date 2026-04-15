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

const SYSTEM_STATS = [
  { label: 'VAULT_STATE', value: 'UNILATERAL', icon: ShieldCheck, color: 'text-success' },
  { label: 'BLOB_OPS', value: '15/2K', icon: Database, color: 'text-accent' },
  { label: 'LOGIC_SYNC', value: '98%', icon: Zap, color: 'text-warning' },
];

export default function IdentityPrismWorkspace() {
  const [currentView, setCurrentView] = useState<ViewMode>('dashboard');
  const [selectedIndustry, setSelectedIndustry] = useState<string | null>(null);
  const [searchMode, setSearchMode] = useState<'MMR' | 'Vector'>('MMR');
  const [temp, setTemp] = useState(0.8);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
    <div className="min-h-screen bg-primary text-text-primary flex flex-col selection:bg-accent/30 transition-colors">
      <ToastContainer 
        position="bottom-right" 
        theme="dark" 
        toastClassName="!bg-secondary !border !border-primary !rounded-2xl !backdrop-blur-3xl !text-text-primary" 
      />
      
      {/* Background Interactivity */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0" aria-hidden="true">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="absolute -top-[20%] -right-[10%] w-[80vw] h-[80vh] bg-accent/5 rounded-full blur-[120px]" />
        <div className="scanline" />
      </div>

      <StatusHUD 
        stats={SYSTEM_STATS} 
        currentView={currentView} 
        onViewChange={setCurrentView} 
      />

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Responsive Sidebar */}
        <aside
          className={`border-r border-primary flex flex-col items-center py-8 gap-8 bg-secondary/80 backdrop-blur-xl shrink-0 transition-all duration-300 ${sidebarOpen ? 'w-[var(--sidebar-width)]' : 'w-14'}`}
          role="navigation"
          aria-label="Workspace controls"
        >
           <button
             className="p-2 rounded-lg text-text-tertiary hover:text-text-primary transition-colors focus-ring"
             onClick={() => setSidebarOpen((v) => !v)}
             aria-label="Toggle sidebar"
             aria-expanded={sidebarOpen}
           >
             <Command size={18} />
           </button>
           <button 
             className="p-3 rounded-2xl bg-accent/10 text-accent hover:scale-110 active:scale-95 transition-all focus-ring"
             aria-label="New cognitive thread"
           >
              <Plus size={24} />
           </button>
           
           <div className="flex flex-col gap-6 text-text-tertiary">
              <button className="p-2 hover:text-text-primary transition-colors focus-ring" aria-label="Command indexing"><Command size={20} /></button>
              <button className="p-2 hover:text-text-primary transition-colors focus-ring" aria-label="Neural search"><Search size={20} /></button>
              <button className="p-2 hover:text-text-primary transition-colors focus-ring" aria-label="Notifications"><Bell size={20} /></button>
              <button className="p-2 hover:text-text-primary transition-colors focus-ring" aria-label="Profile context"><User size={20} /></button>
           </div>

           <div className="mt-auto flex flex-col gap-4 items-center mb-4">
              <ThemeToggle />
              <button className="p-2 text-text-tertiary hover:text-text-primary transition-colors focus-ring" aria-label="Settings"><Settings size={20} /></button>
              <button 
                onClick={() => setShowAudit(true)}
                className="p-2 text-text-tertiary hover:text-danger transition-colors focus-ring"
                aria-label="System diagnostic audit"
              >
                 <Power size={20} />
              </button>
           </div>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar relative p-[var(--space-page)] flex flex-col" role="main">
          <div className="max-w-[1200px] mx-auto w-full space-y-[var(--space-2xl)] pb-32">
            <AnimatePresence mode="wait">
              {currentView === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                  className="space-y-[var(--space-2xl)]"
                >
                  {!selectedIndustry && (
                    <div className="space-y-[var(--space-xl)]">
                       <ProfileHeader />
                       <IdentityPillars />
                    </div>
                  )}

                  <IndustryBento 
                    selected={selectedIndustry || undefined} 
                    onSelect={setSelectedIndustry} 
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-[var(--space-lg)]">
                    <div className="lg:col-span-8 space-y-[var(--space-xl)]">
                      {/* Interaction Core */}
                      <section className="space-y-6">
                         <div className="flex items-center justify-between px-2 pb-2 border-b border-primary">
                           <div className="flex items-center gap-3">
                              <h3 className="text-sm font-semibold tracking-wide text-text-primary flex items-center gap-2">
                                <Terminal size={14} className="text-accent" /> Memory Sync Core {selectedIndustry && `// ${selectedIndustry.toUpperCase()}`}
                              </h3>
                              <span className="px-2 py-0.5 rounded-full bg-success/10 border border-success/20 text-xs font-semibold text-success tracking-wide">
                                 RAG_ACTIVE
                              </span>
                           </div>
                           {messages.length > 0 && (
                             <button onClick={() => setMessages([])} className="text-xs font-semibold text-danger/80 hover:text-danger transition-all tracking-wide bg-danger/5 px-2 py-1 rounded border border-danger/10 focus-ring">
                                Wipe Context
                             </button>
                           )}
                         </div>

                         <div className="glass-panel rounded-[2rem] min-h-[50vh] flex flex-col p-8 relative overflow-hidden transition-all group focus-within:ring-1 focus-within:ring-accent/30" aria-live="polite">
                            <AnimatePresence mode="popLayout">
                              {messages.length === 0 ? (
                                <motion.div 
                                  initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                                  className="flex flex-col items-center justify-center flex-1 text-center py-20"
                                >
                                  <Brain size={64} className="text-text-tertiary/20 mb-6" />
                                  <h2 className="text-xl font-medium text-text-primary mb-2">Initialize Neural Recall</h2>
                                  <p className="text-sm font-medium text-text-tertiary tracking-wide">Awaiting logic spark...</p>
                                </motion.div>
                              ) : (
                                <div className="space-y-12 relative z-10">
                                  {messages.map((m) => (
                                    <div 
                                      key={m.id}
                                      className={`flex gap-6 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                                    >
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border transition-all ${
                                        m.role === 'user' 
                                          ? 'bg-accent/10 border-accent/20 text-accent shadow-lg shadow-accent/5' 
                                          : 'bg-tertiary border-primary text-text-tertiary'
                                      }`}>
                                        {m.role === 'user' ? <User size={18} /> : <Brain size={18} />}
                                      </div>
                                      <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-6 rounded-2xl text-sm leading-relaxed ${
                                          m.role === 'user' 
                                          ? 'bg-secondary border border-primary text-text-primary rounded-tr-none' 
                                          : 'bg-elevated border border-primary text-text-secondary rounded-tl-none'
                                        }`}>
                                          {m.role !== 'user' ? highlightKeywords(m.content) : m.content}
                                        </div>
                                        <span className="text-xs mt-3 font-mono text-text-disabled">
                                          {m.role === 'user' ? 'SIGNAL_IN' : 'SYNC_OUT'}{' // '}{new Date().toLocaleTimeString()}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                  {isLoading && (
                                    <div className="flex gap-6 animate-pulse">
                                      <div className="w-10 h-10 rounded-xl bg-tertiary border border-primary flex items-center justify-center">
                                         <RefreshCcw size={14} className="text-accent animate-spin" />
                                      </div>
                                      <div className="space-y-3 w-[60%]">
                                         <div className="h-4 bg-tertiary rounded-full w-1/3" />
                                         <div className="h-12 bg-tertiary rounded-2xl w-full" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                         </div>
                      </section>

                      <VentureVault selectedIndustry={selectedIndustry || undefined} />
                    </div>

                    {/* Right Panel */}
                    <aside className="lg:col-span-4 space-y-[var(--space-lg)]" role="complementary">
                       <VoiceIngestion />
                       
                       <div className="glass-panel p-8 rounded-2xl flex flex-col gap-6">
                          <h4 className="text-sm font-semibold tracking-wide text-accent flex items-center justify-between">
                            SYSTEM_HEALTH <Activity size={14} className={isLoading ? "animate-pulse" : ""} />
                          </h4>
                          <div className="space-y-6">
                             {[
                                { label: 'Vector Index', val: auditReport?.report?.sectors?.vector_engine?.status === 'SYNCHRONIZED' ? 'OK' : 'SYNC', color: 'bg-success', pct: auditReport?.report?.sectors?.vector_engine?.status === 'SYNCHRONIZED' ? 100 : 30 },
                                { label: 'Node Density', val: '4.2k', color: 'bg-accent', pct: 92 },
                                { label: 'Link Strength', val: '98%', color: 'bg-success', pct: 98 },
                             ].map((sys) => (
                               <div key={sys.label} className="space-y-2">
                                  <div className="flex justify-between text-xs font-semibold text-text-tertiary">
                                     <span>{sys.label}</span>
                                     <span className="text-text-secondary">{sys.val}</span>
                                  </div>
                                  <div className="h-1 w-full bg-tertiary rounded-full overflow-hidden p-[1px] border border-primary">
                                     <motion.div initial={{ width: 0 }} animate={{ width: `${sys.pct}%` }} className={`h-full ${sys.color} opacity-60 rounded-full`} />
                                  </div>
                                </div>
                              ))}
                          </div>

                          <div className="pt-4 border-t border-primary flex items-center justify-between">
                             <span className="text-xs font-semibold text-text-tertiary">RAG_STATUS: {auditReport?.report?.sectors?.intelligence?.status || 'IDLE'}</span>
                             <button onClick={() => setShowAudit(true)} className="p-2 rounded-lg bg-tertiary text-text-tertiary hover:text-accent transition-colors focus-ring" aria-label="Open diagnostics">
                               <Settings size={14} />
                             </button>
                          </div>
                       </div>

                       <button className="w-full p-8 rounded-2xl border-2 border-dashed border-primary bg-secondary/20 hover:bg-secondary/40 hover:border-accent/40 transition-all group flex flex-col items-center justify-center text-center gap-4 focus-ring">
                          <Plus size={24} className="text-text-disabled group-hover:text-accent group-hover:rotate-90 transition-all duration-500" />
                          <span className="text-xs font-semibold text-text-tertiary tracking-wide group-hover:text-text-secondary">Initialize New Vector</span>
                       </button>
                    </aside>
                  </div>
                </motion.div>
              )}

              {/* Other views omitted for brevity, adding similar logic as dashboard */}
              {currentView === 'vault' && <motion.div key="vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><VentureVault selectedIndustry={selectedIndustry || undefined} /></motion.div>}
              {currentView === 'publications' && <motion.div key="pubs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><PublishedWorks /></motion.div>}
              {currentView === 'inspiration' && <motion.div key="insp" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><InspirationHub /></motion.div>}
              {currentView === 'jobs' && <motion.div key="jobs" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><JobSearchAgent /></motion.div>}
              {currentView === 'activity' && <motion.div key="acts" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><ActivityLog /></motion.div>}
              {currentView === 'connections' && <motion.div key="conn" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><NeuralConnections /></motion.div>}
            </AnimatePresence>
          </div>

          {/* Fixed Input Dock */}
          <AnimatePresence>
            {currentView === 'dashboard' && (
              <motion.section 
                initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
                className="fixed bottom-0 left-[var(--sidebar-width)] right-0 p-8 bg-gradient-to-t from-primary via-primary/95 to-transparent z-[55]"
              >
              <div className="max-w-3xl mx-auto">
                <form onSubmit={sendQuery} className="group relative bg-secondary border border-primary rounded-3xl shadow-3xl overflow-hidden focus-within:border-accent/50 transition-all duration-300">
                  <div className="flex items-center px-6 py-2 border-b border-primary bg-tertiary/50">
                    <div className="flex items-center gap-4 text-xs font-semibold text-text-tertiary tracking-wide">
                      <span className="flex items-center gap-2"><RefreshCcw size={12} className="animate-spin text-accent" /> SYST_SYNC: ACTIVE</span>
                      <span className="flex items-center gap-2 border-l border-primary pl-4">MODE: {searchMode}</span>
                    </div>
                  </div>

                  <div className="p-2">
                    <label htmlFor="query-input" className="sr-only">Cognitive Query</label>
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
                      placeholder="INITIATE_COGNITIVE_QUERY..."
                      className="w-full h-24 p-4 bg-transparent text-lg font-medium text-text-primary placeholder:text-text-disabled focus:outline-none resize-none scrollbar-hide"
                    />
                  </div>

                  <div className="px-6 py-4 flex items-center justify-between border-t border-primary bg-tertiary/20">
                    <button 
                      type="submit"
                      disabled={isLoading || input.trim() === ''}
                      className="ml-auto px-8 py-2.5 rounded-xl font-semibold text-sm tracking-wide transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-accent text-primary hover:bg-accent/80 focus-ring"
                    >
                      {isLoading ? 'EXECUTING...' : 'INITIATE SYNC'}
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
