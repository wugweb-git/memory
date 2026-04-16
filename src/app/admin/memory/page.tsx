'use client';

import RagTester from './components/RagTester';
import MemoryExplorer from './components/MemoryExplorer';
import IngestionMonitor from './components/IngestionMonitor';
import EmbeddingMonitor from './components/EmbeddingMonitor';
import { Shield, Brain, Layers, Cpu } from 'lucide-react';

/**
 * IDENTITY PRISM: SYSTEM CONTROL SURFACE (LAYER 1)
 * -----------------------------------------------
 * The primary operations center for the Memory and RAG systems.
 * Provides real-time visibility into ingestion, normalization, indexing, and retrieval.
 */
export default function AdminMemoryPage() {
  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      {/* HEADER */}
      <header className="mb-12 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-amber-500 rounded-lg">
              <Brain className="w-6 h-6 text-black" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">System Control Surface</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Shield className="w-4 h-4" /> Layer 1: Memory Locked
            </span>
            <span className="text-gray-600">|</span>
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <Layers className="w-4 h-4" /> Layer 1.2: RAG Active
            </span>
            <span className="text-gray-600">|</span>
            <span className="flex items-center gap-1.5 text-gray-500 font-medium italic">
              <Cpu className="w-4 h-4" /> Layer 2: Deactivated (Migration Phase)
            </span>
          </div>
        </div>
        <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-gray-400">
          L1 Monitoring Mode • 1.2k req/min
        </div>
      </header>

      <div className="grid grid-cols-12 gap-10">
        {/* LEFT COLUMN: SYSTEM STATUS & HEALTH */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
          <IngestionMonitor />
          <EmbeddingMonitor />
          <div className="p-6 bg-gradient-to-br from-indigo-500/5 to-transparent border border-white/10 rounded-xl">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">L1 Hardening Status</h3>
             <ul className="space-y-3 text-xs">
                <li className="flex items-center justify-between text-emerald-400">
                   <span>At-Rest Encryption</span>
                   <Shield className="w-3 h-3" />
                </li>
                <li className="flex items-center justify-between text-blue-400">
                   <span>Vector Sync (RAG)</span>
                   <Layers className="w-3 h-3" />
                </li>
                <li className="flex items-center justify-between text-gray-500">
                   <span>Interpretation Engine</span>
                   <span>MIGRATED</span>
                </li>
             </ul>
          </div>
        </div>

        {/* RIGHT COLUMN: RAG TOOLS & EXPLORER */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-10">
          <RagTester />
          <MemoryExplorer />
        </div>
      </div>

      <footer className="mt-20 py-8 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600 uppercase tracking-[0.2em] font-bold">
        <span>Identity Prism OS • Layer 1 Operations Center</span>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">L1 Audit Logs</a>
          <a href="#" className="hover:text-white transition-colors">Security Policy</a>
        </div>
      </footer>
    </div>
  );
}
