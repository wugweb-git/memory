"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inter, JetBrains_Mono, Outfit } from 'next/font/google';
import { 
  Brain, Activity, ToggleLeft, ToggleRight, CheckCircle2, 
  AlertTriangle, FileText, X, ChevronRight, Zap, 
  Upload, Database, ShieldCheck, Sparkles, MessageSquare, 
  Cpu, Radar, Terminal, RefreshCcw, LayoutDashboard,
  Database as VaultIcon, Link as LinkIcon, History,
  FileEdit, Briefcase, Plus, Search, HelpCircle,
  Menu, Bell, ChevronDown, Command, Settings, User, Power
} from 'lucide-react';
import { useChat } from 'ai/react';

import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import Link from 'next/link';

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

const inter = Inter({ subsets: ['latin'] });
const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

// --- Mock Stats ---
const SYSTEM_STATS = [
  { label: 'VAULT_STATE', value: 'UNILATERAL', icon: ShieldCheck, color: 'text-emerald-500' },
  { label: 'BLOB_OPS', value: '15/2K', icon: Database, color: 'text-[#00E5FF]' },
  { label: 'LOGIC_SYNC', value: '98%', icon: Zap, color: 'text-amber-400' },
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
        console.error('Chat Error:', err);
        toast.error('System Link Failure: ' + (err.message || 'Check OpenAI/MongoDB configuration.'));
    },
    onResponse: (response) => {
        if (!response.ok) {
            toast.error(`Neural Overload: ${response.status} ${response.statusText}`);
        }
    }
  });

  const sendQuery = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) {
        toast.warning('Input required: Vector space is empty.');
        return;
    }
    handleSubmit(e);
  };

  const words = input.trim().split(/\s+/).filter(w => w.length > 0);
  const signalDensity = Math.min(100, words.length * 4);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const highlightKeywords = (text: string) => {
    const keywords = ['AI', 'Fintech', 'Identity', 'UX', 'Spirit', 'Architecture', 'Prism', 'RAG', 'Vector'];
    const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'gi'));
    return parts.map((part, i) => 
      keywords.some(k => k.toLowerCase() === part.toLowerCase()) 
        ? <span key={i} className="text-[#00E5FF] font-black">{part}</span> 
        : part
    );
  };

  return (
    <div className={`min-h-screen bg-[#030303] text-zinc-100 flex flex-col selection:bg-[#00E5FF]/30 selection:text-white ${inter.className}`}>
      <ToastContainer position="bottom-right" theme="dark" hideProgressBar toastClassName="!bg-black !border !border-white/10 !rounded-2xl !backdrop-blur-3xl" />
      
      {/* Premium Background Layering */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-0 left-0 w-full h-full grid-bg opacity-40" />
        <div className="absolute top-[-20%] right-[-10%] w-[80%] h-[80%] bg-[#00E5FF]/5 rounded-full blur-[160px] animate-pulse-slow" />
        <div className="absolute bottom-[-20%] left-[-10%] w-[80%] h-[80%] bg-[#10B981]/5 rounded-full blur-[160px] animate-pulse-slow font-sans" />
        <div className="scanline" />
      </div>

      <StatusHUD 
        stats={SYSTEM_STATS} 
        currentView={currentView} 
        onViewChange={setCurrentView} 
      />

      <div className="flex-1 flex overflow-hidden relative z-10">
        {/* Sidebar Space: Minimized Navigation or Shortcuts */}
        <aside className="w-20 border-r border-white/[0.06] flex flex-col items-center py-10 gap-10 bg-black/40 backdrop-blur-xl">
           <div className="p-3 rounded-2xl bg-[#00E5FF]/10 text-[#00E5FF] shadow-2xl shadow-[#00E5FF]/5 cursor-pointer hover:scale-110 active:scale-95 transition-all">
              <Plus size={24} />
           </div>
           <div className="flex flex-col gap-8 text-zinc-600">
              <div className="group relative">
                <Command size={20} className="hover:text-[#00E5FF] cursor-pointer transition-colors" />
                <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-black border border-white/10 text-[8px] font-black text-[#00E5FF] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest whitespace-nowrap">CMD_INDEX</span>
              </div>
              <Search size={20} className="hover:text-white cursor-pointer transition-colors" />
              <Bell size={20} className="hover:text-white cursor-pointer transition-colors" />
              <User size={20} className="hover:text-[#10B981] cursor-pointer transition-colors" />
           </div>
           <div className="mt-auto flex flex-col gap-6 items-center">
              <Link href="/admin" className="p-3 text-zinc-700 hover:text-white transition-colors cursor-pointer">
                 <Settings size={20} />
              </Link>
              <div 
                onClick={() => setShowAudit(true)}
                className="p-3 text-zinc-700 hover:text-red-500 transition-colors cursor-pointer group relative"
              >
                 <Power size={20} />
                 <span className="absolute left-14 top-1/2 -translate-y-1/2 px-2 py-1 rounded bg-black border border-white/10 text-[8px] font-black text-red-500 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none uppercase tracking-widest whitespace-nowrap">SYS_AUDIT</span>
              </div>
           </div>
        </aside>

        <main className="flex-1 overflow-y-auto custom-scrollbar relative p-12 flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex-1 space-y-16">
            <AnimatePresence mode="wait">
              {currentView === 'dashboard' && (
                <motion.div 
                  key="dashboard"
                  initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -30 }}
                  className="space-y-16 pb-32"
                >
                  {/* Hero Intro: Identity Prism Header */}
                  {!selectedIndustry && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="pt-4 space-y-16">
                       <ProfileHeader />
                       <IdentityPillars />
                    </motion.div>
                  )}

                  {/* Principal Grid: 11 Clusters */}
                  <IndustryBento 
                    selected={selectedIndustry || undefined} 
                    onSelect={setSelectedIndustry} 
                  />

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
                    <div className="lg:col-span-2 space-y-16">
                      {/* Interaction Core: Active Console */}
                      <div className="space-y-8">
                         <div className="flex items-center justify-between px-4 pb-4 border-b border-white/[0.06]">
                           <div className="flex items-center gap-4">
                              <h3 className={`text-[12px] font-black tracking-[0.3em] text-white uppercase flex items-center gap-3 ${outfit.className}`}>
                                <Terminal size={14} className="text-[#00E5FF] animate-pulse" /> Memory Sync Core {selectedIndustry && `// FILTER: ${selectedIndustry.toUpperCase()}`}
                              </h3>
                              <div className="px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[8px] font-black text-emerald-500 uppercase tracking-widest italic">
                                 RAG_ACTIVE
                              </div>
                           </div>
                           {messages.length > 0 && (
                             <button onClick={() => setMessages([])} className="text-[10px] font-black text-red-500/60 hover:text-red-500 flex items-center gap-2 transition-all uppercase tracking-widest bg-red-500/5 px-2 py-1 rounded">
                               <X size={10} /> Wipe Context
                             </button>
                           )}
                         </div>

                         <div className="glass-panel rounded-3xl min-h-[500px] flex flex-col p-10 relative overflow-hidden ring-1 ring-white/10 group">
                            {/* Scanning Mesh Backdrop */}
                            <div className="absolute inset-0 bg-transparent grid-bg opacity-5 group-focus-within:opacity-10 transition-opacity" />
                            
                            <AnimatePresence mode="popLayout">
                              {messages.length === 0 ? (
                                <motion.div 
                                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
                                  className="flex flex-col items-center justify-center flex-1 text-center"
                                >
                                  <div className="relative mb-12">
                                    <div className="absolute -inset-12 bg-[#00E5FF]/10 rounded-full blur-3xl animate-pulse-slow"></div>
                                    <Brain size={80} className="text-[#00E5FF] opacity-30 animate-pulse" />
                                  </div>
                                  <h2 className={`text-3xl font-light tracking-tight text-white mb-6 ${outfit.className}`}>
                                    Initialize <span className="font-black underline decoration-[#00E5FF]/50 underline-offset-8">Neural Recall</span>
                                  </h2>
                                  <p className="text-zinc-500 max-w-sm mx-auto text-[11px] leading-relaxed uppercase tracking-[0.3em] font-black opacity-40">
                                    AWAITING_LOGIC_SPARK // DATA_NODES: {SYSTEM_STATS[0].value}
                                  </p>
                                </motion.div>
                              ) : (
                                <div className="space-y-16 relative z-10">
                                  {messages.map((m) => (
                                    <motion.div 
                                      key={m.id}
                                      initial={{ opacity: 0, y: 10, filter: 'blur(5px)' }} 
                                      animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                      className={`flex gap-8 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                                    >
                                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all ${
                                        m.role === 'user' 
                                          ? 'bg-[#00E5FF]/5 border-[#00E5FF]/30 text-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.1)]' 
                                          : 'bg-black border-white/[0.08] text-zinc-500 shadow-2xl'
                                      }`}>
                                        {m.role === 'user' ? <User size={20} /> : <Brain size={20} />}
                                      </div>
                                      <div className={`flex flex-col max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                                        <div className={`p-8 rounded-3xl text-[15px] leading-relaxed shadow-3xl ${
                                          m.role === 'user' 
                                          ? 'bg-[#0a0a0a]/90 border border-white/[0.08] text-white rounded-tr-none' 
                                          : 'bg-black/95 border border-white/[0.05] text-zinc-400 rounded-tl-none font-medium'
                                        }`}>
                                          {m.role !== 'user' ? highlightKeywords(m.content) : m.content}
                                        </div>
                                        <span className={`text-[9px] mt-4 font-black tracking-[0.2em] text-zinc-600 ${jetBrains.className} uppercase`}>
                                          {m.role === 'user' ? 'SIGNAL_IN' : 'ARCHIVED_RESPONSE'} // {new Date().toLocaleTimeString()}
                                        </span>
                                      </div>
                                    </motion.div>
                                  ))}
                                  {isLoading && (
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-8 px-4">
                                      <div className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                                         <RefreshCcw size={16} className="text-[#00E5FF] animate-spin" />
                                      </div>
                                      <div className="flex flex-col gap-3 w-full">
                                         <div className="h-4 w-1/4 bg-white/5 rounded-full animate-pulse" />
                                         <div className="h-20 w-[60%] rounded-3xl bg-white/5 animate-pulse" />
                                      </div>
                                    </motion.div>
                                  )}
                                </div>
                              )}
                            </AnimatePresence>
                            <div ref={messagesEndRef} />
                         </div>
                      </div>

                      {/* Deep Node: Venture Vault Mapping */}
                      <VentureVault selectedIndustry={selectedIndustry || undefined} />
                    </div>

                    {/* Right Panel: Sidecar Intelligence */}
                    <div className="space-y-12">
                       <VoiceIngestion />
                       
                       <div className="glass-panel p-10 rounded-3xl flex flex-col gap-8 relative overflow-hidden group">
                          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-[#00E5FF]/40 to-transparent opacity-50" />
                          <h4 className={`text-[11px] font-black tracking-[0.3em] text-[#00E5FF] flex items-center justify-between uppercase ${outfit.className}`}>
                            SYSTEM_HEALTH <Activity size={14} className={isLoading ? "animate-pulse" : ""} />
                          </h4>
                          <div className="space-y-10">
                             {[
                               { label: 'Vector Index Stability', val: auditReport?.report?.sectors?.vector_engine?.status || 'Syncing...', color: 'bg-emerald-500', pct: auditReport?.report?.sectors?.vector_engine?.status === 'SYNCHRONIZED' ? 100 : 20 },
                               { label: 'DB Logic Node Density', val: '4.2k Nodes', color: 'bg-[#00E5FF]', pct: 92 },
                               { label: 'Sync Connection Strength', val: auditReport?.report?.sectors?.database?.status || 'Initializing...', color: 'bg-[#10B981]', pct: auditReport?.report?.sectors?.database?.status === 'ONLINE' ? 100 : 15 },
                             ].map((sys) => (
                               <div key={sys.label} className="flex flex-col gap-4">
                                  <div className="flex justify-between items-center text-[10px] font-black text-zinc-600 tracking-widest uppercase italic">
                                     <span>{sys.label}</span>
                                     <span className={sys.pct > 80 ? 'text-[#10B981]' : 'text-zinc-500'}>{sys.val}</span>
                                  </div>
                                  <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden p-[1px] ring-1 ring-white/5">
                                     <motion.div 
                                      initial={{ width: 0 }}
                                      animate={{ width: `${sys.pct}%` }}
                                      className={`h-full ${sys.color} opacity-60 rounded-full transition-all duration-1000 ease-in-out`} 
                                     />
                                  </div>
                                </div>
                              ))}
                          </div>

                          <div className="pt-8 border-t border-white/[0.06] flex items-center justify-between">
                             <span className="text-[10px] font-black text-zinc-500 tracking-[0.2em] uppercase">RAG_STATUS: {auditReport?.report?.sectors?.intelligence?.status || 'IDLE'}</span>
                             <button onClick={() => setShowAudit(true)} className="p-2 rounded-xl bg-white/5 text-zinc-700 hover:text-[#00E5FF] transition-all">
                               <Settings size={14} />
                             </button>
                          </div>
                       </div>

                       <div className="p-10 rounded-3xl border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all cursor-crosshair group flex flex-col items-center justify-center text-center py-20">
                          <Plus size={32} className="text-zinc-800 mb-6 group-hover:text-[#00E5FF] transition-colors group-hover:rotate-90 duration-500" />
                          <p className={`text-[11px] font-black text-zinc-700 tracking-[0.3em] uppercase group-hover:text-zinc-500 transition-colors`}>
                             Initialize_New_Vector
                          </p>
                       </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {currentView === 'vault' && <motion.div key="vault" initial="initial" animate="animate" exit="exit" variants={variants}><VentureVault selectedIndustry={selectedIndustry || undefined} /></motion.div>}
              {currentView === 'publications' && <motion.div key="pubs" initial="initial" animate="animate" exit="exit" variants={variants}><PublishedWorks /></motion.div>}
              {currentView === 'inspiration' && <motion.div key="insp" initial="initial" animate="animate" exit="exit" variants={variants}><InspirationHub /></motion.div>}
              {currentView === 'jobs' && <motion.div key="jobs" initial="initial" animate="animate" exit="exit" variants={variants}><JobSearchAgent /></motion.div>}
              {currentView === 'activity' && <motion.div key="acts" initial="initial" animate="animate" exit="exit" variants={variants}><ActivityLog /></motion.div>}
              {currentView === 'connections' && <motion.div key="conn" initial="initial" animate="animate" exit="exit" variants={variants}><NeuralConnections /></motion.div>}
            </AnimatePresence>
          </div>

          {/* Fixed Input Dock */}
          <AnimatePresence>
            {currentView === 'dashboard' && (
              <motion.div 
                initial={{ y: 200 }} animate={{ y: 0 }} exit={{ y: 200 }}
                className="fixed bottom-0 left-20 right-0 p-12 bg-gradient-to-t from-[#030303] via-[#030303]/95 to-transparent z-[55]"
              >
              <div className="max-w-4xl mx-auto pb-6">
                <div className="relative group">
                  {/* Floating Selection Mesh */}
                  <div className={`absolute -inset-1 bg-gradient-to-r from-[#00E5FF]/20 to-[#10B981]/20 rounded-3xl blur-2xl opacity-0 group-focus-within:opacity-100 transition duration-1000`}></div>
                  
                  <form onSubmit={sendQuery} className="relative bg-black border border-white/10 rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.8)] overflow-hidden focus-within:border-[#00E5FF]/50 transition-all duration-500 ring-1 ring-white/5">
                    <div className="flex items-center px-8 py-3 border-b border-white/[0.06] bg-white/[0.03] backdrop-blur-xl">
                      <div className="flex items-center gap-6 text-[10px] font-black tracking-[0.3em] text-zinc-500 uppercase">
                        <span className="flex items-center gap-2"><RefreshCcw size={12} className="animate-spin-slow text-[#00E5FF]" /> SYST_SYNC: ACTIVE</span>
                        <span className="flex items-center gap-2 border-l border-white/5 pl-6">MODE: {searchMode}</span>
                      </div>
                      <div className="ml-auto flex items-center gap-4">
                        <div className="h-1.5 w-1.5 bg-[#00E5FF] rounded-full animate-pulse shadow-[0_0_8px_#00E5FF]" />
                      </div>
                    </div>

                    <div className="flex items-start p-3">
                      <textarea 
                        value={input}
                        onChange={handleInputChange}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            if (!isLoading && input.trim() !== '') sendQuery(e as any);
                          }
                        }}
                        placeholder="INITIATE_COGNITIVE_QUERY..."
                        className={`flex-1 h-32 p-6 bg-transparent text-xl font-medium text-white placeholder-zinc-800 focus:outline-none resize-none ${outfit.className}`}
                      />
                    </div>

                    <div className="px-10 py-5 flex items-center justify-between bg-white/[0.02] border-t border-white/[0.06]">
                      <div className="flex items-center gap-8">
                        <div className="flex flex-col gap-2">
                          <span className="text-[9px] font-black text-zinc-600 tracking-[0.3em] uppercase">Signal Strength</span>
                          <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden p-[1px]">
                            <motion.div animate={{ width: `${signalDensity}%` }} className={`h-full rounded-full transition-all duration-500 ${signalDensity > 50 ? 'bg-[#00E5FF] neon-glow-cyan' : 'bg-zinc-700'}`} />
                          </div>
                        </div>
                      </div>

                      <button 
                        type="submit"
                        disabled={isLoading || input.trim() === ''}
                        className={`px-10 py-3.5 rounded-2xl font-black text-[11px] tracking-[0.3em] uppercase transition-all duration-500 ${
                          isLoading || input.trim() === ''
                          ? 'bg-zinc-900/40 text-zinc-700 cursor-not-allowed border border-white/5'
                          : 'bg-[#111] border border-[#00E5FF]/40 text-[#00E5FF] hover:bg-[#00E5FF] hover:text-black shadow-[0_0_30px_rgba(0,229,255,0.2)] active:scale-95'
                        }`}
                      >
                        {isLoading ? 'EXECUTING...' : 'INITIATE SYNC'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Dynamic Sidebar Control: Intelligence Tuning */}
        <AnimatePresence>
          {sidebarOpen && (
            <motion.aside 
              initial={{ x: 500 }} animate={{ x: 0 }} exit={{ x: 500 }}
              className="w-[450px] border-l border-white/[0.06] bg-[#030303]/40 backdrop-blur-3xl p-10 flex flex-col gap-12 overflow-y-auto custom-scrollbar z-[56] shadow-[-20px_0_50px_rgba(0,0,0,0.5)]"
            >
              <KnowledgeSource />
              
              <div className="space-y-8 glass-panel p-10 rounded-3xl border-dashed border-white/10">
                 <h3 className={`text-[12px] font-black tracking-[0.3em] text-white flex items-center justify-between uppercase ${outfit.className}`}>
                   NEURAL_ORCHESTRATION <Cpu size={16} className="text-[#F59E0B]" />
                 </h3>
                 
                 <div className="space-y-10">
                   <div className="flex flex-col gap-4">
                     <span className="text-[10px] font-black text-zinc-500 tracking-[0.3em] uppercase">Retrieval Vector</span>
                     <div className="grid grid-cols-2 gap-3">
                        {['MMR', 'Vector'].map(mode => (
                         <button key={mode} onClick={() => setSearchMode(mode as any)}
                           className={`py-4 rounded-2xl text-[11px] font-black tracking-[0.3em] border transition-all duration-500 uppercase ${
                             searchMode === mode 
                               ? 'bg-[#00E5FF]/10 border-[#00E5FF]/40 text-[#00E5FF] shadow-[0_0_20px_rgba(0,229,255,0.1)]' 
                               : 'bg-transparent border-white/5 text-zinc-700 hover:border-white/20'
                           }`}
                         >
                           {mode}
                         </button>
                        ))}
                     </div>
                   </div>

                   <div className="flex flex-col gap-5 pt-10 border-t border-white/[0.06]">
                     <div className="flex justify-between items-center px-1">
                       <span className="text-[10px] font-black text-zinc-500 tracking-[0.3em] uppercase">Expansion Drift</span>
                       <span className={`text-[11px] font-black text-[#00E5FF] ${jetBrains.className}`}>{temp.toFixed(2)}</span>
                     </div>
                     <input 
                       type="range" min="0" max="1.5" step="0.1" value={temp} 
                       onChange={(e) => setTemp(parseFloat(e.target.value))}
                       className="w-full h-1 bg-white/5 rounded-lg appearance-none cursor-pointer accent-[#00E5FF]"
                     />
                   </div>
                 </div>
              </div>

              <div className="mt-auto">
                <div className="p-8 rounded-3xl border border-white/[0.08] bg-black shadow-inner relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />
                  <h4 className="text-[10px] font-black tracking-[0.3em] text-[#00E5FF] mb-5 uppercase">PRISM_SYSTEM_LOG</h4>
                  <div className={`space-y-3 ${jetBrains.className} text-[10px] text-zinc-500 leading-tight`}>
                    <p className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#10B981] rounded-full shadow-[0_0_5px_#10B981]" /> All sectors nominal</p>
                    <p className="flex items-center gap-3"><div className="w-1.5 h-1.5 bg-[#00E5FF] rounded-full animate-pulse shadow-[0_0_5px_#00E5FF]" /> Index: 04.14_LATEST_SYNC</p>
                    <p className="flex items-center gap-3 animate-pulse text-zinc-700"><div className="w-1.5 h-1.5 bg-zinc-800 rounded-full" /> Awaiting query stream...</p>
                  </div>
                </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* SYST_AUDIT Modal */}
      <AnimatePresence>
        {showAudit && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-2xl px-12"
          >
            <div className="glass-panel w-full max-w-2xl p-12 rounded-[3rem] border border-white/10 shadow-[0_0_100px_rgba(0,0,0,1)] relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/40 to-transparent opacity-50" />
               <div className="flex items-center justify-between mb-12">
                  <div className="space-y-1">
                     <h2 className="text-2xl font-black text-white uppercase tracking-tighter">Global_System_Audit</h2>
                     <p className={`text-[10px] ${jetBrains.className} text-zinc-600 uppercase tracking-widest`}>RUNNING_DIAGNOSTICS_v4.2</p>
                  </div>
                  <button onClick={() => setShowAudit(false)} className="w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-500 hover:text-white transition-all">
                     <X size={20} />
                  </button>
               </div>

               <div className="space-y-8">
                  {!auditReport ? (
                    <div className="py-20 flex flex-col items-center justify-center gap-6">
                       <RefreshCcw size={40} className="text-[#00E5FF] animate-spin" />
                       <span className={`text-[11px] font-black text-zinc-500 uppercase tracking-[0.3em] ${jetBrains.className}`}>Accessing Neural Layers...</span>
                    </div>
                  ) : (
                    <div className="space-y-6">
                       {Object.entries(auditReport.report.sectors).map(([sector, data]: [string, any]) => (
                         <div key={sector} className="p-6 rounded-2xl bg-black border border-white/5 flex items-center justify-between group hover:border-white/10 transition-all">
                            <div className="flex items-center gap-6">
                               <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${data.status === 'ONLINE' || data.status === 'SYNCHRONIZED' || data.status === 'OPTIMAL' || data.status === 'ACTIVE' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                  <ShieldCheck size={18} />
                               </div>
                               <div className="space-y-1 text-left">
                                  <h4 className="text-[12px] font-black text-white uppercase tracking-widest">{sector.replace('_', ' ')}</h4>
                                  <p className="text-[9px] text-zinc-600 font-medium tracking-wide uppercase italic">{data.note || data.provider || 'Core Layer'}</p>
                               </div>
                            </div>
                            <div className="flex items-center gap-4">
                               <span className={`text-[10px] font-black uppercase tracking-widest ${data.status === 'ONLINE' || data.status === 'SYNCHRONIZED' || data.status === 'OPTIMAL' || data.status === 'ACTIVE' ? 'text-emerald-500' : 'text-red-500'}`}>
                                  {data.status}
                               </span>
                            </div>
                         </div>
                       ))}
                       <div className="pt-8 mt-12 border-t border-white/[0.06] flex items-center justify-between">
                          <span className={`text-[9px] font-black text-zinc-700 tracking-[0.3em] uppercase ${jetBrains.className}`}>Report_ID: {Math.random().toString(36).substring(7).toUpperCase()}</span>
                          <button onClick={performAudit} className="px-6 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-black text-[#00E5FF] uppercase tracking-widest hover:border-[#00E5FF]/40 hover:bg-[#00E5FF]/5 transition-all">
                             Re-run Audit
                          </button>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <button 
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className={`fixed bottom-12 right-12 w-14 h-14 rounded-full bg-black border border-white/10 text-[#00E5FF] flex items-center justify-center shadow-2xl z-[70] hover:bg-[#00E5FF]/10 transition-all active:scale-95 duration-500 ${sidebarOpen ? 'neon-glow-cyan rotate-90' : ''}`}
      >
        <Radar size={24} className={isLoading ? 'animate-spin' : ''} />
      </button>

      <style dangerouslySetInnerHTML={{ __html: `
        .animate-spin-slow { animation: spin 4s linear infinite; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      ` }} />
    </div>
  );
}

const variants = {
  initial: { opacity: 0, y: 40, filter: 'blur(10px)' },
  animate: { opacity: 1, y: 0, filter: 'blur(0px)', transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] } },
  exit: { opacity: 0, y: -40, filter: 'blur(10px)', transition: { duration: 0.4 } }
};
