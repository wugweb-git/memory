"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Sparkles, CheckCircle2, ChevronDown, ChevronUp, 
  Linkedin, Calendar, Video, DollarSign, MapPin, X, ArrowRight,
  Twitter, Github, Youtube, Database, Brain, ShieldCheck, User, Grid, ExternalLink
} from 'lucide-react';

interface Recommendation {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'completed';
  cta?: string;
}

const RECS: Recommendation[] = [
  {
    id: '1',
    title: 'Add calendar & meeting link',
    description: 'Connect your calendars to automatically block availability during existing events. Integrates with Google Calendar and Outlook.',
    icon: <Calendar size={18} />,
    status: 'completed',
  },
  {
    id: '2',
    title: 'Let followers support your work',
    description: 'Let your followers pay as much as they can, after booking. People who find value from you are 40% more likely to pay.',
    icon: <DollarSign size={18} />,
    status: 'pending',
    cta: 'Try it out',
  },
  {
    id: '3',
    title: 'Add position on Linkedin',
    description: 'Sync your professional background to ground the Digital Twin in your actual career achievements and network.',
    icon: <Linkedin size={18} />,
    status: 'pending',
    cta: 'Connect LinkedIn',
  },
  {
    id: '4',
    title: 'Enable location-wise dynamic pricing',
    description: 'Automatically adjust your service rates based on the viewer\'s purchasing power parity (PPP) and region.',
    icon: <MapPin size={18} />,
    status: 'pending',
    cta: 'Configure',
  },
  {
    id: '5',
    title: 'Initialize Neural Avatar',
    description: 'Upload a high-fidelity portrait to anchor the Digital Twin identity in space.',
    icon: <User size={18} />,
    status: 'pending',
    cta: 'Upload',
  },
  {
    id: '6',
    title: 'Calibrate Semantic Bio',
    description: 'Optimize your profile summary with LLM-extracted keywords for better memory grounding.',
    icon: <Sparkles size={18} />,
    status: 'pending',
    cta: 'Auto-Generate',
  },
  {
    id: '7',
    title: 'Bridge Twitter Sync',
    description: 'Uplink your social presence for real-time sentiment and persona alignment.',
    icon: <Twitter size={18} />,
    status: 'pending',
    cta: 'Authorize',
  },
  {
    id: '8',
    title: 'Deploy Service Lattice',
    description: 'Configure your primary interaction nodes to allow followers to book cognitive syncs.',
    icon: <Grid size={18} />,
    status: 'pending',
    cta: 'Open Grid',
  },
  {
    id: '9',
    title: 'Audit Memory Quarantine',
    description: 'Review the last 14 pending fragments in the buffer for promotion to the vector core.',
    icon: <Database size={18} />,
    status: 'pending',
    cta: 'Inspect',
  },
  {
    id: '10',
    title: 'Test Neural Chat reflex',
    description: 'Perform a test query to verify the RAG pipeline\'s grounding and reflex latency.',
    icon: <Brain size={18} />,
    status: 'pending',
    cta: 'Launch Sync',
  },
  {
    id: '11',
    title: 'Harden L4 Logic Gates',
    description: 'Finalize the preference and behavior models for production-grade decision making.',
    icon: <ShieldCheck size={18} />,
    status: 'pending',
    cta: 'Certify',
  },
  {
    id: '12',
    title: 'Sync GitHub Repository',
    description: 'Connect your codebase to expose your technical graph and contribution history.',
    icon: <Github size={18} />,
    status: 'pending',
    cta: 'Uplink',
  },
  {
    id: '13',
    title: 'Broadcast YouTube Feed',
    description: 'Display your creative video output as a primary identity facet.',
    icon: <Youtube size={18} />,
    status: 'pending',
    cta: 'Feed Sync',
  },
  {
    id: '14',
    title: 'Achieve Matrix Alignment',
    description: 'Verify parity between the administrative core and your public profile mirror.',
    icon: <ExternalLink size={18} />,
    status: 'pending',
    cta: 'Verify',
  },
];

