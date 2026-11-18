"use client";

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, User, Search, RefreshCcw, Sparkles, ArrowUpRight } from 'lucide-react';
import type { UIMessage } from 'ai';
import { usePrismChat } from '@/hooks/usePrismChat';
import { PublicFrame } from '../component/PublicFrame';
import { UI_API } from '@/lib/api/endpoints';
import { CHAT_HIGHLIGHT_KEYWORDS } from '@/config/ui-content';
import { haptic, prefersReducedMotion } from '@/lib/pwa/browser';

function messageText(message: UIMessage): string {
  return message.parts
    .filter((part): part is { type: 'text'; text: string } => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

export default function AskNeuralInterface() {
  const [input, setInput] = useState('');
  const { messages, sendMessage, status, setMessages } = usePrismChat(UI_API.chat);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isLoading = status === 'submitted' || status === 'streaming';

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "end" });
  }, [messages]);

  const highlightKeywords = (text: string) => {
    const keywords = [...CHAT_HIGHLIGHT_KEYWORDS];
    const parts = text.split(new RegExp(`(${keywords.join('|')})`, 'gi'));
    return parts.map((part, i) => 
      keywords.some(k => k.toLowerCase() === part.toLowerCase()) 
        ? <span key={i} className="text-accent font-bold">{part}</span> 
        : part
    );
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;
    haptic('tap');
    sendMessage({ text });
    setInput('');
  };

  return (
    <PublicFrame>
      <div className="min-h-[calc(100dvh-4rem)] bg-bg-primary text-text-primary flex flex-col selection:bg-accent/30 transition-colors duration-1000 relative">
      {/* Background Interactivity */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden" aria-hidden="true">
        <div className="absolute inset-0 grid-bg opacity-10" />
        <div className="absolute top-[10%] left-[5%] w-[60vw] h-[60vh] bg-accent/5 rounded-full blur-[150px]" />
        <div className="scanline" />
      </div>

      <main className="flex-1 flex flex-col relative z-10 pb-64 md:pb-80">
        <div className="max-w-5xl mx-auto w-full px-4 md:px-6 space-y-10 md:space-y-16">
          
          {/* Header Section */}
          <section className="space-y-6 text-center lg:text-left">
             <div className="flex items-center gap-3 text-accent mb-6 justify-center lg:justify-start">
                <Brain size={22} />
                <span className="text-2xs font-bold uppercase tracking-widest">Digital twin</span>
             </div>
             <h1 className="text-4xl md:text-5xl font-black tracking-tight text-text-primary break-words">
                Ask
             </h1>
             <p className="max-w-2xl text-lg font-medium text-text-tertiary leading-relaxed">
                Ask anything — answers are grounded in your own memory, not the open internet.
             </p>
          </section>

          {/* Chat Container */}
          <div className="glass-panel rounded-[2rem] md:rounded-[3rem] min-h-[60dvh] flex flex-col p-4 md:p-12 relative overflow-hidden group border-white/5 shadow-3xl">
             <div role="log" aria-live="polite" aria-relevant="additions text" aria-label="Conversation" className="contents">
             <AnimatePresence mode="popLayout">
               {messages.length === 0 ? (
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
                   className="flex flex-col items-center justify-center flex-1 text-center py-20"
                 >
                   <div className="w-24 h-24 rounded-full bg-accent/10 flex items-center justify-center mb-10 border border-accent/20 shadow-[0_0_50px_rgba(0,170,255,0.1)]">
                      <Sparkles size={40} className="text-accent" />
                   </div>
                   <h2 className="text-3xl font-black text-text-primary mb-3 tracking-tight">Start a conversation</h2>
                   <p className="text-sm text-text-tertiary">Try &ldquo;What am I building right now?&rdquo; or &ldquo;Summarize my week.&rdquo;</p>
                 </motion.div>
               ) : (
                 <div className="space-y-8 md:space-y-16 relative z-10">
                   {messages.map((m) => {
                     const text = messageText(m as UIMessage);
                     return (
                     <motion.div 
                       initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                       key={m.id}
                       className={`flex gap-3 md:gap-10 ${m.role === 'user' ? 'flex-row-reverse' : ''}`}
                     >
                       <div className={`w-10 h-10 md:w-14 md:h-14 rounded-2xl md:rounded-3xl flex items-center justify-center shrink-0 border-2 transition-all duration-500 ${
                         m.role === 'user' 
                           ? 'bg-accent/10 border-accent/40 text-accent shadow-[0_0_30px_rgba(0,170,255,0.2)]' 
                           : 'bg-bg-secondary border-border-primary text-text-tertiary shadow-2xl'
                       }`}>
                         {m.role === 'user' ? <User size={26} /> : <Brain size={26} />}
                       </div>
                       <div className={`flex flex-col min-w-0 max-w-[85%] ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                         <div className={`p-4 md:p-10 rounded-3xl md:rounded-[2.5rem] text-base md:text-lg font-medium leading-relaxed shadow-3xl break-words ${
                           m.role === 'user' 
                           ? 'bg-bg-secondary border-2 border-border-primary text-text-primary rounded-tr-none' 
                           : 'bg-bg-elevated border-2 border-border-primary text-text-primary rounded-tl-none backdrop-blur-3xl'
                         }`}>
                           <div className="kinetic-text">
                             {m.role !== 'user' ? highlightKeywords(text) : text}
                           </div>
                         </div>
                         <span className="text-2xs mt-4 font-medium text-text-disabled">
                           {m.role === 'user' ? 'You' : 'Twin'} · {new Date().toLocaleTimeString()}
                         </span>
                       </div>
                     </motion.div>
                   );})}
                   {isLoading && (
                     <div className="flex gap-3 md:gap-10 motion-safe:animate-pulse" role="status" aria-label="Twin is replying">
                       <div className="w-10 h-10 md:w-14 md:h-14 rounded-2xl md:rounded-3xl bg-bg-secondary border-2 border-border-primary flex items-center justify-center">
                          <RefreshCcw size={22} className="text-accent motion-safe:animate-spin" aria-hidden="true" />
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
             </div>
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
        className="fixed bottom-0 left-0 right-0 p-3 md:p-12 bg-gradient-to-t from-bg-primary via-bg-primary/95 to-transparent z-[55] safe-navbar"
      >
      <div className="max-w-4xl mx-auto">
        <form onSubmit={handleSend} aria-label="Ask your twin" className="group relative glass-panel rounded-[2.5rem] border-white/5 focus-within:border-accent/50 transition-all duration-700 shadow-3xl overflow-hidden">
          
          <div className="p-4 md:p-8">
            <div className="rounded-[1.25rem] md:rounded-[1.5rem] border border-border-secondary bg-bg-primary/40 px-4 md:px-10 py-4 md:py-8 flex items-start gap-4 md:gap-8 shadow-inner transition-all focus-within:bg-bg-primary/60">
              <Search size={24} className="mt-3 text-text-disabled shrink-0" aria-hidden="true" />
              <label htmlFor="ask-input" className="sr-only">Your question</label>
              <textarea
                id="ask-input"
                enterKeyHint="send"
                autoComplete="off"
                autoCapitalize="sentences"
                rows={3}
                aria-busy={isLoading}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                placeholder="Ask anything…"
                className="w-full h-24 md:h-32 p-2 bg-transparent text-base md:text-2xl font-bold text-text-primary placeholder:text-text-disabled placeholder: focus:outline-none resize-none scrollbar-hide kinetic-text"
              />
            </div>
          </div>

          <div className="px-4 md:px-10 py-4 md:py-10 flex items-center justify-between border-t border-border-secondary bg-white/[0.02]">
            <div className="flex gap-6">
               <button type="button" aria-label="Clear conversation" onClick={() => setMessages([])} className="min-h-11 min-w-11 flex items-center justify-center p-3 md:p-5 rounded-2xl bg-bg-elevated border border-border-secondary text-text-tertiary hover:text-danger transition-all group motion-safe:hover:scale-110">
                  <RefreshCcw size={20} className="group-hover:rotate-180 transition-transform duration-500" />
               </button>
               
            </div>
            <button 
              type="submit"
              disabled={isLoading || input.trim() === ''}
              className="min-h-11 px-5 md:px-16 py-3 md:py-5 rounded-[1.25rem] md:rounded-[1.5rem] font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-text-primary text-bg-primary shadow-2xl flex items-center gap-2 md:gap-4 group"
            >
              <span className="relative z-10">{isLoading ? 'Thinking…' : 'Send'}</span>
              <ArrowUpRight size={20} aria-hidden="true" />
            </button>
          </div>
        </form>
      </div>
      </motion.section>
      </div>
    </PublicFrame>
  );
}
