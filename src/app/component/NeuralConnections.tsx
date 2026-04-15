"use client";
import React from 'react';
import { 
  Github, Youtube, Layout, Linkedin, 
  ExternalLink, Zap, Globe2, Palette, Share2, Plus
} from 'lucide-react';

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
  Indexing: 'bg-accent animate-ping',
  Idle: 'bg-text-disabled',
  Error: 'bg-danger',
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
    <section className="space-y-8 max-w-5xl mx-auto w-full" aria-label="Neural connections">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-text-primary tracking-tight">Neural Connections</h2>
          <p className="text-xs text-text-tertiary font-normal mt-1 uppercase tracking-wider">External Nodes — 1-Way Profile Sync</p>
        </div>
        <span className="px-4 py-2 rounded-xl bg-accent/10 border border-accent/20 text-xs font-bold text-accent flex items-center gap-2 self-start">
          <Zap size={13} aria-hidden="true" /> Sync Engine: Active
        </span>
      </div>

      <ul role="list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {NODES.map((node) => (
          <li key={node.id} role="listitem">
            <a 
              href={node.url}
              aria-label={`${node.platform} — ${node.metric} — Status: ${node.status}`}
              className="glass-card p-6 rounded-2xl border border-primary hover:border-primary transition-all duration-300 group block focus-ring"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="w-12 h-12 rounded-xl bg-secondary border border-primary flex items-center justify-center text-text-secondary group-hover:text-text-primary transition-colors">
                  <node.icon size={22} aria-hidden="true" />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-bold tracking-widest uppercase ${STATUS_COLORS[node.status]}`}>
                      {node.status}
                    </span>
                    <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT[node.status]}`} aria-hidden="true" />
                  </div>
                  <time dateTime={node.lastActivity} className="text-[10px] text-text-tertiary font-mono">{node.lastActivity}</time>
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary tracking-tight">{node.platform}</h3>
                  <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{node.category} Vector</p>
                </div>
                
                <div className="flex items-center justify-between p-3 rounded-xl bg-secondary border border-primary">
                  <span className="text-xs font-mono text-text-secondary">{node.metric}</span>
                  <ExternalLink size={12} className="text-text-disabled group-hover:text-text-secondary transition-colors" aria-hidden="true" />
                </div>
              </div>
            </a>
          </li>
        ))}

        {/* Add new */}
        <li role="listitem">
          <button 
            className="w-full h-full min-h-[180px] p-6 rounded-2xl border-2 border-dashed border-primary bg-secondary/30 flex flex-col items-center justify-center text-center group hover:border-accent/30 hover:bg-secondary/50 transition-all duration-500 focus-ring"
            aria-label="Connect new profile"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary border border-primary flex items-center justify-center text-text-disabled group-hover:text-accent transition-all mb-4 group-hover:shadow-[0_0_20px_rgba(0,170,255,0.1)]">
              <Plus size={22} aria-hidden="true" />
            </div>
            <span className="text-xs font-bold text-text-tertiary uppercase tracking-widest group-hover:text-text-secondary transition-colors">Connect Profile</span>
          </button>
        </li>
      </ul>

      {/* Stats bar */}
      <div className="p-6 rounded-2xl border border-primary bg-secondary/30 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-5" aria-hidden="true">
          <Share2 size={80} className="text-accent" />
        </div>
        <h3 className="text-xs font-bold tracking-widest text-accent mb-4 uppercase flex items-center gap-3">
          Neural Pulse Strategy <Share2 size={13} aria-hidden="true" />
        </h3>
        <p className="text-sm text-text-secondary leading-relaxed max-w-3xl font-normal mb-6">
          All external nodes are synced via 1-way RSS or OAuth2. Every commit on GitHub, video on YouTube, or shot on Dribbble is vectorized into your global identity matrix.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Latency', val: '< 20ms' },
            { label: 'Protocols', val: 'OAuth / RSS' },
            { label: 'Sync Depth', val: 'Aggressive' },
            { label: 'Load', val: 'Nominal' },
          ].map(stat => (
            <dl key={stat.label} className="border-l border-primary pl-4">
              <dt className="text-[10px] font-bold text-text-tertiary tracking-widest uppercase mb-1">{stat.label}</dt>
              <dd className="text-sm font-mono font-bold text-text-primary">{stat.val}</dd>
            </dl>
          ))}
        </div>
      </div>
    </section>
  );
};
