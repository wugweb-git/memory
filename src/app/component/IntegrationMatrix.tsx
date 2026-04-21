"use client";

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Calendar, Video, Linkedin, Mail, BadgeCheck, 
  Settings, MoreVertical, Plus, CheckCircle2,
  ToggleLeft as Toggle, ArrowUpRight
} from 'lucide-react';

interface IntegrationAccount {
  id: string;
  provider: string;
  email: string;
  isPrimary: boolean;
  icon: string; // URL or type
}

interface MeetingTool {
  id: string;
  name: string;
  description: string;
  active: boolean;
  icon: React.ReactNode;
}

const ACCOUNTS: IntegrationAccount[] = [
  { id: '1', provider: 'Google calendar', email: 'vedanshu.srivastava@gmail.com', isPrimary: true, icon: 'google' },
  { id: '2', provider: 'Google calendar', email: 'vedanshu.srivastava@gmail.com', isPrimary: false, icon: 'google' },
];

const TOOLS: MeetingTool[] = [
  { 
    id: '1', 
    name: 'Zoom Pro', 
    description: 'Professional video conferencing for your meetings', 
    active: false,
    icon: <Video className="text-accent" />
  },
  { 
    id: '2', 
    name: 'Google Meet', 
    description: 'Free video meetings with Google Calendar integration', 
    active: true,
    icon: <Video className="text-success" />
  }
];

export const IntegrationMatrix = () => {
  const [tools, setTools] = useState(TOOLS);

  const toggleTool = (id: string) => {
    setTools(tools.map(t => t.id === id ? { ...t, active: !t.active } : t));
  };

  return (
    <div className="space-y-12">
      <div className="kinetic-text">
        <h2 className="text-3xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-4">
           <Settings size={26} className="text-accent" /> System_Integrations
        </h2>
        <p className="text-[10px] text-text-tertiary font-bold mt-2 uppercase tracking-[0.4em] opacity-60">Neural Uplink Channels & Meeting Protocols</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Calendar Integration Section */}
        <section className="glass-panel p-10 rounded-[2.5rem] border border-border-secondary shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Calendar size={120} />
          </div>
          
          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-black text-text-primary uppercase tracking-tight italic">Calendar Integration</h3>
            <p className="text-xs font-medium text-text-tertiary">Connect your calendars to automatically block availability during existing events</p>
          </div>

          <div className="bg-bg-secondary/40 border border-border-primary rounded-3xl p-8 space-y-6 relative z-10">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h4 className="text-sm font-black text-text-primary uppercase tracking-wider">Connected Calendars</h4>
                <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-widest opacity-60">Sync your personal and work calendars</p>
              </div>
            </div>

            <div className="space-y-4">
              {ACCOUNTS.map((acc, idx) => (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  key={acc.id}
                  className="bg-bg-primary/60 border border-border-primary rounded-2xl p-5 flex items-center justify-between group hover:border-accent/40 transition-all"
                >
                  <div className="flex items-center gap-5">
                    <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-md border border-border-secondary">
                      <img src={`https://www.google.com/s2/favicons?domain=calendar.google.com&sz=32`} alt="Google" className="w-6 h-6" />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-text-primary flex items-center gap-2">
                        {acc.provider}
                        {acc.isPrimary && (
                          <span className="bg-success/10 text-success text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full flex items-center gap-1 border border-success/20">
                            <CheckCircle2 size={8} /> PRIMARY
                          </span>
                        )}
                      </h5>
                      <p className="text-[10px] font-bold text-text-tertiary truncate max-w-[200px]">{acc.email}</p>
                    </div>
                  </div>
                  <button className="p-2 rounded-lg hover:bg-bg-elevated text-text-disabled hover:text-text-tertiary transition-colors">
                    <MoreVertical size={18} />
                  </button>
                </motion.div>
              ))}
            </div>

            <button className="w-full py-4 rounded-2xl border-2 border-dashed border-border-secondary text-text-tertiary text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:border-accent hover:text-accent transition-all hover:bg-accent/5">
              <Plus size={16} /> Add calendar account
            </button>
          </div>
        </section>

        {/* Meeting Location Section */}
        <section className="glass-panel p-10 rounded-[2.5rem] border border-border-secondary shadow-2xl space-y-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Video size={120} />
          </div>

          <div className="space-y-2 relative z-10">
            <h3 className="text-xl font-black text-text-primary uppercase tracking-tight italic">Meeting Location</h3>
            <p className="text-xs font-medium text-text-tertiary">Configure your preferred video conferencing tools for meetings</p>
          </div>

          <div className="space-y-4 relative z-10">
            {tools.map((tool) => (
              <div 
                key={tool.id}
                className="bg-bg-secondary/40 border border-border-primary rounded-3xl p-6 flex items-center justify-between group hover:border-accent/40 transition-all"
              >
                <div className="flex items-center gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-bg-primary flex items-center justify-center shadow-inner border border-border-primary">
                    {tool.icon}
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-text-primary uppercase tracking-widest">{tool.name}</h5>
                    <p className="text-[10px] font-medium text-text-tertiary max-w-[200px]">{tool.description}</p>
                  </div>
                </div>
                <button 
                  onClick={() => toggleTool(tool.id)}
                  className={`w-14 h-8 rounded-full p-1 transition-all duration-500 flex items-center ${
                    tool.active ? 'bg-success' : 'bg-primary/40'
                  }`}
                >
                  <motion.div 
                    animate={{ x: tool.active ? 24 : 0 }}
                    className="w-6 h-6 rounded-full bg-white shadow-lg" 
                  />
                </button>
              </div>
            ))}
          </div>

          <div className="p-8 bg-accent/5 border border-accent/20 rounded-3xl flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-accent text-bg-primary flex items-center justify-center shadow-lg shadow-accent/20">
                <ArrowUpRight size={20} />
              </div>
              <div>
                <h4 className="text-xs font-black text-text-primary uppercase tracking-widest">Global Dynamic Pricing</h4>
                <p className="text-[9px] font-bold text-text-tertiary uppercase tracking-widest opacity-60 italic">Location-aware fee mapping</p>
              </div>
            </div>
            <button className="text-[10px] font-black text-accent uppercase tracking-widest hover:underline">
              Configure
            </button>
          </div>
        </section>
      </div>
    </div>
  );
};
