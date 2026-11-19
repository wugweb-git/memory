'use client';

import React, { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import RagTester from './components/RagTester';
import MemoryExplorer from './components/MemoryExplorer';
import IngestionMonitor from './components/IngestionMonitor';
import EmbeddingMonitor from './components/EmbeddingMonitor';
import ActivityLog from './components/ActivityLog';
import { PageHeader } from '@/components/ui/primitives';

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
      <div className="mb-6">
        <PageHeader
          title="Memory control surface"
          subtitle="Layers L1 to L2.5: intake, retrieval and the memory explorer."
          actions={
            <p role="status" className={`flex min-h-11 items-center text-sm font-semibold ${health === 'healthy' ? 'text-success' : health === 'checking' ? 'text-text-tertiary' : 'text-danger'}`}>
              {health === 'checking' ? 'Checking health' : health === 'healthy' ? 'System healthy' : health === 'degraded' ? 'System degraded' : 'Health unreachable'}
            </p>
          }
        />
        <p className="mt-2 flex flex-wrap items-center gap-2 px-1 text-sm text-text-tertiary">
          <span>{testRunId === 'PROD' ? 'Live production' : 'Validation mode'}</span>
          {testRunId !== 'PROD' && (
            <span className="rounded-md border border-border-primary bg-bg-secondary px-2 py-0.5 text-xs font-semibold text-warning">
              Scope: {testRunId}
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-12 gap-4 md:gap-8">
        {/* Left: status & health */}
        <div className="col-span-12 lg:col-span-4 flex flex-col gap-4 md:gap-8 min-w-0">
          <ActivityLog testRunId={testRunId} />
          <IngestionMonitor testRunId={testRunId} />
          <EmbeddingMonitor testRunId={testRunId} />
        </div>

        {/* Right: RAG tools & explorer */}
        <div className="col-span-12 lg:col-span-8 flex flex-col gap-4 md:gap-8 min-w-0">
          <RagTester testRunId={testRunId} />
          <MemoryExplorer testRunId={testRunId} />
        </div>
      </div>

      <footer className="mt-8 py-4 border-t border-border-secondary flex flex-wrap items-center justify-between gap-3 text-xs text-text-tertiary">
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
