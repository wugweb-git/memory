"use client";
import React from 'react';
import { 
  Github, Youtube, Layout, Linkedin, 
  ExternalLink, Zap, Globe2, Palette, Share2, Plus, CheckCircle2, Clock3, AlertTriangle, Loader2, Link
} from 'lucide-react';
import { motion } from 'framer-motion';

type ConnectionNode = {
  id: string;
  platform: string;
  category: 'Tech' | 'Creative' | 'Thought' | 'Identity';
  status: 'Synced' | 'Indexing' | 'Idle' | 'Error';
  lastActivity: string;
  metric: string;
  icon: any;
  url: string;
};

const STATUS_COLORS: Record<string, string> = {
  Synced: 'text-success',
  Indexing: 'text-accent',
  Idle: 'text-text-tertiary',
  Error: 'text-danger',
};

const STATUS_DOT: Record<string, string> = {
  Synced: 'bg-success',
  Indexing: 'bg-accent',
  Idle: 'bg-text-disabled',
  Error: 'bg-danger',
};

const STATUS_ICON: Record<string, any> = {
  Synced: CheckCircle2,
  Indexing: Loader2,
  Idle: Clock3,
  Error: AlertTriangle,
};

const NODES: ConnectionNode[] = [
  { id: '1', platform: 'GitHub', category: 'Tech', status: 'Synced', lastActivity: '2h ago', metric: '1.2k Commits', icon: Github, url: '#' },
  { id: '2', platform: 'YouTube', category: 'Thought', status: 'Indexing', lastActivity: '5m ago', metric: '42 Videos', icon: Youtube, url: '#' },
  { id: '3', platform: 'Behance', category: 'Creative', status: 'Synced', lastActivity: '1d ago', metric: '15 Case Studies', icon: Layout, url: '#' },
  { id: '4', platform: 'Dribbble', category: 'Creative', status: 'Idle', lastActivity: '3d ago', metric: '28 Shots', icon: Palette, url: '#' },
  { id: '5', platform: 'Google Workspace', category: 'Identity', status: 'Synced', lastActivity: '10m ago', metric: 'Profile Active', icon: Globe2, url: '#' },
  { id: '6', platform: 'LinkedIn', category: 'Identity', status: 'Synced', lastActivity: '4h ago', metric: '500+ Conn', icon: Linkedin, url: '#' },
];

