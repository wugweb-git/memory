'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RagTester from './components/RagTester';
import MemoryExplorer from './components/MemoryExplorer';
import IngestionMonitor from './components/IngestionMonitor';
import EmbeddingMonitor from './components/EmbeddingMonitor';
import ActivityLog from './components/ActivityLog';
import { Brain, Layers } from 'lucide-react';

function AdminMemoryContent() {
  const searchParams = useSearchParams();
  const testRunId = searchParams.get('test_run_id') || 'PROD';
  const [health, setHealth] = useState<'checking' | 'healthy' | 'degraded' | 'unreachable'>('checking');

  useEffect(() => {
    let cancelled = false;
    fetch('/api/health/system', { credentials: 'include' })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        const status = String(j?.status ?? (r.ok ? 'ok' : 'error'));
        if (!cancelled) setHealth(r.ok && !/broken|fail|error|degraded/i.test(status) ? 'healthy' : 'degraded');
      })
      .catch(() => { if (!cancelled) setHealth('unreachable'); });
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-accent rounded-xl">
              <Brain aria-hidden="true" className="w-5 h-5 text-bg-elevated" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Memory control surface</h1>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            <span className="flex items-center gap-1.5 text-text-secondary font-medium">
              <Layers aria-hidden="true" className="w-4 h-4" /> Layers L1 to L2.5
            </span>
            {testRunId !== 'PROD' && (
              <>
                <span aria-hidden="true" className="text-border-primary">·</span>
                <span className="rounded-md border border-border-primary bg-bg-secondary px-2 py-0.5 text-2xs font-bold text-warning">
                  Scope: {testRunId}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div className="rounded-lg bg-bg-secondary border border-border-secondary px-4 py-2 text-xs font-mono text-text-tertiary">
            {testRunId === 'PROD' ? 'Live production' : 'Validation mode'}
          </div>
          <p role="status" className={`text-xs font-semibold ${health === 'healthy' ? 'text-success' : health === 'checking' ? 'text-text-tertiary' : 'text-danger'}`}>
            {health === 'checking' ? 'Checking health' : health === 'healthy' ? 'System healthy' : health === 'degraded' ? 'System degraded' : 'Health unreachable'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-12 gap-6 md:gap-8">
        {/* Left: status & health */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-8 min-w-0">
          <ActivityLog testRunId={testRunId} />
          <IngestionMonitor testRunId={testRunId} />
          <EmbeddingMonitor testRunId={testRunId} />
        </div>

        {/* Right: RAG tools & explorer */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-8 min-w-0">
          <RagTester testRunId={testRunId} />
          <MemoryExplorer testRunId={testRunId} />
        </div>
      </div>

      <footer className="mt-16 py-6 border-t border-border-secondary flex flex-wrap items-center justify-between gap-3 text-2xs text-text-tertiary">
        <span>Identity Prism OS · combined operations center</span>
        <div className="flex flex-wrap gap-x-6 gap-y-1">
          <Link href="/admin" className="inline-flex items-center min-h-11 sm:min-h-6 hover:text-text-primary transition-colors">Admin console</Link>
          <a href="/api/health/system" target="_blank" rel="noopener noreferrer" className="inline-flex items-center min-h-11 sm:min-h-6 hover:text-text-primary transition-colors">System health JSON<span className="sr-only"> (opens in a new tab)</span></a>
        </div>
      </footer>
    </div>
  );
}

export default function AdminMemoryPage() {
  return (
    <>
      <Suspense
        fallback={
          <div className="min-h-[60vh] flex items-center justify-center text-text-tertiary text-sm animate-pulse motion-reduce:animate-none" role="status">
            Loading memory control surface…
          </div>
        }
      >
        <AdminMemoryContent />
      </Suspense>
    </>
  );
}
