"use client";
import React from 'react';
import { 
  Globe, Github, Youtube, Layout, 
  Linkedin, Mail, Play, Share2, 
  RefreshCw, CheckCircle2, AlertCircle,
  ExternalLink, Zap, Globe2, Binary,
  Palette, MessageSquare, Database
} from 'lucide-react';
import { JetBrains_Mono, Outfit } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

type ConnectionNode = {
  id: string;
  platform: string;
  category: 'Tech' | 'Creative' | 'Thought' | 'Identity';
  status: 'Synced' | 'Indexing' | 'Idle' | 'Error';
  lastActivity: string;
  metric: string;
  icon: any;
  color: string;
  url: string;
};

const NODES: ConnectionNode[] = [
  { id: '1', platform: 'GitHub', category: 'Tech', status: 'Synced', lastActivity: '2h ago', metric: '1.2k Commits', icon: Github, color: 'text-zinc-100', url: '#' },
  { id: '2', platform: 'YouTube', category: 'Thought', status: 'Indexing', lastActivity: '5m ago', metric: '42 Videos', icon: Youtube, color: 'text-red-500', url: '#' },
  { id: '3', platform: 'Behance', category: 'Creative', status: 'Synced', lastActivity: '1d ago', metric: '15 Case Studies', icon: Layout, color: 'text-blue-500', url: '#' },
  { id: '4', platform: 'Dribbble', category: 'Creative', status: 'Idle', lastActivity: '3d ago', metric: '28 Shots', icon: Palette, color: 'text-pink-500', url: '#' },
  { id: '5', platform: 'Google Workspace', category: 'Identity', status: 'Synced', lastActivity: '10m ago', metric: 'Profile Active', icon: Globe2, color: 'text-amber-500', url: '#' },
  { id: '6', platform: 'LinkedIn', category: 'Identity', status: 'Synced', lastActivity: '4h ago', metric: '500+ Conn', icon: Linkedin, color: 'text-blue-600', url: '#' },
];

export const NeuralConnections = () => {
  return (
    <div className="space-y-12 max-w-6xl mx-auto w-full py-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 px-4">
        <div className="text-left">
          <h2 className={`text-3xl font-black tracking-[0.1em] text-white uppercase mb-2 ${outfit.className}`}>Neural Connections</h2>
          <p className="text-zinc-600 text-[10px] font-black tracking-[0.3em] uppercase opacity-70 italic">External Nodes // 1-Way Profile Sync</p>
        </div>
        <div className="flex gap-4">
           <div className="px-5 py-2.5 rounded-2xl bg-[#00E5FF]/10 border border-[#00E5FF]/20 text-[11px] font-black text-[#00E5FF] flex items-center gap-3 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
              <RefreshCw size={14} className="animate-spin-slow" /> SYNC_ENGINE: GLOBAL_ACTIVE
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {NODES.map((node) => (
          <div key={node.id} className="glass-panel p-8 rounded-[2rem] border border-white/[0.06] hover:border-white/20 transition-all duration-700 group relative overflow-hidden active:scale-95 cursor-pointer">
            {/* Pulsing Status Background */}
            <div className={`absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-100 transition-opacity`}>
               <div className={`w-24 h-24 rounded-full blur-3xl ${node.status === 'Synced' ? 'bg-emerald-500/10' : node.status === 'Indexing' ? 'bg-blue-500/10' : 'bg-white/5'}`}></div>
            </div>

            <div className="flex items-center justify-between mb-10 relative z-10">
               <div className={`w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center ${node.color} shadow-2xl transition-transform group-hover:scale-110 duration-500`}>
                  <node.icon size={24} />
               </div>
               <div className="flex flex-col items-end">
                  <div className={`flex items-center gap-2 mb-1`}>
                    <span className={`text-[9px] font-black tracking-[0.2em] uppercase ${node.status === 'Synced' ? 'text-emerald-400' : node.status === 'Indexing' ? 'text-blue-400 animate-pulse' : 'text-zinc-600'}`}>
                       {node.status}
                    </span>
                    <div className={`w-1.5 h-1.5 rounded-full ${node.status === 'Synced' ? 'bg-emerald-500' : node.status === 'Indexing' ? 'bg-blue-500 animate-ping' : 'bg-zinc-800'}`} />
                  </div>
                  <span className={`text-[10px] font-bold text-zinc-700 italic`}>{node.lastActivity}</span>
               </div>
            </div>

            <div className="space-y-6 relative z-10">
               <div>
                  <h3 className={`text-lg font-black text-white uppercase tracking-wider mb-2 ${outfit.className}`}>{node.platform}</h3>
                  <p className="text-[10px] font-black text-zinc-600 tracking-[0.2em] uppercase">{node.category} VECTOR</p>
               </div>
               
               <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.02] border border-white/5 group-hover:bg-white/[0.04] transition-all">
                  <span className={`text-[11px] font-bold text-zinc-400 ${jetBrains.className}`}>{node.metric}</span>
                  <ExternalLink size={12} className="text-zinc-700 group-hover:text-white transition-colors" />
               </div>
            </div>
          </div>
        ))}

        {/* Add New Node Piece */}
        <div className="p-8 rounded-[2rem] border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] transition-all flex flex-col items-center justify-center text-center group cursor-pointer border-2 hover:border-[#00E5FF]/40 duration-700">
           <div className="w-16 h-16 rounded-2xl bg-black border border-white/[0.06] flex items-center justify-center text-zinc-800 group-hover:text-[#00E5FF] transition-all mb-6 group-hover:shadow-[0_0_20px_rgba(0,229,255,0.1)]">
              <Zap size={28} />
           </div>
           <p className={`text-[12px] font-black text-zinc-700 tracking-[0.3em] uppercase group-hover:text-zinc-500 transition-colors`}>
              Connect_New_Profile
           </p>
        </div>
      </div>

      {/* Connection Mesh Strategy visualization */}
      <div className="p-10 rounded-[2.5rem] border border-white/[0.06] bg-gradient-to-br from-black to-[#050505] relative overflow-hidden group">
         <div className="absolute top-0 right-0 p-12 opacity-5 text-[#00E5FF] rotate-12 group-hover:scale-125 transition-transform duration-1000">
            <Share2 size={150} />
         </div>
         <div className="relative z-10">
            <h3 className={`text-[13px] font-black tracking-[0.4em] text-[#00E5FF] mb-6 flex items-center gap-4 uppercase ${outfit.className}`}>
               Neural Pulse Strategy <Share2 size={16} />
            </h3>
            <p className="text-sm text-zinc-500 leading-relaxed max-w-3xl font-medium uppercase tracking-widest opacity-80">
               All external nodes are synced via 1-way RSS or OAuth2. Every clap on Medium, commit on GitHub, or shot on Dribbble is instantly vectorized into your global identity matrix. 
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mt-12">
               {[
                 { label: 'Latency', val: '< 20ms' },
                 { label: 'Protocols', val: 'OAuth / RSS' },
                 { label: 'Sync Depth', val: 'Aggressive' },
                 { label: 'Relational Load', val: 'Nominal' },
               ].map(stat => (
                 <div key={stat.label} className="flex flex-col gap-2 border-l border-white/5 pl-6">
                    <span className="text-[10px] font-black text-zinc-700 tracking-widest uppercase">{stat.label}</span>
                    <span className={`text-[13px] font-black text-white ${jetBrains.className}`}>{stat.val}</span>
                 </div>
               ))}
            </div>
         </div>
      </div>
    </div>
  );
};
