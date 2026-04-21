'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RagTester from './components/RagTester';
import MemoryExplorer from './components/MemoryExplorer';
import IngestionMonitor from './components/IngestionMonitor';
import EmbeddingMonitor from './components/EmbeddingMonitor';
import ActivityLog from './components/ActivityLog';
import { Shield, Brain, Layers, Cpu } from 'lucide-react';

function AdminMemoryContent() {
  const searchParams = useSearchParams();
  const testRunId = searchParams.get('test_run_id') || 'PROD';

  return (
    <div className="min-h-screen bg-black text-white p-8 font-sans">
      {/* HEADER */}
      <header className="mb-12 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-500 rounded-lg shadow-[0_0_15px_rgba(59,130,246,0.5)]">
              <Brain className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">System Control Surface</h1>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <Shield className="w-4 h-4" /> Layer 1: Locked
            </span>
            <span className="text-gray-600">|</span>
            <span className="flex items-center gap-1.5 text-blue-400 font-medium">
              <Layers className="w-4 h-4" /> Layer 2: Active
            </span>
            <span className="text-gray-600">|</span>
            <span className="flex items-center gap-1.5 text-purple-400 font-medium">
              <Cpu className="w-4 h-4" /> Layer 2.5: Hardened
            </span>
            {testRunId !== 'PROD' && (
              <>
                <span className="text-gray-600">|</span>
                <span className="flex items-center gap-1.5 text-amber-400 font-bold px-2 py-0.5 rounded border border-amber-500/20 bg-amber-500/5 uppercase tracking-widest text-[10px]">
                  Scope: {testRunId}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-xs font-mono text-gray-400">
            {testRunId === 'PROD' ? 'Live Production' : 'Validation Mode'} • Self-Healing Active
          </div>
          <p className="text-[10px] text-emerald-500 font-bold uppercase tracking-widest">System Healthy</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-10">
        {/* LEFT COLUMN: SYSTEM STATUS & HEALTH */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-10">
          <ActivityLog testRunId={testRunId} />
          <IngestionMonitor testRunId={testRunId} />
          <EmbeddingMonitor testRunId={testRunId} />
        </div>

        {/* RIGHT COLUMN: RAG TOOLS & EXPLORER */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-10">
          <RagTester testRunId={testRunId} />
          <MemoryExplorer testRunId={testRunId} />
          <div className="p-6 bg-gradient-to-br from-purple-500/5 to-transparent border border-white/10 rounded-xl">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Hardening Audit (L2.5)</h3>
             <ul className="grid grid-cols-2 gap-4 text-xs">
                <li className="flex items-center justify-between text-emerald-400">
                   <span>Adaptive Retries</span>
                   <Shield className="w-3 h-3" />
                </li>
                <li className="flex items-center justify-between text-blue-400">
                   <span>Deterministic Signals</span>
                   <Layers className="w-3 h-3" />
                </li>
                <li className="flex items-center justify-between text-purple-400">
                   <span>Verified-Only Graph</span>
                   <Layers className="w-3 h-3" />
                </li>
                <li className="flex items-center justify-between text-amber-400">
                   <span>Rule-Based Fallback</span>
                   <Shield className="w-3 h-3" />
                </li>
             </ul>
          </div>
        </div>
      </div>

      <footer className="mt-20 py-8 border-t border-white/5 flex items-center justify-between text-[10px] text-gray-600 uppercase tracking-[0.2em] font-bold">
        <span>Identity Prism OS • Combined Operations Center</span>
        <div className="flex gap-8">
          <a href="#" className="hover:text-white transition-colors">Documentation</a>
          <a href="#" className="hover:text-white transition-colors">Security Audit</a>
          <a href="#" className="hover:text-white transition-colors">System Health JSON</a>
        </div>
      </footer>
    </div>
  );
}

export default function AdminMemoryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center text-white/20 font-mono text-[10px] tracking-widest uppercase animate-pulse">Initializing Control Surface...</div>}>
      <AdminMemoryContent />
    </Suspense>
  );
}