export const EnhancementHub = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>('2');

  const completedCount = RECS.filter(r => r.status === 'completed').length;
  const progress = (completedCount / RECS.length) * 100;

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-4 md:bottom-10 md:right-10 z-[60] bg-black text-white px-5 md:px-8 py-3 md:py-4 rounded-full font-black text-[10px] md:text-xs uppercase tracking-widest shadow-2xl flex items-center gap-3 overflow-hidden group border border-white/10"
      >
        <div className="absolute inset-0 bg-accent translate-y-full group-hover:translate-y-0 transition-transform duration-300 opacity-20" />
        <span className="relative z-10 flex items-center gap-3">
          <Sparkles size={16} className="text-accent" />
          Enhance Profile
          <span className="bg-accent text-bg-primary text-[10px] w-5 h-5 rounded-full flex items-center justify-center -mr-2">
            {RECS.length - completedCount}
          </span>
        </span>
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center p-4">
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            
            <motion.div
              initial={{ y: 100, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: 100, opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-white rounded-[3rem] shadow-3xl overflow-hidden border border-[#F0F0EE]"
            >
              <div className="p-10 space-y-8">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="w-12 h-12 rounded-2xl bg-accent/5 flex items-center justify-center mb-4 border border-accent/10">
                      <Sparkles className="text-accent" size={24} />
                    </div>
                    <h2 className="text-3xl font-black text-[#1A1A1A] tracking-tighter uppercase italic">Advanced checklist</h2>
                    <p className="text-sm font-medium text-[#888886]">Unlock the potential of your Identity Prism</p>
                  </div>
                  <button onClick={() => setIsOpen(false)} className="p-3 rounded-full hover:bg-[#F5F5F3] text-[#888886] transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-4">
                  <div className="flex gap-2">
                    {RECS.map((_, i) => (
                      <div 
                        key={i} 
                        className={`h-1.5 flex-1 rounded-full transition-colors duration-500 ${
                          i < completedCount ? 'bg-accent' : 'bg-[#F0F0EE]'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest text-[#A0A09E]">
                    <span>Analysis Complete</span>
                    <span>{RECS.length - completedCount} Nodes Pending</span>
                  </div>
                </div>

                <div className="space-y-4 overflow-y-auto max-h-[45vh] pr-2 custom-scrollbar">
                  {RECS.map((rec) => (
                    <div 
                      key={rec.id}
                      className={`rounded-[1.5rem] border transition-all duration-300 ${
                        expandedId === rec.id 
                        ? 'bg-[#F9F9F7] border-[#E0E0DE]' 
                        : 'bg-transparent border-transparent hover:bg-[#F9F9F7]/50'
                      }`}
                    >
                      <button 
                        onClick={() => setExpandedId(expandedId === rec.id ? null : rec.id)}
                        className="w-full px-6 py-5 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-2.5 rounded-xl border transition-colors ${
                            rec.status === 'completed' 
                            ? 'bg-success/10 border-success/20 text-success' 
                            : 'bg-white border-[#E0E0DE] text-[#666664]'
                          }`}>
                            {rec.status === 'completed' ? <CheckCircle2 size={18} /> : rec.icon}
                          </div>
                          <span className={`text-sm font-bold tracking-tight ${
                            rec.status === 'completed' ? 'text-[#A0A09E] line-through' : 'text-[#1A1A1A]'
                          }`}>
                            {rec.title}
                          </span>
                        </div>
                        {expandedId === rec.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </button>

                      <AnimatePresence>
                        {expandedId === rec.id && (
                          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                            <div className="px-16 pb-8 space-y-6">
                              <p className="text-xs leading-relaxed text-[#666664] font-medium italic">
                                {rec.description}
                              </p>
                              {rec.cta && rec.status === 'pending' && (
                                <div className="flex items-center gap-3">
                                  <button className="bg-[#1A1A1A] text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl">
                                    {rec.cta}
                                  </button>
                                  <button className="p-3 rounded-xl bg-white border border-[#E0E0DE] text-[#666664] hover:border-[#1A1A1A] transition-all">
                                    <ArrowRight size={16} />
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-10 bg-[#1A1A1A] flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center border border-accent/20">
                      <Brain className="text-accent" size={20} />
                   </div>
                   <div>
                      <h4 className="text-xs font-black text-white uppercase tracking-widest leading-none">Neural Mirror</h4>
                      <p className="text-[9px] text-[#888886] font-bold uppercase tracking-[0.2em] mt-1">Status: Locked</p>
                   </div>
                </div>
                <button className="bg-white text-black px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all">
                  Finalize Sync
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