export const NeuralConnections = () => {
  return (
    <section className="space-y-10 w-full" aria-label="Neural connections status">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <Link size={22} className="text-accent" /> Neural_Nodes
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">External Identity Matrix — 1-Way Sync</p>
        </div>
        <div className="px-5 py-2 rounded-full bg-accent/5 border border-accent/20 text-[10px] font-black text-accent flex items-center gap-3 uppercase tracking-widest shadow-sm">
           <Zap size={14} className="animate-pulse" /> Sync Engine: Active
        </div>
      </div>

      <div className="glass-panel p-8 rounded-[2rem] border border-border-secondary shadow-xl relative overflow-hidden group">
        <div className="absolute inset-x-0 bottom-0 h-1 bg-bg-secondary" />
        <div className="flex items-center justify-between text-[10px] font-black text-text-tertiary uppercase mb-4 tracking-widest italic">
          <span>Overall_Sync_Density</span>
          <span className="text-text-primary">72.4%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full border border-border-primary overflow-hidden p-[1px] shadow-inner">
          <motion.div initial={{ width: 0 }} animate={{ width: '72%' }} className="h-full bg-accent rounded-full shadow-[0_0_12px_rgba(0,170,255,0.4)]" />
        </div>
      </div>

      <ul role="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {NODES.map((node, idx) => (
          <motion.li 
            key={node.id} 
            initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: idx * 0.05 }}
            role="listitem"
          >
            <a 
              href={node.url}
              className="glass-panel p-8 rounded-[2rem] border border-border-secondary hover:border-border-primary hover:shadow-2xl transition-all duration-500 group block relative"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="w-14 h-14 rounded-2xl bg-bg-secondary border border-border-primary flex items-center justify-center text-text-tertiary group-hover:text-bg-primary group-hover:bg-black transition-all duration-500 shadow-inner group-hover:rotate-6">
                  <node.icon size={26} aria-hidden="true" />
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <div className="flex items-center gap-2">
                    {(() => {
                      const StatusIcon = STATUS_ICON[node.status];
                      return (
                        <StatusIcon
                          size={12}
                          className={`${STATUS_COLORS[node.status]} ${node.status === 'Indexing' ? 'animate-spin' : ''}`}
                          aria-hidden="true"
                        />
                      );
                    })()}
                    <span className={`text-[10px] font-black tracking-widest uppercase ${STATUS_COLORS[node.status]}`}>
                      {node.status}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[node.status]} shadow-[0_0_8px_currentColor]`} />
                  </div>
                  <time dateTime={node.lastActivity} className="text-[10px] text-text-disabled font-mono font-bold uppercase tracking-tighter italic opacity-60">{node.lastActivity}</time>
                </div>
              </div>

              <div className="space-y-4 relative z-10">
                <div className="kinetic-text">
                  <h3 className="text-lg font-black text-text-primary tracking-tighter uppercase">{node.platform}</h3>
                  <p className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.2em] italic opacity-60">{node.category} Target</p>
                </div>
                
                <div className="flex items-center justify-between p-4 rounded-2xl bg-bg-secondary/50 border border-border-primary group-hover:bg-black group-hover:text-bg-primary transition-all duration-500">
                  <span className="text-[10px] font-black font-mono uppercase tracking-widest">{node.metric}</span>
                  <ExternalLink size={14} className="opacity-40 group-hover:opacity-100 group-hover:scale-125 transition-all" />
                </div>
              </div>
            </a>
          </motion.li>
        ))}

        {/* Add Connection Action */}
        <li role="listitem">
          <button 
            className="w-full h-full min-h-[220px] p-8 rounded-[2.5rem] border-2 border-dashed border-border-primary bg-bg-secondary/30 flex flex-col items-center justify-center text-center group hover:border-accent hover:bg-bg-primary hover:shadow-2xl transition-all duration-700"
            aria-label="Connect new profile"
          >
            <div className="w-16 h-16 rounded-[1.5rem] bg-bg-secondary border border-border-secondary flex items-center justify-center text-text-disabled group-hover:text-bg-primary group-hover:bg-accent transition-all mb-6 group-hover:scale-110 shadow-lg">
              <Plus size={28} />
            </div>
            <span className="text-[10px] font-black text-text-tertiary uppercase tracking-[0.3em] group-hover:text-accent transition-colors">Attach_Node</span>
          </button>
        </li>
      </ul>

      {/* Sync Strategy Matrix */}
      <div className="glass-panel p-10 rounded-[3rem] border border-border-secondary relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none group-hover:opacity-10 transition-opacity" aria-hidden="true">
          <Share2 size={120} className="text-accent" />
        </div>
        <h3 className="text-[10px] font-black tracking-[0.4em] text-accent mb-6 uppercase flex items-center gap-4 kinetic-text">
          Sync_Protocol_Architecture <Share2 size={16} />
        </h3>
        <p className="text-base text-text-secondary leading-relaxed max-w-2xl font-medium mb-8 italic tracking-tight">
          All external nodes are synced via 1-way RSS or OAuth2. Every commit on GitHub, video on YouTube, or shot on Dribbble is vectorized into your global identity matrix.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {[
            { label: 'Latency_Delay', val: '< 20ms' },
            { label: 'Protocols', val: 'OAuth / RSS' },
            { label: 'Sync_Integrity', val: 'Aggressive' },
            { label: 'Neural_Load', val: 'Nominal' },
          ].map(stat => (
            <div key={stat.label} className="border-l-2 border-border-primary pl-6 hover:border-accent transition-colors group/stat">
              <dt className="text-[9px] font-black text-text-disabled tracking-[0.2em] uppercase mb-2 group-hover/stat:text-accent transition-colors">{stat.label}</dt>
              <dd className="text-sm font-black text-text-primary tracking-tighter italic">{stat.val}</dd>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};
