"use client";
import React, { useState } from 'react';
import { 
  FileText, Database, Calendar, Trash2, Globe, 
  Shield, Download, HardDrive, LayoutGrid, List,
  MoreVertical, Search, Plus, Filter, FileJson, 
  FileCode, Image as ImageIcon, Music, Video as VideoIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const MOCK_FILES = [
  { id: '1', name: 'Identity_Architecture_Vision.pdf', type: 'PDF', size: '2.4 MB', date: '2024-04-14', status: 'Mapped', category: 'Documents' },
  { id: '2', name: 'Strategic_Manifesto.doc', type: 'DOC', size: '1.1 MB', date: '2024-04-12', status: 'Mapped', category: 'Documents' },
  { id: '3', name: 'Philosophy_Core_Logic.html', type: 'HTML', size: '450 KB', date: '2024-04-10', status: 'Processing', category: 'Code' },
  { id: '4', name: 'Neural_Network_Map.png', type: 'PNG', size: '8.2 MB', date: '2024-04-15', status: 'Mapped', category: 'Images' },
  { id: '5', name: 'System_Prompt_v4.json', type: 'JSON', size: '12 KB', date: '2024-04-16', status: 'Mapped', category: 'Data' },
];

const CATEGORIES = ['All', 'Documents', 'Images', 'Code', 'Data', 'Others'];

const FileIcon = ({ type, name }: { type: string, name?: string }) => {
  switch (type) {
    case 'PDF': return <FileText className="text-danger" size={24} />;
    case 'JSON': return <FileJson className="text-warning" size={24} />;
    case 'HTML': 
    case 'JS': return <FileCode className="text-accent" size={24} />;
    case 'PNG':
    case 'JPG': return (
      <div className="w-full h-full relative overflow-hidden flex items-center justify-center">
        <ImageIcon className="text-success absolute z-10 opacity-20" size={20} />
        <div className="absolute inset-0 bg-gradient-to-br from-success/20 to-transparent" />
        <div className="w-full h-full bg-[url('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100&q=80')] bg-cover bg-center" />
      </div>
    );
    default: return <Database className="text-text-tertiary" size={24} />;
  }
};

export const MemoryVault = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredFiles = MOCK_FILES.filter(file => 
    (activeCategory === 'All' || file.category === activeCategory) &&
    file.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-10 w-full" aria-label="Memory vault storage cluster">
      {/* Header & Controls */}
      <div className="flex flex-col gap-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-4">
          <div className="kinetic-text">
            <h2 className="text-4xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-5">
               <div className="p-3 rounded-2xl bg-accent/10 border border-accent/20">
                 <HardDrive size={28} className="text-accent" />
               </div>
               Memory_Vault
            </h2>
            <p className="text-[11px] text-text-tertiary font-black mt-3 uppercase tracking-[0.5em] opacity-40">Persistence // L1 Storage Cluster</p>
          </div>
          <div className="flex items-center gap-4">
             <button className="px-8 py-3 rounded-2xl bg-text-primary text-bg-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-3 hover:scale-105 active:scale-95 transition-all shadow-2xl">
                <Plus size={16} /> New_Neural_Drop
             </button>
             <div className="px-6 py-3 rounded-2xl bg-bg-secondary border border-border-primary text-[10px] font-black text-success flex items-center gap-3 uppercase tracking-widest shadow-inner">
                <Shield size={16} className="opacity-60" /> Encrypted link
             </div>
          </div>
        </div>

        {/* Toolbar */}
        <div className="flex flex-col xl:flex-row gap-6 px-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-text-disabled group-focus-within:text-accent transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="Query persistent fragments..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-bg-secondary/30 border-2 border-border-primary/50 rounded-2xl py-4 pl-14 pr-6 text-sm font-black tracking-tight focus:outline-none focus:border-accent/40 focus:ring-4 focus:ring-accent/5 transition-all outline-none"
            />
          </div>
          
          <div className="flex items-center gap-3 overflow-x-auto pb-4 xl:pb-0 scrollbar-hide">
            {CATEGORIES.map(cat => (
              <button 
                key={cat}
                onClick={() => setActiveCategory(cat)}
                className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all whitespace-nowrap border ${
                  activeCategory === cat 
                  ? 'bg-accent border-accent text-bg-primary shadow-xl shadow-accent/20' 
                  : 'bg-bg-secondary border-border-primary text-text-tertiary hover:bg-bg-elevated hover:text-text-primary'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="flex items-center bg-bg-secondary/40 border border-border-primary p-1.5 rounded-2xl backdrop-blur-md">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-bg-elevated text-accent shadow-inner' : 'text-text-disabled hover:text-text-tertiary'}`}
            >
              <LayoutGrid size={20} />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-bg-elevated text-accent shadow-inner' : 'text-text-disabled hover:text-text-tertiary'}`}
            >
              <List size={20} />
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'list' ? (
          <motion.div 
            key="list"
            initial={{ opacity: 0, filter: 'blur(10px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} exit={{ opacity: 0, filter: 'blur(10px)' }}
            className="glass-panel rounded-[3rem] overflow-hidden border border-border-secondary shadow-3xl bg-bg-secondary/[0.02]"
          >
            <div className="overflow-x-auto scrollbar-hide">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-bg-secondary/40 border-b border-border-primary">
                    <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-text-tertiary">Memory_Block</th>
                    <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-text-tertiary text-center">Protocol</th>
                    <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-text-tertiary">Neural_Link</th>
                    <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-text-tertiary">Sensed_At</th>
                    <th className="px-10 py-8 text-[11px] font-black uppercase tracking-[0.3em] text-text-tertiary text-right">Integrity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-secondary/30">
                  {filteredFiles.map((file, idx) => (
                    <motion.tr 
                      initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                      key={file.id} 
                      className="group hover:bg-accent/[0.02] transition-colors duration-500 cursor-pointer"
                    >
                      <td className="px-10 py-8">
                        <div className="flex items-center gap-6">
                          <div className="w-12 h-12 rounded-2xl bg-bg-secondary border border-border-primary flex items-center justify-center shadow-inner group-hover:border-accent/40 group-hover:scale-110 transition-all duration-500 overflow-hidden">
                            <FileIcon type={file.type} name={file.name} />
                          </div>
                          <div className="space-y-1">
                            <span className="text-sm font-black text-text-primary tracking-tight block group-hover:text-accent transition-colors">{file.name}</span>
                            <span className="text-[10px] text-text-disabled uppercase tracking-widest font-bold opacity-40">{file.category}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-10 py-8 text-center text-[10px] font-black font-mono text-text-tertiary uppercase tracking-tighter opacity-60 italic">
                        {file.type}
                      </td>
                      <td className="px-10 py-8">
                         <div className="flex flex-col gap-2">
                           <div className="flex items-center gap-3">
                             <div className={`w-2 h-2 rounded-full ${file.status === 'Mapped' ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-warning animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]'}`} />
                             <span className="text-[11px] font-black text-text-primary uppercase tracking-widest">{file.status}</span>
                           </div>
                           <span className="text-[9px] font-bold text-text-disabled uppercase font-mono pl-5">{file.size}</span>
                         </div>
                      </td>
                      <td className="px-10 py-8 text-xs font-black font-mono text-text-tertiary tracking-[0.2em] italic opacity-40">
                        {file.date}
                      </td>
                      <td className="px-10 py-8 text-right">
                        <div className="flex items-center justify-end gap-3 translate-x-4 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-500">
                          <button className="w-10 h-10 rounded-2xl bg-bg-secondary border border-border-primary flex items-center justify-center hover:bg-accent hover:text-bg-primary hover:border-accent transition-all">
                            <Download size={16} />
                          </button>
                          <button className="w-10 h-10 rounded-2xl bg-bg-secondary border border-border-primary flex items-center justify-center hover:bg-danger hover:text-bg-primary hover:border-danger transition-all">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            key="grid"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 1.05 }}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-8 px-2"
          >
            {filteredFiles.map((file, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                key={file.id}
                className="group relative glass-panel p-8 rounded-[2.5rem] border border-border-secondary hover:border-accent/40 hover:bg-accent/[0.01] transition-all duration-700 cursor-pointer overflow-hidden shadow-2xl"
              >
                {/* Visual Accent */}
                <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 blur-[50px] pointer-events-none group-hover:bg-accent/10 transition-all duration-700" />
                
                <div className="relative z-10 space-y-8">
                  <div className="flex items-start justify-between">
                    <div className="w-16 h-16 rounded-[1.5rem] bg-bg-secondary border border-border-primary flex items-center justify-center shadow-xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 overflow-hidden">
                       <FileIcon type={file.type} name={file.name} />
                    </div>
                    <button className="p-3 rounded-2xl bg-bg-secondary border border-border-primary text-text-tertiary hover:text-accent opacity-0 group-hover:opacity-100 transition-all">
                       <MoreVertical size={18} />
                    </button>
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-base font-black text-text-primary tracking-tight line-clamp-2 leading-tight group-hover:text-accent transition-colors">{file.name}</h3>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black font-mono text-text-tertiary uppercase tracking-widest opacity-60 italic">{file.type}</span>
                      <span className="w-1 h-1 rounded-full bg-border-primary" />
                      <span className="text-[10px] font-black font-mono text-text-tertiary uppercase tracking-widest opacity-60 italic">{file.size}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-6 border-t border-border-primary/40">
                    <div className="flex items-center gap-2.5">
                       <div className={`w-2 h-2 rounded-full ${file.status === 'Mapped' ? 'bg-success shadow-[0_0_8px_rgba(16,185,129,0.4)]' : 'bg-warning animate-pulse'}`} />
                       <span className="text-[10px] font-black text-text-disabled uppercase tracking-widest italic">{file.status}</span>
                    </div>
                    <span className="text-[10px] font-black text-text-tertiary font-mono opacity-50 tracking-tighter">{file.date}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      
      {/* Footer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <motion.div 
            whileHover={{ y: -5 }}
            className="p-8 rounded-[2rem] border border-border-secondary bg-bg-secondary/30 shadow-xl group"
         >
            <div className="flex items-center gap-3 mb-6">
              <Database size={18} className="text-accent group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Storage_Matrix_Density</span>
            </div>
            <div className="h-2 bg-primary/40 rounded-full overflow-hidden mb-4 p-[1.5px] border border-border-primary shadow-inner">
              <motion.div initial={{ width: 0 }} animate={{ width: '34%' }} className="h-full bg-accent opacity-80 rounded-full" />
            </div>
            <div className="flex justify-between text-[10px] font-black font-mono text-text-tertiary tracking-widest uppercase opacity-60 italic">
              <span>3.4 GB Mapped</span>
              <span>10.0 GB Limit</span>
            </div>
         </motion.div>

         <motion.div 
            whileHover={{ y: -5 }}
            className="p-8 rounded-[2rem] border border-border-secondary bg-bg-secondary/30 shadow-xl group"
         >
            <div className="flex items-center gap-3 mb-6">
              <Shield size={18} className="text-success" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Integrity_Safety</span>
            </div>
            <div className="flex flex-col gap-3">
               <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-text-disabled uppercase tracking-widest">Protocol</span>
                  <span className="text-[9px] font-black text-success uppercase">AES-GCM_256</span>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-[9px] font-black text-text-disabled uppercase tracking-widest">Redundancy</span>
                  <span className="text-[9px] font-black text-success uppercase">3x_CLOUD_SYNC</span>
               </div>
            </div>
         </motion.div>
      </div>
    </div>
  );
};

