"use client";
import React from 'react';
import { FileText, Database, Calendar, Trash2, Globe, Shield, Download } from 'lucide-react';
import { JetBrains_Mono } from 'next/font/google';

const jetBrains = JetBrains_Mono({ subsets: ['latin'] });

const MOCK_FILES = [
  { id: '1', name: 'Identity_Architecture_Vision.pdf', type: 'PDF', size: '2.4 MB', date: '2024-04-14', status: 'Mapped' },
  { id: '2', name: 'Strategic_Manifesto.doc', type: 'DOC', size: '1.1 MB', date: '2024-04-12', status: 'Mapped' },
  { id: '3', name: 'Philosophy_Core_Logic.html', type: 'HTML', size: '450 KB', date: '2024-04-10', status: 'Processing' },
];

export const MemoryVault = () => {
  return (
    <div className="space-y-8 max-w-6xl mx-auto w-full py-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white mb-1">Memory Vault</h2>
          <p className="text-zinc-500 text-xs tracking-widest uppercase">Persistent storage cluster for cognitive fragments</p>
        </div>
        <div className="flex items-center gap-3">
           <span className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-bold text-emerald-400 flex items-center gap-2">
             <Shield size={12} /> ENCRYPTED_AT_REST
           </span>
        </div>
      </div>

      <div className="glass-card rounded-2xl overflow-hidden border border-white/5 bg-black/40">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-white/5 bg-white/[0.02]">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Resource Name</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Type</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Metadata</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500">Anchored Date</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-zinc-500 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-white/5 ${jetBrains.className}`}>
            {MOCK_FILES.map((file) => (
              <tr key={file.id} className="group hover:bg-white/[0.01] transition-colors">
                <td className="px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#00E5FF]/5 border border-[#00E5FF]/10 flex items-center justify-center">
                      <FileText size={14} className="text-[#00E5FF]" />
                    </div>
                    <span className="text-sm font-medium text-zinc-200">{file.name}</span>
                  </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 border border-white/10 text-zinc-400 font-bold">{file.type}</span>
                </td>
                <td className="px-6 py-5">
                   <div className="flex items-center gap-2">
                     <div className="w-1.5 h-1.5 rounded-full bg-[#00E5FF] animate-pulse" />
                     <span className="text-[10px] text-zinc-500">{file.size} // {file.status}</span>
                   </div>
                </td>
                <td className="px-6 py-5">
                  <span className="text-xs text-zinc-500 tracking-tighter uppercase">{file.date}</span>
                </td>
                <td className="px-6 py-5 text-right">
                  <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-white transition-colors">
                      <Download size={14} />
                    </button>
                    <button className="p-2 rounded-lg hover:bg-white/5 text-zinc-500 hover:text-red-500 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="p-6 rounded-2xl border border-white/5 bg-white/[0.02]">
           <div className="flex items-center gap-3 mb-4">
             <Database size={16} className="text-[#00E5FF]" />
             <span className="text-[10px] font-black uppercase tracking-widest text-white">Storage Capacity</span>
           </div>
           <div className="h-1.5 bg-white/5 rounded-full overflow-hidden mb-2">
             <div className="h-full bg-[#00E5FF] w-[34%]" />
           </div>
           <div className="flex justify-between text-[10px] font-bold text-zinc-500">
             <span>3.4 GB Mapped</span>
             <span>10.0 GB Limit</span>
           </div>
         </div>
      </div>
    </div>
  );
};
