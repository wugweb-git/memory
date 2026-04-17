"use client";
import React, { useState } from 'react';
import { Mic, Sparkles, CheckCircle2, X, Waves, Brain } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-toastify';

export const VoiceIngestion = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [parsedData, setParsedData] = useState<null | { what: string, when: string, why: string, how: string }>(null);

  const simulateIngestion = () => {
    setIsRecording(true);
    // In a real scenario, this would trigger actual voice-to-text and AI parsing
    setTimeout(() => {
      setIsRecording(false);
      setParsedData({
        what: "Industrial_Audit_Preparation",
        when: "2026-04-16T19:25:00",
        why: "Compliance with Digital Twin safety standards",
        how: "Synthesized via Layer_2 Logic Engine"
      });
      toast.info("Neural extraction complete. Reviewing signal...");
    }, 4000);
  };

  const anchorMemory = () => {
    toast.success("Signal successfully anchored to Genesis stream.");
    setParsedData(null);
    // Logic to POST to /api/memory/signals would go here
  };

  return (
    <section className="glass-card rounded-[2rem] p-8 border border-border-secondary overflow-hidden relative" aria-label="Voice ingestion">
      {/* Perspective background accent */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-accent/5 blur-[80px] pointer-events-none" />

      <div className="flex items-center justify-between mb-8 relative z-10">
        <div className="kinetic-text">
          <h3 className="text-[10px] font-black tracking-[0.4em] text-text-primary uppercase flex items-center gap-3">
             <Waves size={16} className="text-accent" /> Cognitive_Ingress
          </h3>
          <p className="text-[8px] text-text-tertiary font-bold tracking-[0.2em] mt-1 uppercase opacity-50">High-Fidelity Signal Capture</p>
        </div>
        <button 
          onClick={simulateIngestion}
          disabled={isRecording}
          aria-label={isRecording ? 'Capturing...' : 'Begin signal recording'}
          className={`
            relative p-5 rounded-full transition-all duration-500 shadow-xl group
            ${isRecording 
              ? 'bg-danger/10 text-danger border-danger/40 scale-110' 
              : 'bg-accent text-bg-primary hover:bg-accent-high hover:scale-110 border border-accent/20'}
          `}
        >
          {isRecording && (
            <motion.div 
               animate={{ scale: [1, 1.4, 1], opacity: [0.3, 0.1, 0.3] }}
               transition={{ repeat: Infinity, duration: 1.5 }}
               className="absolute inset-0 bg-danger/20 rounded-full"
            />
          )}
          <Mic size={22} className={`relative z-10 ${isRecording ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
        </button>
      </div>

      <div className="relative min-h-[160px] flex items-center justify-center">
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div 
              key="recording"
              initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.1 }}
              className="flex flex-col items-center justify-center gap-6"
              role="status"
            >
              <div className="flex items-end gap-1.5 h-12" aria-hidden="true">
                {[5,9,14,10,18,12,8,15,11,7].map((h, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: [8, h * 3, 8] }}
                    transition={{ duration: 0.6, repeat: Infinity, delay: i * 0.08, ease: "easeInOut" }}
                    className="w-1.5 bg-accent rounded-full shadow-[0_0_10px_rgba(0,170,255,0.4)]"
                  />
                ))}
              </div>
              <div className="flex flex-col items-center">
                 <span className="text-[10px] font-black text-accent tracking-[0.5em] animate-pulse">MONITORING_FREQUENCY...</span>
                 <span className="text-[8px] font-bold text-text-tertiary mt-2">Uplink Encryption: STABLE</span>
              </div>
            </motion.div>
          ) : parsedData ? (
            <motion.div 
              key="parsed"
              initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }}
              className="space-y-6 w-full"
            >
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'OBJECT', val: parsedData.what },
                  { label: 'TEMPORAL', val: parsedData.when },
                  { label: 'INTENT', val: parsedData.why },
                  { label: 'METHOD', val: parsedData.how },
                ].map((item) => (
                  <div key={item.label} className="p-4 rounded-radius-xl bg-bg-secondary/40 border border-border-primary group hover:border-accent/40 transition-colors">
                    <span className="text-[9px] font-black text-text-tertiary tracking-[0.2em] block mb-2 uppercase group-hover:text-accent transition-colors">{item.label}</span>
                    <p className="text-[11px] text-text-primary font-bold leading-tight line-clamp-2 italic tracking-tight uppercase tracking-tighter">{item.val}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={anchorMemory} 
                  className="flex-1 py-4 rounded-2xl bg-accent text-bg-primary text-[10px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-accent-high transition-all shadow-xl shadow-accent/20 active:scale-95"
                >
                  <CheckCircle2 size={16} /> Anchor_Memory
                </button>
                <button 
                  onClick={() => setParsedData(null)} 
                  className="px-6 py-4 rounded-2xl bg-bg-secondary border border-border-primary text-text-tertiary hover:text-danger hover:border-danger/40 transition-all uppercase text-[10px] font-bold tracking-widest"
                >
                  <X size={18} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="idle" 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center text-center p-8 space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-secondary border border-border-secondary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform duration-500">
                 <Brain size={28} className="text-text-disabled opacity-40" />
              </div>
              <div className="space-y-1">
                 <p className="text-xs font-bold text-text-tertiary uppercase tracking-widest italic">Matrix_Listening_Idle</p>
                 <p className="text-[10px] text-text-disabled max-w-[200px] leading-relaxed">Broadcast a cognitive signal to anchor it into the neural stream.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
