"use client";
import React, { useState } from 'react';
import { Mic, Zap, Sparkles, Database, CheckCircle2, X } from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';
import { motion, AnimatePresence } from 'framer-motion';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });

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
    <div className="glass-card rounded-2xl p-6 border border-white/5 bg-black/40 overflow-hidden relative">
      <div className="flex items-center justify-between mb-8">
         <div>
            <h3 className="text-xs font-black tracking-[0.2em] text-white uppercase">Voice-to-DB // Spoken Ingestion</h3>
            <p className="text-[10px] text-zinc-600 tracking-widest uppercase mt-1">iOS_SHORTCUT / ANDROID_QUICK_ACTION</p>
         </div>
         <button 
           onClick={simulateIngestion}
           disabled={isRecording}
           className={`p-4 rounded-full transition-all ${
             isRecording ? 'bg-red-500/20 text-red-500 animate-pulse' : 'bg-[#00E5FF]/10 text-[#00E5FF] hover:bg-[#00E5FF]/20 border border-[#00E5FF]/20'
           }`}
         >
           <Mic size={20} className={isRecording ? 'animate-bounce' : ''} />
         </button>
      </div>

      <AnimatePresence mode="wait">
        {isRecording ? (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center py-8 gap-4"
          >
            <div className="flex items-end gap-1 h-8">
               {[1,2,3,4,5,6,7,8,7,6,5,4].map((h, i) => (
                 <motion.div 
                   key={i}
                   animate={{ height: [8, Math.random() * 32, 8] }}
                   transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.05 }}
                   className="w-1 bg-[#00E5FF] rounded-full"
                 />
               ))}
            </div>
            <span className={`text-[10px] font-black tracking-[0.3em] text-[#00E5FF] ${jetBrains.className}`}>AWAITING_SPIRIT...</span>
          </motion.div>
        ) : parsedData ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
             <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'WHAT', val: parsedData.what },
                  { label: 'WHEN', val: parsedData.when },
                  { label: 'WHY', val: parsedData.why },
                  { label: 'HOW', val: parsedData.how },
                ].map((item) => (
                  <div key={item.label} className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                     <span className="text-[8px] font-black text-zinc-600 tracking-widest block mb-1">{item.label}</span>
                     <p className="text-[10px] text-zinc-300 font-medium leading-tight">{item.val}</p>
                  </div>
                ))}
             </div>
             <div className="flex gap-2">
                <button onClick={() => setParsedData(null)} className="flex-1 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-400 uppercase tracking-widest flex items-center justify-center gap-2">
                   <CheckCircle2 size={12} /> ANCHOR_MEMORY
                </button>
                <button onClick={() => setParsedData(null)} className="p-2 rounded-lg bg-white/5 border border-white/5 text-zinc-500">
                   <X size={14} />
                </button>
             </div>
          </motion.div>
        ) : (
          <div className="py-12 flex flex-col items-center justify-center text-center">
             <Sparkles size={32} className="text-zinc-800 mb-4" />
             <p className="text-[10px] text-zinc-600 tracking-wider">Tap the microphone to speak your activity note.<br/>Claude will parse it into structured logic.</p>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
