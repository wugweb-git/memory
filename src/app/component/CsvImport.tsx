'use client';

import { useState } from 'react';
import Link from 'next/link';
import { FileSpreadsheet } from 'lucide-react';

type Summary = {
  total: number;
  imported: number;
  duplicates: number;
  skipped: number;
  failed: number;
  items: Array<{ title: string; status: string; reason?: string }>;
};

type ImportType = 'blog' | 'case_study' | 'client' | 'profile';
const TYPES: Array<{ key: ImportType; label: string }> = [
  { key: 'blog', label: 'Blog' },
  { key: 'case_study', label: 'Case study' },
  { key: 'client', label: 'Client' },
  { key: 'profile', label: 'Profile' },
];

/** Best-guess the record type from the file name. */
function guessType(name: string): ImportType {
  const n = name.toLowerCase();
  if (n.includes('client')) return 'client';
  if (n.includes('profile') || n.includes('resume') || n.includes('cv') || n.includes('about')) return 'profile';
  if (n.includes('case')) return 'case_study';
  return 'blog';
}

/**
 * Bulk-import a .csv or .docx into memory (one packet per row / case-study /
 * document). Posts to /api/ingest/{csv,docx}; owner session authenticates.
 */
export function CsvImport({ onComplete }: { onComplete?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [type, setType] = useState<ImportType>('blog');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Summary | null>(null);

  const isDocx = !!file && file.name.toLowerCase().endsWith('.docx');

  async function run() {
    if (!file) return;
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('type', type);
      // .docx → case-study split (when type=case_study) or single-doc; .csv → per-row.
      const endpoint = isDocx ? '/api/ingest/docx' : '/api/ingest/csv';
      const res = await fetch(endpoint, { method: 'POST', body: fd });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || `Import failed (${res.status})`);
      setResult(j as Summary);
      onComplete?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-3">
      <p className="text-2xs text-text-tertiary">
        Bulk-import your history — a <span className="font-mono">.csv</span> (one row per record) or a
        <span className="font-mono"> .docx</span> (case studies split on each “Case Study N:”, or a profile/doc as
        one item). Each becomes one memory item; re-imports are de-duplicated.
      </p>

      <div className="flex flex-wrap gap-2">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`px-3 py-1.5 rounded-lg text-2xs font-bold transition-colors ${
              type === t.key ? 'bg-text-primary text-bg-primary' : 'text-text-tertiary hover:bg-bg-secondary'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-dashed border-border-primary p-4 cursor-pointer hover:bg-bg-secondary transition-colors">
        <FileSpreadsheet className="h-5 w-5 text-accent shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-text-primary truncate">{file ? file.name : 'Choose a .csv or .docx file'}</span>
          <span className="block text-2xs text-text-tertiary">
            {file ? `${(file.size / 1024).toFixed(0)} KB · importing as ${type.replace('_', ' ')}` : 'CSV export or Word doc — blog, case studies, clients, profile'}
          </span>
        </span>
        <input
          type="file"
          accept=".csv,text/csv,.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            setFile(f);
            if (f) setType(guessType(f.name));
            setResult(null);
            setError(null);
          }}
        />
      </label>

      <button
        onClick={run}
        disabled={!file || busy}
        className="w-full rounded-xl bg-text-primary text-bg-primary text-sm font-bold py-2.5 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {busy ? 'Importing…' : 'Import to memory'}
      </button>

      {error && <p className="text-2xs text-danger">{error}</p>}

      {result && (
        <div className="rounded-xl border border-border-secondary bg-bg-secondary p-3 space-y-1.5">
          <p className="text-sm font-bold text-text-primary">
            {result.imported} imported · {result.duplicates} duplicates · {result.skipped} skipped
            {result.failed ? ` · ${result.failed} failed` : ''}
          </p>
          <p className="text-2xs text-text-tertiary">
            Landed in memory (<Link href="/memory" className="text-accent font-bold">view</Link>). They become searchable
            once an embeddings key (<span className="font-mono">OPENROUTER_API_KEY</span>) is set — until then they're
            stored but not yet retrievable.
          </p>
          {result.failed > 0 && (
            <ul className="text-2xs text-danger space-y-0.5 pt-1">
              {result.items.filter((i) => i.status === 'failed').slice(0, 5).map((i, idx) => (
                <li key={idx} className="truncate">{i.title}: {i.reason}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
