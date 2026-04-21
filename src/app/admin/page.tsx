"use client";

import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, Database, Save, FileEdit, Settings, 
  RefreshCcw, ChevronLeft, LayoutDashboard, Zap, 
  Trash2, Plus, Search, HelpCircle, Activity,
  Globe, Github, Youtube, Linkedin, Instagram,
  Facebook, Twitter, Mail, CheckCircle2, X,
  Calendar, Video, Folder, File, Grid, List,
  ArrowUpRight, ExternalLink, MoreVertical,
  Terminal, Sliders, Fingerprint, Sparkles,
  Command, Power, Bell, User, Edit3, Brain, ArrowRight, MessageSquare
} from 'lucide-react';
import { JetBrains_Mono, Inter } from 'next/font/google';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
const inter = Inter({ subsets: ['latin'] });

export default function AdminConsole() {
  const [targetBlock, setTargetBlock] = useState('Prism Overview');
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditResults, setAuditResults] = useState<any>(null);
  
  const [checklist, setChecklist] = useState([
     { id: 1, text: 'Add calendar & meeting link', completed: true },
     { id: 2, text: 'Let followers support your work', completed: false },
     { id: 3, text: 'Add position on LinkedIn', completed: false },
     { id: 4, text: 'Enable dynamic pricing nodes', completed: false },
     { id: 5, text: 'Initialize Neural Avatar', completed: false },
     { id: 6, text: 'Calibrate Semantic Bio', completed: false },
     { id: 7, text: 'Bridge Twitter Sync', completed: false },
     { id: 8, text: 'Deploy Service Lattice', completed: false },
     { id: 9, text: 'Audit Memory Quarantine', completed: false },
     { id: 10, text: 'Test Neural Chat reflex', completed: false },
     { id: 11, text: 'Harden L4 Logic Gates', completed: false },
     { id: 12, text: 'Sync GitHub Repository', completed: false },
     { id: 13, text: 'Broadcast YouTube Feed', completed: false },
     { id: 14, text: 'Achieve Matrix Alignment', completed: false },
  ]);

  const runAudit = async () => {
    setIsAuditing(true);
    try {
      const res = await fetch('/api/admin/semantic-diagnose', { method: 'POST' });
      const data = await res.json();
      setAuditResults(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAuditing(false);
    }
  };

  const sidebarItems = [
    { section: 'Manage', items: [
      { id: 'Home', icon: <Grid size={18} />, label: 'Home' },
      { id: 'Memory', icon: <Database size={18} />, label: 'Memory' },
      { id: 'Services', icon: <Database size={18} />, label: 'Services' },
      { id: 'Calendar', icon: <Calendar size={18} />, label: 'Calendar' },
    ]},
    { section: 'Identity', items: [
      { id: 'Edit Profile', icon: <User size={18} />, label: 'Edit Profile', href: '/admin/profile' },
      { id: 'Settings', icon: <Settings size={18} />, label: 'Settings' },
    ]}
  ];

  return (
    <div className={`min-h-screen bg-[#FDFDFB] text-[#1A1A1A] flex flex-col ${inter.className}`}>
      <header className="h-20 border-b border-[#F0F0EE] bg-white/80 backdrop-blur-3xl flex items-center justify-between px-10 shrink-0 z-50 sticky top-0">
         <div className="flex items-center gap-8">
            <Link href="/" className="group flex items-center gap-3">
               <div className="w-10 h-10 rounded-2xl bg-black flex items-center justify-center text-white shadow-xl group-hover:scale-110 transition-transform">
                  <Command size={20} />
               </div>
               <div className="flex flex-col">
                  <h1 className="text-[13px] font-black tracking-[0.2em] uppercase italic">Creator Dashboard</h1>
                  <p className={`text-[9px] ${jetBrains.className} text-[#A0A09E] uppercase tracking-widest`}>Node: CONFIG_NODE_ALPHA</p>
               </div>
            </Link>
         </div>
         
         <div className="flex items-center gap-6">
            <div className={`flex items-center gap-2 px-4 py-2 rounded-full border text-[10px] font-black tracking-widest uppercase italic transition-all ${auditResults ? 'bg-success/5 border-success/20 text-success' : 'bg-[#F5F5F3] border-[#E0E0DE] text-[#1A1A1A]'}`}>
               <ShieldCheck size={12} /> {auditResults ? 'Matrix_Aligned' : 'System_Secure'}
            </div>
            <div className="w-px h-8 bg-[#E0E0DE]" />
            <button className="p-2 hover:bg-[#F5F5F3] rounded-xl transition-all relative">
               <Bell size={20} className="text-[#888886]" />
               <div className="absolute top-2 right-2 w-2 h-2 bg-accent rounded-full border-2 border-white" />
            </button>
            <button className="flex items-center gap-3 pl-2 pr-4 py-2 rounded-2xl bg-white border border-[#E0E0DE] hover:border-[#1A1A1A] transition-all group">
               <div className="w-8 h-8 rounded-xl bg-[#F5F5F3] overflow-hidden border border-[#E0E0DE]">
                  <img src="https://ui-avatars.com/api/?name=VS&background=F5F5F0&color=1A1A1A&bold=true" alt="User" />
               </div>
               <span className="text-[11px] font-black uppercase tracking-widest hidden md:block">Vedanshu</span>
            </button>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
         <aside className="w-80 border-r border-[#F0F0EE] bg-white p-10 flex flex-col gap-12 overflow-y-auto">
            <button onClick={runAudit} disabled={isAuditing} className="w-full py-4 bg-accent text-white rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-accent/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3">
               {isAuditing ? <RefreshCcw size={16} className="animate-spin" /> : <Sparkles size={16} />} 
               Run System Audit
            </button>

            {sidebarItems.map(section => (
               <div key={section.section} className="space-y-6">
                  <h3 className="text-[10px] font-black text-[#A0A09E] tracking-[0.4em] uppercase px-4">{section.section}</h3>
                  <div className="space-y-2">
                     {section.items.map(item => {
                       const isActive = targetBlock === item.id;
                       return (
                         <div key={item.id} className="relative group">
                           {item.href ? (
                             <Link href={item.href} className={`flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all ${isActive ? 'bg-[#F2F2ED] text-[#1A1A1A]' : 'text-[#666664] hover:bg-[#FBFBFA] hover:text-[#1A1A1A]'}`}>
                                {item.icon} {item.label}
                             </Link>
                           ) : (
                             <button onClick={() => setTargetBlock(item.id)} className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl text-[11px] font-black tracking-widest uppercase transition-all ${isActive ? 'bg-[#F2F2ED] text-[#1A1A1A]' : 'text-[#666664] hover:bg-[#FBFBFA] hover:text-[#1A1A1A]'}`}>
                                {item.icon} {item.label}
                             </button>
                           )}
                         </div>
                       );
                     })}
                  </div>
               </div>
            ))}
         </aside>

         <main className="flex-1 overflow-y-auto bg-[#FBFBFA]">
            <div className="max-w-[1200px] mx-auto p-12 lg:p-20 space-y-16 pb-40">
               <header className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                  <div className="space-y-2">
                     <div className="flex items-center gap-3 text-accent mb-2">
                        <div className="w-2 h-2 rounded-full bg-accent animate-ping" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em]">System.Status: Active</span>
                     </div>
                     <h2 className="text-4xl font-black italic tracking-tighter uppercase leading-tight">{targetBlock}</h2>
                     <p className="text-[#888886] text-xs font-bold uppercase tracking-widest">Node: {targetBlock.replace(' ', '_').toUpperCase()} // LAYER_ADMIN</p>
                  </div>
               </header>

               <AnimatePresence mode="wait">
                  <motion.div key={targetBlock} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-16">
                     {targetBlock === 'Home' || targetBlock === 'Prism Overview' ? (
                        <div className="space-y-16">
                           <div className="bg-white rounded-[3rem] p-12 border border-[#E0E0DE] relative overflow-hidden shadow-2xl group">
                              <div className="flex items-center gap-8 mb-16">
                                 <div className="w-16 h-16 rounded-2xl bg-black flex items-center justify-center text-white shadow-xl">
                                    <Sparkles size={32} />
                                 </div>
                                 <div className="space-y-1">
                                    <h3 className="text-2xl font-black italic tracking-tighter uppercase">Launch Sequence [14 Nodes]</h3>
                                    <p className="text-[#888886] text-xs font-bold uppercase tracking-[0.3em]">Identity Alignment Progress</p>
                                 </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                 {checklist.map(item => (
                                    <button
                                       key={item.id}
                                       onClick={() => setChecklist(prev => prev.map(c => c.id === item.id ? { ...c, completed: !c.completed } : c))}
                                       className="p-6 rounded-[1.5rem] bg-[#FDFDFB] border border-[#E0E0DE] flex items-center justify-between group/item hover:border-[#1A1A1A] transition-all text-left w-full">
                                       <div className="flex items-center gap-5">
                                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${item.completed ? 'bg-success/10 border-success/40 text-success' : 'bg-white border-[#E0E0DE] text-[#E0E0DE]'}`}>
                                             {item.completed ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border-2 border-dashed border-[#E0E0DE]" />}
                                          </div>
                                          <span className={`text-[11px] font-black uppercase tracking-wider ${item.completed ? 'text-[#A0A09E] line-through' : 'text-[#1A1A1A]'}`}>
                                             {item.id.toString().padStart(2, '0')} // {item.text}
                                          </span>
                                       </div>
                                       <ArrowUpRight size={14} className="text-[#E0E0DE] group-hover/item:text-[#1A1A1A]" />
                                    </button>
                                 ))}
                              </div>
                           </div>

                           {/* 20-Point Diagnostic HUD */}
                           {auditResults && (
                             <div className="bg-[#1A1A1A] rounded-[3rem] p-12 text-white space-y-12 shadow-3xl border border-white/5 relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-1/2 h-full bg-accent/5 blur-[120px] pointer-events-none" />
                                <div className="flex items-center justify-between relative z-10">
                                   <div className="space-y-2">
                                      <h3 className="text-2xl font-black italic tracking-tighter uppercase flex items-center gap-4">
                                         <Activity className="text-accent" /> 20-Point Semantic Audit
                                      </h3>
                                      <p className="text-[#888886] text-[10px] font-black uppercase tracking-[0.4em]">Audit_ID: {auditResults.audit_id}</p>
                                   </div>
                                   <div className="text-right">
                                      <p className="text-4xl font-black italic text-accent">{auditResults.passed}/20</p>
                                      <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Nodes Verified</p>
                                   </div>
                                </div>

                                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4 relative z-10">
                                   {auditResults.results.map((r: any, i: number) => (
                                     <div key={i} className={`p-4 rounded-2xl border transition-all ${r.status === 'PASS' ? 'bg-white/5 border-white/10' : 'bg-danger/10 border-danger/20'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                           <span className={`text-[9px] font-black font-mono tracking-tighter ${r.status === 'PASS' ? 'text-accent' : 'text-danger'}`}>{i + 1}</span>
                                           {r.status === 'PASS' ? <CheckCircle2 size={12} className="text-accent" /> : <X size={12} className="text-danger" />}
                                        </div>
                                        <p className="text-[9px] font-black uppercase tracking-widest truncate leading-tight">{r.name}</p>
                                     </div>
                                   ))}
                                </div>
                             </div>
                           )}

                           <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                               {[
                                  { label: 'Uplink_Flux', val: '98.4%', icon: Zap, color: 'text-accent' },
                                  { label: 'Memory_Matrix', val: `${auditResults?.metrics?.relationships_created || '4.2k'} Synapses`, icon: Database, color: 'text-[#444442]' },
                                  { label: 'Pending_Queue', val: auditResults?.metrics?.pending_edges_created || '14', icon: Activity, color: 'text-success' },
                               ].map(stat => (
                                 <div key={stat.label} className="bg-white p-10 rounded-[2.5rem] border border-[#E0E0DE] space-y-6 shadow-sm hover:shadow-xl transition-all">
                                     <div className="flex items-center justify-between">
                                        <stat.icon size={24} className={stat.color} />
                                        <div className="w-1 h-8 bg-[#F0F0EE] rounded-full" />
                                     </div>
                                     <div className="space-y-1">
                                        <p className="text-[10px] font-black text-[#A0A09E] tracking-[0.3em] uppercase">{stat.label}</p>
                                        <p className="text-2xl font-black text-[#1A1A1A] italic tracking-tighter">{stat.val}</p>
                                     </div>
                                 </div>
                               ))}
                           </div>
                        </div>
                     ) : (
                        <div className="min-h-[500px] flex flex-col items-center justify-center text-center space-y-10">
                           <div className="w-40 h-40 rounded-full bg-white border border-[#E0E0DE] flex items-center justify-center text-[#E0E0DE] relative overflow-hidden">
                              <div className="absolute inset-0 bg-accent/5 blur-xl animate-pulse" />
                              <Command size={60} className="relative z-10" />
                           </div>
                           <div className="space-y-4">
                              <h3 className="text-2xl font-black italic tracking-tighter uppercase italic">{targetBlock} Sync</h3>
                              <button onClick={() => setTargetBlock('Home')} className="px-10 py-4 bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-accent transition-all">
                                Establish Matrix Sync
                              </button>
                           </div>
                        </div>
                     )}
                  </motion.div>
               </AnimatePresence>
            </div>
         </main>
      </div>
    </div>
  );
}

