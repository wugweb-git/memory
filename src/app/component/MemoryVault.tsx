"use client";
import React from 'react';
import { FileText, Database, Calendar, Trash2, Globe, Shield, Download, HardDrive } from 'lucide-react';
import { motion } from 'framer-motion';

const MOCK_FILES = [
  { id: '1', name: 'Identity_Architecture_Vision.pdf', type: 'PDF', size: '2.4 MB', date: '2024-04-14', status: 'Mapped' },
  { id: '2', name: 'Strategic_Manifesto.doc', type: 'DOC', size: '1.1 MB', date: '2024-04-12', status: 'Mapped' },
  { id: '3', name: 'Philosophy_Core_Logic.html', type: 'HTML', size: '450 KB', date: '2024-04-10', status: 'Processing' },
];

export const MemoryVault = () => {
  return (
    <div className="space-y-10 w-full" aria-label="Memory vault storage cluster">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 px-2">
        <div className="kinetic-text">
          <h2 className="text-2xl font-black text-text-primary tracking-tighter uppercase italic flex items-center gap-3">
             <HardDrive size={22} className="text-accent" /> Memory_Vault
          </h2>
          <p className="text-[10px] text-text-tertiary font-bold mt-1 uppercase tracking-[0.3em] opacity-60">Persistent Storage Cluster for Cognitive Fragments</p>
        </div>
        <div className="px-5 py-2 rounded-full bg-success/5 border border-success/20 text-[10px] font-black text-success flex items-center gap-3 uppercase tracking-widest shadow-sm">
           <Shield size={14} /> ENCRYPTED_AT_REST
        </div>
      </div>

      <div className="glass-panel rounded-[2.5rem] overflow-hidden border border-border-secondary shadow-2xl relative">
        <div className="absolute inset-0 grid-bg opacity-5 pointer-events-none" />
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-bg-secondary/40 border-b border-border-primary">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary">Resource_Identifier</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary text-center">Type_Alias</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary">Node_Metadata</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary">Anchor_Temporal</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] text-text-tertiary text-right">Matrix_Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-secondary">
              {MOCK_FILES.map((file, idx) => (
                <motion.tr 
                  initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
                  key={file.id} 
                  className="group hover:bg-black/[0.01] transition-all duration-500"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-bg-secondary/50 border border-border-primary flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                        <FileText size={18} className="text-accent" />
                      </div>
                      <span className="text-sm font-black text-text-primary tracking-tight kinetic-text cursor-default">{file.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <span className="text-[10px] px-3 py-1 rounded-lg bg-bg-secondary border border-border-primary text-text-tertiary font-black tracking-widest uppercase italic">{file.type}</span>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-3">
                       <div className={`w-2 h-2 rounded-full ${file.status === 'Mapped' ? 'bg-success' : 'bg-warning animate-pulse'}`} />
                       <span className="text-[10px] font-black font-mono text-text-tertiary uppercase tracking-tighter opacity-80">{file.size}{' // '}{file.status}</span>
                     </div>
                  </td>
                  <td className="px-8 py-6 text-xs font-black font-mono text-text-tertiary tracking-widest italic opacity-60">
                    {file.date}
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0">
                      <button className="w-9 h-9 rounded-xl hover:bg-black hover:text-bg-primary text-text-tertiary transition-all flex items-center justify-center border border-transparent hover:border-black active:scale-90 shadow-sm">
                        <Download size={16} />
                      </button>
                      <button className="w-9 h-9 rounded-xl hover:bg-danger hover:text-bg-primary text-text-tertiary transition-all flex items-center justify-center border border-transparent hover:border-danger active:scale-90 shadow-sm">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         <motion.div 
            whileHover={{ y: -5 }}
            className="p-8 rounded-[2rem] border border-border-secondary bg-bg-secondary/30 shadow-xl group"
         >
            <div className="flex items-center gap-3 mb-6">
              <Database size={18} className="text-accent group-hover:rotate-12 transition-transform" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Storage_Matrix_Density</span>
            </div>
            <div className="h-2 bg-secondary rounded-full overflow-hidden mb-4 p-[1.5px] border border-border-primary shadow-inner">
              <motion.div initial={{ width: 0 }} animate={{ width: '34%' }} className="h-full bg-accent-high opacity-80 rounded-full" />
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
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-text-tertiary">Integrity_Safety_Protocol</span>
            </div>
            <div className="flex flex-col gap-2">
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-text-disabled uppercase">Encryption</span>
                  <span className="text-[10px] font-black text-success uppercase">AES-GCM_ACTIVE</span>
               </div>
               <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-text-disabled uppercase">Sync_State</span>
                  <span className="text-[10px] font-black text-success uppercase italic">Nominal</span>
               </div>
            </div>
         </motion.div>
      </div>
    </div>
  );
};
