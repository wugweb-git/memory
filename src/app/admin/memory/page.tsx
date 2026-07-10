'use client';

import React, { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import RagTester from './components/RagTester';
import MemoryExplorer from './components/MemoryExplorer';
import IngestionMonitor from './components/IngestionMonitor';
import EmbeddingMonitor from './components/EmbeddingMonitor';
import ActivityLog from './components/ActivityLog';
import { AppShell } from '@/app/component/AppShell';
import { Shield, Brain, Layers, Cpu } from 'lucide-react';

const HARDENING = [
  { label: 'Adaptive retries', tone: 'text-success' },
  { label: 'Deterministic signals', tone: 'text-accent' },
  { label: 'Verified-only graph', tone: 'text-accent' },
  { label: 'Rule-based fallback', tone: 'text-warning' },
] as const;

function AdminMemoryContent() {
  const searchParams = useSearchParams();
  const testRunId = searchParams.get('test_run_id') || 'PROD';

  return (
    <div className="max-w-6xl mx-auto px-4 py-2">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent rounded-xl">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Memory control surface</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 text-success font-medium">
              <Shield className="w-4 h-4" /> Layer 1 locked
            </span>
            <span className="text-border-primary">·</span>
            <span className="flex items-center gap-1.5 text-accent font-medium">
              <Layers className="w-4 h-4" /> Layer 2 active
            </span>
            <span className="text-border-primary">·</span>
            <span className="flex items-center gap-1.5 text-text-secondary font-medium">
              <Cpu className="w-4 h-4" /> Layer 2.5 hardened
            </span>
            {testRunId !== 'PROD' && (
              <>
                <span className="text-border-primary">·</span>
                <span className="rounded-md border border-border-primary bg-bg-secondary px-2 py-0.5 text-2xs font-bold uppercase tracking-widest text-warning">
                  Scope: {testRunId}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="rounded-lg bg-bg-secondary border border-border-secondary px-4 py-2 text-xs font-mono text-text-tertiary">
            {testRunId === 'PROD' ? 'Live production' : 'Validation mode'} · self-healing active
          </div>
          <p className="text-2xs text-success font-bold uppercase tracking-widest">System healthy</p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-8">
        {/* Left: status & health */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8">
          <ActivityLog testRunId={testRunId} />
          <IngestionMonitor testRunId={testRunId} />
          <EmbeddingMonitor testRunId={testRunId} />
        </div>

        {/* Right: RAG tools & explorer */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8">
          <RagTester testRunId={testRunId} />
          <MemoryExplorer testRunId={testRunId} />
          <div className="p-6 bg-bg-secondary border border-border-secondary rounded-2xl">
            <h3 className="text-2xs font-bold text-text-tertiary uppercase tracking-widest mb-4">Hardening audit (L2.5)</h3>
            <ul className="grid grid-cols-2 gap-4 text-xs">
              {HARDENING.map((h) => (
                <li key={h.label} className={`flex items-center justify-between ${h.tone}`}>
                  <span>{h.label}</span>
                  <Shield className="w-3 h-3" />
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      <footer className="mt-16 py-6 border-t border-border-secondary flex flex-wrap items-center justify-between gap-3 text-2xs text-text-tertiary">
        <span>Identity Prism OS · combined operations center</span>
        <div className="flex gap-6">
          <a href="/admin" className="hover:text-text-primary transition-colors">Admin console</a>
          <a href="/api/health/system" target="_blank" rel="noopener noreferrer" className="hover:text-text-primary transition-colors">System health JSON</a>
        </div>
      </footer>
    </div>
  );
}

export default function AdminMemoryPage() {
  return (
    <AppShell>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-text-tertiary text-2xs tracking-widest uppercase animate-pulse">
            Initializing control surface…
          </div>
        }
      >
        <AdminMemoryContent />
      </Suspense>
    </AppShell>
  );
}
