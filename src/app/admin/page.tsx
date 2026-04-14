"use client";

import React, { useState } from 'react';
import { 
  ShieldCheck, Database, Save, FileEdit, Settings, 
  RefreshCcw, ChevronLeft, LayoutDashboard, Zap, 
  Trash2, Plus, Search, HelpCircle, Activity,
  Globe, Github, Youtube, Linkedin, Instagram,
  Facebook, Twitter, Mail, CheckCircle2, X,
  Calendar, Video, Folder, File, Grid, List,
  ArrowUpRight, ExternalLink, MoreVertical,
  Terminal, Sliders, Fingerprint, Sparkles
} from 'lucide-react';
import { JetBrains_Mono, Outfit } from 'next/font/google';
import Link from 'next/link';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });
const outfit = Outfit({ subsets: ['latin'] });

export default function AdminConsole() {
  const [targetBlock, setTargetBlock] = useState('Prism Overview');
  const [checklist, setChecklist] = useState([
     { id: 1, text: 'Add calendar & meeting link', completed: true },
     { id: 2, text: 'Let followers support your work', completed: false, expandable: true },
     { id: 3, text: 'Add position on LinkedIn', completed: false },
  ]);

  return (
    <div className={`min-h-screen bg-[#030303] text-zinc-100 flex flex-col ${outfit.className}`}>
      {/* System Header */}
      <header className="h-20 border-b border-white/[0.06] bg-black/40 backdrop-blur-3xl flex items-center justify-between px-10 shrink-0 z-50">
         <div className="flex items-center gap-6">
            <Link href="/" className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-zinc-400 hover:text-white transition-all">
               <ChevronLeft size={20} />
            </Link>
            <div className="flex flex-col">
               <h1 className="text-[13px] font-black tracking-[0.2em] uppercase">Identity_Prism_Architect</h1>
               <p className={`text-[9px] ${jetBrains.className} text-zinc-600 uppercase tracking-widest`}>Node: CONFIG_NODE_ALPHA // Status: ROOT_ACCESS</p>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="flex items-center gap-3 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-black text-emerald-500 tracking-widest uppercase italic">
               <ShieldCheck size={12} /> System_Secure
            </div>
            <button className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-red-500/60 hover:text-red-500 transition-colors">
               <Zap size={18} />
            </button>
         </div>
      </header>

      <div className="flex-1 flex overflow-hidden">
         {/* System Sidebar */}
         <aside className="w-72 border-r border-white/[0.06] bg-black/20 p-8 flex flex-col gap-10">
            <div className="space-y-4">
               <h3 className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase mb-6 px-2">Core Architect</h3>
               {['Prism Overview', 'Venture DNA', 'Identity Pillars'].map(view => (
                  <button 
                    key={view} 
                    onClick={() => setTargetBlock(view)}
                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-[11px] font-black tracking-widest transition-all uppercase ${
                      targetBlock === view ? 'bg-[#00E5FF]/10 text-[#00E5FF] border border-[#00E5FF]/20 shadow-[0_0_20px_rgba(0,229,255,0.05)]' : 'text-zinc-600 hover:bg-white/5'
                    }`}
                  >
                    {view}
                  </button>
               ))}
            </div>

            <div className="space-y-4 border-t border-white/[0.06] pt-8">
               <h3 className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase mb-6 px-2">Memory Engines</h3>
               {['Neural Hub', 'Memory Browser', 'Sync Monitor', 'Style DNA'].map(engine => (
                  <button 
                    key={engine}
                    onClick={() => setTargetBlock(engine)}
                    className={`w-full text-left px-5 py-3.5 rounded-2xl text-[11px] font-black tracking-widest transition-all uppercase ${
                      targetBlock === engine ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' : 'text-zinc-600 hover:bg-white/5'
                    }`}
                  >
                    {engine}
                  </button>
               ))}
            </div>
         </aside>

         {/* Content Area */}
         <main className="flex-1 overflow-y-auto custom-scrollbar bg-white/[0.01]">
            <div className="max-w-6xl mx-auto p-12 space-y-12 pb-32">
               
               {targetBlock === 'Prism Overview' && (
                 <div className="space-y-12">
                   {/* Advanced Checklist Mockup */}
                   <div className="glass-panel rounded-[2.5rem] p-10 border border-white/[0.08] relative overflow-hidden group">
                      <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
                         <Sparkles size={120} className="text-[#00E5FF]" />
                      </div>
                      <div className="flex items-center gap-6 mb-10">
                         <div className="w-16 h-16 rounded-3xl bg-black border border-white/10 flex items-center justify-center text-zinc-500">
                            <img src="https://em-content.zobj.net/source/apple/354/teacup-without-handle_1f375.png" className="w-10 h-10 object-contain" alt="Icon" />
                         </div>
                         <div className="text-left">
                            <h2 className="text-2xl font-black tracking-tight text-white mb-1 uppercase">Advanced Checklist</h2>
                            <p className="text-zinc-500 text-[11px] font-black tracking-[0.3em] uppercase">Unlock the potential of your Identity Prism</p>
                         </div>
                      </div>

                      <div className="space-y-4">
                         {checklist.map(item => (
                            <div key={item.id} className="p-6 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between group/item hover:bg-white/[0.04] transition-all">
                               <div className="flex items-center gap-5">
                                  <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${item.completed ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-500' : 'bg-black border-white/10 text-zinc-700'}`}>
                                     {item.completed ? <CheckCircle2 size={16} /> : <div className="w-4 h-4 rounded-full border border-dashed border-zinc-700 font-sans" />}
                                  </div>
                                  <span className={`text-[13px] font-black tracking-widest uppercase ${item.completed ? 'text-zinc-400' : 'text-zinc-100'}`}>
                                     {item.text}
                                  </span>
                               </div>
                               <button className="text-zinc-700 group-hover/item:text-white transition-colors">
                                  {item.expandable ? <MoreVertical size={16} /> : <ArrowUpRight size={16} />}
                               </button>
                            </div>
                         ))}
                      </div>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-left">
                      {[
                        { label: 'Ingestion Pulse', val: '98.4%', icon: Zap, color: 'text-orange-400' },
                        { label: 'Vector Density', val: '4.2k Nodes', icon: Database, color: 'text-blue-400' },
                        { label: 'Neural Latency', val: '14ms', icon: Activity, color: 'text-emerald-400' },
                      ].map(stat => (
                        <div key={stat.label} className="glass-panel p-8 rounded-3xl border border-white/5 space-y-4">
                            <stat.icon size={20} className={stat.color} />
                            <div className="space-y-1">
                               <p className="text-[10px] font-black text-zinc-600 tracking-[0.3em] uppercase">{stat.label}</p>
                               <p className="text-xl font-black text-white">{stat.val}</p>
                            </div>
                        </div>
                      ))}
                   </div>
                 </div>
               )}

               {targetBlock === 'Neural Hub' && (
                 <div className="space-y-12">
                   {/* Social Links Mockup Adaptation */}
                   <div className="glass-panel p-12 rounded-[2.5rem] border border-white/[0.08] text-left">
                      <h3 className="text-[11px] font-black tracking-[0.3em] text-[#00E5FF] uppercase mb-12 flex items-center gap-3">
                         <Globe size={16} /> Signal Vector Allocation
                      </h3>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-10">
                         {[
                           { name: 'Instagram', icon: Instagram, placeholder: '@username', status: 'idle' },
                           { name: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/profile', status: 'idle' },
                           { name: 'LinkedIn', icon: Linkedin, placeholder: 'https://linkedin.com/in/username', status: 'active', val: 'https://www.linkedin.com/in/vedanshu' },
                           { name: 'GitHub', icon: Github, placeholder: 'https://github.com/username', status: 'active', val: 'https://github.com/v-sriv' },
                           { name: 'YouTube', icon: Youtube, placeholder: 'https://youtube.com/@channel', status: 'idle' },
                           { name: 'Twitter / X', icon: Twitter, placeholder: '@username', status: 'idle' },
                         ].map(platform => (
                           <div key={platform.name} className="space-y-4">
                              <label className="flex items-center justify-between">
                                 <span className="text-[10px] font-black text-zinc-500 tracking-[0.3em] uppercase flex items-center gap-3">
                                    <platform.icon size={14} /> {platform.name}
                                 </span>
                                 {platform.status === 'active' && (
                                   <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-2">
                                      <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" /> SYNCED
                                   </span>
                                 )}
                              </label>
                              <div className="relative group">
                                 <input 
                                   defaultValue={platform.val}
                                   placeholder={platform.placeholder}
                                   className="w-full bg-black border border-white/5 rounded-2xl py-4 px-6 text-[13px] font-medium text-white placeholder:text-zinc-800 focus:outline-none focus:border-[#00E5FF]/40 transition-all" 
                                 />
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>

                   {/* Calendar & Meeting Mockup Adaptation */}
                   <div className="glass-panel p-12 rounded-[2.5rem] border border-white/[0.08] text-left">
                      <h3 className="text-[11px] font-black tracking-[0.3em] text-[#F59E0B] uppercase mb-12 flex items-center gap-3">
                         <Calendar size={16} /> Temporal Coordination Sync
                      </h3>
                      
                      <div className="space-y-8">
                         <div className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] space-y-8">
                            <div className="flex justify-between items-center px-2">
                               <div className="space-y-1">
                                  <h4 className="text-[13px] font-black text-white uppercase tracking-widest">Connected Calendars</h4>
                                  <p className="text-[10px] text-zinc-600 font-medium tracking-wider uppercase">Avoid scheduling conflicts across professional nodes</p>
                               </div>
                               <button className="px-5 py-2.5 rounded-xl border border-dashed border-white/10 text-[10px] font-black text-zinc-500 uppercase tracking-widest hover:border-white/30 transition-all">
                                  + Add calendar
                               </button>
                            </div>

                            <div className="space-y-4">
                               {[
                                 { email: 'vedanshu.srivastava@gmail.com', primary: true },
                                 { email: 'vedanshu@wugweb.com', primary: false },
                               ].map(cal => (
                                 <div key={cal.email} className="p-6 rounded-2xl bg-black border border-white/5 flex items-center justify-between">
                                    <div className="flex items-center gap-5">
                                       <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center text-blue-500">
                                          <Calendar size={18} />
                                       </div>
                                       <div className="space-y-1">
                                          <p className="text-[12px] font-bold text-white tracking-wide">{cal.email}</p>
                                          <p className="text-[9px] font-black text-zinc-700 tracking-[0.2em] uppercase">Google Calendar</p>
                                       </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                       {cal.primary && (
                                         <span className="px-2 py-0.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[9px] font-black text-emerald-500 tracking-widest uppercase">PRIMARY</span>
                                       )}
                                       <MoreVertical size={16} className="text-zinc-700 cursor-pointer" />
                                    </div>
                                 </div>
                               ))}
                            </div>
                         </div>

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {[
                               { name: 'Zoom Pro', active: false, desc: 'Professional video conferencing for nodes', icon: Video },
                               { name: 'Google Meet', active: true, desc: 'Integrated temporal meeting sync', icon: Video },
                            ].map(loc => (
                              <div key={loc.name} className="p-8 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-between group">
                                 <div className="flex items-center gap-6">
                                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${loc.active ? 'bg-blue-500/10 text-blue-500' : 'bg-black text-zinc-800'}`}>
                                       <loc.icon size={20} />
                                    </div>
                                    <div className="space-y-1 text-left">
                                       <h4 className="text-[13px] font-black text-white uppercase tracking-widest">{loc.name}</h4>
                                       <p className="text-[10px] text-zinc-600 font-medium tracking-tight uppercase leading-tight">{loc.desc}</p>
                                    </div>
                                 </div>
                                 <div className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all duration-500 flex ${loc.active ? 'bg-[#00E5FF] justify-end' : 'bg-zinc-900 justify-start'}`}>
                                    <div className="w-4 h-4 rounded-full bg-white shadow-lg" />
                                 </div>
                              </div>
                            ))}
                         </div>
                      </div>
                   </div>
                 </div>
               )}

               {targetBlock === 'Memory Browser' && (
                 <div className="space-y-12">
                   {/* File Manager Mockup Adaptation */}
                   <div className="glass-panel p-12 rounded-[2.5rem] border border-white/[0.08] min-h-[700px] flex flex-col relative overflow-hidden">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-8 mb-12">
                         <div className="text-left">
                            <h2 className="text-2xl font-black tracking-tight text-white mb-1 uppercase">Memory Browser</h2>
                            <p className="text-zinc-500 text-[11px] font-black tracking-[0.3em] uppercase italic">Local Cache // {targetBlock === 'Memory Browser' ? '4.2k Objects' : '0 Objects'}</p>
                         </div>
                         <div className="flex items-center gap-4">
                            <div className="relative group">
                               <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-700 group-focus-within:text-[#00E5FF] transition-colors" size={16} />
                               <input 
                                 placeholder="FETCH_OBJECT_BY_HEX..." 
                                 className="bg-black border border-white/10 rounded-xl py-3 pl-12 pr-6 text-[11px] font-black tracking-widest text-[#00E5FF] focus:outline-none focus:border-[#00E5FF]/40 w-64 placeholder:text-zinc-800"
                               />
                            </div>
                            <div className="flex items-center gap-2 p-1.5 rounded-xl bg-black border border-white/5">
                               <button className="p-2 rounded-lg bg-white/10 text-white"><Grid size={16} /></button>
                               <button className="p-2 rounded-lg text-zinc-700 hover:text-white transition-colors"><List size={16} /></button>
                            </div>
                         </div>
                      </div>

                      <div className="flex flex-wrap gap-3 mb-12">
                         {['All Nodes', 'Soul Notes', 'Pulse Events', 'Video Index', 'PDF Fragments'].map(filter => (
                           <button key={filter} className="px-5 py-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-[10px] font-black text-zinc-600 tracking-widest uppercase hover:border-[#00E5FF]/40 hover:text-white transition-all">
                              {filter}
                           </button>
                         ))}
                      </div>

                      <div className="flex-1 flex flex-col items-center justify-center text-center py-20 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5">
                         <div className="relative mb-10 overflow-visible">
                            <div className="absolute -inset-10 bg-white/5 rounded-full blur-3xl" />
                            <div className="w-24 h-24 rounded-3xl bg-white/[0.02] border border-white/[0.06] flex items-center justify-center text-zinc-800">
                               <Plus size={40} strokeWidth={1} />
                            </div>
                         </div>
                         <h3 className="text-lg font-black text-zinc-400 uppercase tracking-widest mb-4">No cognitive objects yet</h3>
                         <p className="text-[11px] text-zinc-700 max-w-xs uppercase font-black leading-relaxed tracking-[0.2em]">
                            Initialize a "Spirit Note" or connect a "Pulse Sensor" to begin populating your local memory browser.
                         </p>
                         <div className="mt-10 flex gap-6">
                            <button className="px-8 py-3.5 rounded-2xl bg-white/[0.02] border border-white/5 text-[11px] font-black text-zinc-400 uppercase tracking-widest hover:border-white/20 transition-all flex items-center gap-3">
                               <Folder size={16} /> Create_Node
                            </button>
                            <button className="px-8 py-3.5 rounded-2xl bg-[#111] border border-white/10 text-[11px] font-black text-white shadow-2xl hover:scale-105 active:scale-95 transition-all text-[11px] flex items-center gap-3">
                               <File size={16} /> Ingest_Fragment
                            </button>
                         </div>
                      </div>
                   </div>
                 </div>
               )}

               {/* Add placeholders for other views ... */}
            </div>
         </main>
      </div>
    </div>
  );
}
