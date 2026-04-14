"use client";
import React from 'react';
import { 
  ShieldCheck, MapPin, Link as LinkIcon, 
  Twitter, Github, Linkedin, ExternalLink,
  Sparkles, Zap, Brain, Globe, Cpu, User
} from 'lucide-react';
import { JetBrains_Mono, Outfit } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

export const ProfileHeader = () => {
  return (
    <div className="relative w-full">
      {/* Ambient background glow */}
      <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-[#00E5FF]/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="glass-panel p-12 rounded-[3rem] border border-white/[0.08] relative overflow-hidden flex flex-col md:flex-row items-center md:items-start gap-12 group">
        {/* Profile Signal Identity */}
        <div className="relative shrink-0">
           <div className="absolute -inset-2 bg-gradient-to-tr from-[#00E5FF] to-[#10B981] rounded-[2.5rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity duration-1000" />
           <div className="relative w-48 h-48 rounded-[2.2rem] bg-black border border-white/10 flex items-center justify-center overflow-hidden shadow-3xl">
              <img 
                src="/user.png" 
                alt="Avatar" 
                className="w-full h-full object-cover opacity-90 group-hover:scale-110 transition-transform duration-1000" 
                onError={(e) => (e.currentTarget.src = 'https://ui-avatars.com/api/?name=V&size=512&background=030303&color=00E5FF&bold=true')} 
              />
           </div>
           
           {/* Active Node Indicator */}
           <div className="absolute -bottom-2 -right-2 w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center text-emerald-500 shadow-2xl">
              <div className="relative">
                 <div className="absolute inset-0 bg-emerald-500 rounded-full blur-sm animate-pulse" />
                 <ShieldCheck size={28} className="relative z-10" />
              </div>
           </div>
        </div>

        {/* Identity Metadata */}
        <div className="flex-1 text-center md:text-left space-y-8 py-2">
           <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mb-2">
                 <h1 className={`text-4xl md:text-5xl font-black text-white tracking-tight ${outfit.className}`}>
                    Vedanshu Srivastava
                 </h1>
                 <div className="px-3 py-1 rounded-xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[10px] font-black text-[#00E5FF] tracking-[0.2em] uppercase flex items-center gap-2">
                    <Sparkles size={12} className="animate-pulse" /> Identity_Prism_v4.2
                 </div>
              </div>
              <p className={`text-xl text-zinc-400 font-medium ${outfit.className} max-w-2xl leading-relaxed`}>
                Systems Architect & Founder. Building the intersection of <span className="text-white border-b border-[#00E5FF]/40">Human Spirit</span> and <span className="text-white border-b border-[#10B981]/40">Machine Logic</span>.
              </p>
           </div>

           <div className="flex flex-wrap items-center justify-center md:justify-start gap-8">
              <div className="flex items-center gap-3 text-zinc-500">
                 <MapPin size={16} className="text-[#00E5FF]" />
                 <span className={`text-[11px] font-black uppercase tracking-widest ${jetBrains.className}`}>GLOBAL_DEPLOYMENT</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-500">
                 <Globe size={16} className="text-[#10B981]" />
                 <span className={`text-[11px] font-black uppercase tracking-widest ${jetBrains.className}`}>WUGWEB.COM</span>
              </div>
              <div className="flex items-center gap-3 text-zinc-500">
                 <Cpu size={16} className="text-[#F59E0B]" />
                 <span className={`text-[11px] font-black uppercase tracking-widest ${jetBrains.className}`}>RAG_VECTOR_ACTIVE</span>
              </div>
           </div>

           <div className="pt-8 border-t border-white/[0.06] flex flex-wrap items-center justify-center md:justify-start gap-4">
              {[
                { label: 'LinkedIn', icon: Linkedin, color: 'hover:text-blue-500' },
                { label: 'GitHub', icon: Github, color: 'hover:text-white' },
                { label: 'Twitter', icon: Twitter, color: 'hover:text-cyan-400' },
                { label: 'Portfolio', icon: ExternalLink, color: 'hover:text-[#00E5FF]' },
              ].map(social => (
                <button key={social.label} className={`flex items-center gap-3 px-6 py-2.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[10px] font-black text-zinc-600 uppercase tracking-[0.2em] transition-all hover:bg-white/5 hover:border-white/20 ${social.color}`}>
                   <social.icon size={14} /> {social.label}
                </button>
              ))}
           </div>
        </div>

        {/* Real-time Bio Stats */}
        <div className="hidden lg:flex flex-col gap-6 justify-center pl-12 border-l border-white/[0.06]">
           {[
             { label: 'Venture_DNA', val: '4.2k Nodes', pct: 92, color: 'bg-[#00E5FF]' },
             { label: 'Logic_Sync', val: '98%', pct: 98, color: 'bg-[#10B981]' },
             { label: 'Neural_Weight', val: 'High', pct: 75, color: 'bg-purple-500' },
           ].map(stat => (
             <div key={stat.label} className="w-48 space-y-3">
                <div className="flex justify-between items-end">
                   <span className="text-[9px] font-black text-zinc-600 tracking-[0.2em] uppercase">{stat.label}</span>
                   <span className={`text-[11px] font-black text-zinc-300 ${jetBrains.className}`}>{stat.val}</span>
                </div>
                <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden p-[1px]">
                   <div className={`h-full ${stat.color} opacity-60 rounded-full transition-all duration-1000`} style={{ width: `${stat.pct}%` }} />
                </div>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
};
