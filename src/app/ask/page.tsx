"use client";

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Brain, User, Search, 
  RefreshCcw, Sparkles, Send,
  Activity, ShieldCheck, Zap, Plus, ArrowUpRight
} from 'lucide-react';
import { useChat } from 'ai/react';
import NavBar from '../component/navbar';

const SYSTEM_STATS = [
  { label: 'UPLINK_FLUX', value: '98.4%', icon: Zap, color: 'text-accent' },
  { label: 'NEURAL_DENSITY', value: '4.2k Nodes', icon: Brain, color: 'text-warning' },
  { label: 'MATRIX_INTEGRITY', value: 'NOMINAL', icon: ShieldCheck, color: 'text-success' },
];

export default function AskNeuralInterface() {
  const { messages, input, handleInputChange, handleSubmit, isLoading, setMessages } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
    <div className="min-h-screen bg-bg-primary text-text-primary flex flex-col selection:bg-accent/30 transition-colors duration-1000">
      <NavBar />
      
      {/* Background Interactivity */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="absolute top-[10%] left-[5%] w-[60vw] h-[60vh] bg-accent/5 rounded-full blur-[150px]" />
        <div className="scanline" />
      </div>

      <main className="flex-1 flex flex-col pt-20 pb-48 relative z-10">
        <div className="max-w-5xl mx-auto w-full px-6 space-y-16">
          
          {/* Header Section */}
          <section className="space-y-6 text-center lg:text-left">
             <div className="flex items-center gap-4 text-accent mb-6 justify-center lg:justify-start">
                <Brain size={24} className="animate-pulse" />
                <span className="text-[11px] font-black uppercase tracking-[0.5em]">LAYER_3 // IDENTITY_SYNC</span>
             </div>
             <h1 className="text-6xl font-black italic tracking-tighter uppercase leading-[0.85] text-text-primary kinetic-text">
                Neural_Sync_Interface
             </h1>
             <p className="max-w-2xl text-lg font-medium text-text-tertiary italic leading-relaxed">
                Pose a cognitive query to the Digital Twin. Every synapse is grounded in your verified memory graph.
             </p>
          </section>

          {/* Chat Container */}
          <div className="glass-panel rounded-[3rem] min-h-[60vh] flex flex-col p-12 relative overflow-hidden group border-white/5 shadow-3xl">
             <AnimatePresence mode="popLayout">
               {messages.length === 0 ? (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                   className="flex flex-col items-center justify-center flex-1 text-center py-20"
                 >
                   <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mb-10 border border-accent/20 shadow-[0_0_50px_rgba(0,170,255,0.1)]">
                      <Sparkles size={40} className="text-accent" />
                   </div>
                   <h2 className="text-4xl font-black text-text-primary mb-4 italic tracking-tighter">Prism Awakens</h2>
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
                         <div className={`p-10 rounded-[2.5rem] text-lg font-medium leading-relaxed shadow-3xl ${
                           m.role === 'user' 
                           ? 'bg-bg-secondary border-2 border-border-primary text-text-primary rounded-tr-none' 
                           : 'bg-bg-elevated border-2 border-border-primary text-text-primary rounded-tl-none backdrop-blur-3xl'
                         }`}>
                           <div className="kinetic-text">
                             {m.role !== 'user' ? highlightKeywords(m.content) : m.content}
                           </div>
                         </div>
                         <span className="text-[10px] mt-6 font-black font-mono text-text-disabled uppercase tracking-[0.25em] opacity-50">
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
                          <div className="h-24 bg-bg-elevated rounded-[1.5rem] w-full" />
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
        </div>
      </main>

      {/* Neural Command Dock */}
      <motion.section 
        initial={{ y: 200, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent z-[55]"
      >
      <div className="max-w-4xl mx-auto">
        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(e); }} className="group relative glass-panel rounded-[2.5rem] border-white/5 focus-within:border-accent/50 transition-all duration-700 shadow-3xl overflow-hidden">
          <div className="flex items-center px-10 py-5 border-b border-border-secondary bg-white/[0.02]">
            <div className="flex items-center gap-8 text-[10px] font-black text-text-tertiary tracking-[0.3em] uppercase">
              <span className="flex items-center gap-2"><RefreshCcw size={14} className="animate-spin text-accent" /> Uplink: Quantum_Stable</span>
              <span className="flex items-center gap-2 border-l border-border-secondary pl-8">Core: Neural_Prism_v4</span>
            </div>
          </div>

          <div className="p-8">
            <div className="rounded-[1.5rem] border border-border-secondary bg-bg-primary/40 px-10 py-8 flex items-start gap-8 shadow-inner transition-all focus-within:bg-bg-primary/60">
              <Search size={30} className="mt-4 text-text-disabled shrink-0" />
              <textarea 
                value={input}
                onChange={handleInputChange}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    if (!isLoading && input.trim() !== '') handleSubmit(e as any);
                  }
                }}
                placeholder="Pose a cognitive query..."
                className="w-full h-32 p-2 bg-transparent text-2xl font-bold text-text-primary placeholder:text-text-disabled placeholder:italic focus:outline-none resize-none scrollbar-hide kinetic-text"
              />
            </div>
          </div>

          <div className="px-10 py-10 flex items-center justify-between border-t border-border-secondary bg-white/[0.02]">
            <div className="flex gap-6">
               <button type="button" onClick={() => setMessages([])} className="p-5 rounded-2xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-danger transition-all group hover:scale-110">
                  <RefreshCcw size={24} className="group-hover:rotate-180 transition-transform duration-500" />
               </button>
               <button type="button" className="p-5 rounded-2xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-accent transition-all group hover:scale-110">
                  <Plus size={24} className="group-hover:rotate-90 transition-transform duration-500" />
               </button>
            </div>
            <button 
              type="submit"
              disabled={isLoading || input.trim() === ''}
              className="px-16 py-5 rounded-[1.5rem] font-black text-xs tracking-[0.3em] uppercase transition-all disabled:opacity-30 disabled:cursor-not-allowed bg-accent text-bg-primary hover:bg-accent-high hover:scale-105 active:scale-95 shadow-2xl shadow-accent/40 flex items-center gap-4 group"
            >
              <span className="relative z-10">{isLoading ? 'EXECUTING_SYNC...' : 'INITIATE_SYNAPSE'}</span>
              <ArrowUpRight size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
            </button>
          </div>
        </form>
      </div>
      </motion.section>
    </div>
  );
}
