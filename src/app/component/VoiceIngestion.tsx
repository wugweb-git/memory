"use client";
import React, { useState } from 'react';
import { Mic, Sparkles, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const VoiceIngestion = () => {
  const [isRecording, setIsRecording] = useState(false);
  const [parsedData, setParsedData] = useState<null | { what: string, when: string, why: string, how: string }>(null);

  const simulateIngestion = () => {
    setIsRecording(true);
    setTimeout(() => {
      setIsRecording(false);
      setParsedData({
        what: "Met with F&B supplier for sustainable sourcing",
        when: "Today, 14:30",
        why: "Quarterly review of supply chain transparency",
        how: "Mapped requirements to F&B Strategy cluster"
      });
    }, 3000);
  };

  return (
    <section className="glass-card rounded-2xl p-6 border border-primary overflow-hidden" aria-label="Voice ingestion">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-xs font-bold tracking-widest text-text-primary uppercase">Voice-to-DB</h3>
          <p className="text-[10px] text-text-tertiary tracking-wide mt-0.5 uppercase">iOS Shortcut / Android Quick Action</p>
        </div>
        <button 
          onClick={simulateIngestion}
          disabled={isRecording}
          aria-label={isRecording ? 'Recording in progress' : 'Start voice recording'}
          aria-pressed={isRecording}
          className={`p-3.5 rounded-full transition-all focus-ring ${
            isRecording 
              ? 'bg-danger/20 text-danger cursor-not-allowed' 
              : 'bg-accent/10 text-accent hover:bg-accent/20 border border-accent/20'
          }`}
        >
          <Mic size={18} className={isRecording ? 'animate-bounce' : ''} aria-hidden="true" />
        </button>
      </div>

      <div aria-live="assertive" aria-atomic="true">
        <AnimatePresence mode="wait">
          {isRecording ? (
            <motion.div 
              key="recording"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="flex flex-col items-center justify-center py-6 gap-3"
              role="status"
            >
              <div className="flex items-end gap-0.5 h-8" aria-hidden="true">
                {[3,5,8,5,9,6,4,7,5,4].map((h, i) => (
                  <motion.div 
                    key={i}
                    animate={{ height: [8, h * 3, 8] }}
                    transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.07 }}
                    className="w-1 bg-accent rounded-full"
                  />
                ))}
              </div>
              <span className="text-[10px] font-mono font-bold text-accent uppercase tracking-widest">RECORDING...</span>
            </motion.div>
          ) : parsedData ? (
            <motion.div 
              key="parsed"
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'WHAT', val: parsedData.what },
                  { label: 'WHEN', val: parsedData.when },
                  { label: 'WHY', val: parsedData.why },
                  { label: 'HOW', val: parsedData.how },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-secondary border border-primary">
                    <span className="text-[10px] font-bold text-text-tertiary tracking-widest block mb-1 uppercase">{item.label}</span>
                    <p className="text-xs text-text-secondary font-normal leading-snug">{item.val}</p>
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => setParsedData(null)} 
                  className="flex-1 py-2 rounded-lg bg-success/10 border border-success/20 text-xs font-bold text-success uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-success/20 transition-colors focus-ring"
                  aria-label="Confirm and anchor memory"
                >
                  <CheckCircle2 size={13} aria-hidden="true" /> Anchor Memory
                </button>
                <button 
                  onClick={() => setParsedData(null)} 
                  className="p-2 rounded-lg bg-secondary border border-primary text-text-tertiary hover:text-text-primary transition-colors focus-ring"
                  aria-label="Discard and close"
                >
                  <X size={15} aria-hidden="true" />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div key="idle" className="py-10 flex flex-col items-center justify-center text-center" exit={{ opacity: 0 }}>
              <Sparkles size={28} className="text-text-disabled mb-3" aria-hidden="true" />
              <p className="text-xs text-text-tertiary leading-relaxed">Tap the microphone to speak an activity note. AI will parse it into structured logic.</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
};
