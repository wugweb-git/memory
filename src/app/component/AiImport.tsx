'use client';

import { useCallback, useRef, useState } from 'react';
import { FileUp, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { parseAiExport } from '@/lib/ingestion/ai-imports/parse';
import { MAX_JSON_BYTES, readZipTexts, ZIP_MATCHERS } from '@/lib/ingestion/ai-imports/zip-browser';
import { SOURCE_LABELS, stableId, type AiImportSource, type NormalizedConversation } from '@/lib/ingestion/ai-imports/types';

/**
 * Import history from other AI tools into memory. The file is read and parsed in
 * this browser (Vercel request bodies are limited to about 4.5 MB), then the
 * normalised conversations are sent in small chunks to /api/import/ai-chats:
 * first as a dry run (counts only, nothing written), then, after an explicit
 * confirm, as a commit. Everything lands private, at low embedding priority.
 */

const ENDPOINT = '/api/import/ai-chats';
const CHUNK_BYTES = 600_000; // server limit is about 900 KB; stay well under
const CHUNK_CONVERSATIONS = 100;
const DEFAULT_CAP = 2000;

const SOURCES: Array<{ key: AiImportSource; hint: string }> = [
  { key: 'chatgpt', hint: 'Export zip or conversations.json' },
  { key: 'claude', hint: 'Export zip or conversations.json' },
  { key: 'gemini', hint: 'Google Takeout zip or MyActivity.json' },
  { key: 'transcript', hint: 'Paste a chat, or a .md or .txt file' },
  { key: 'memory-list', hint: 'One fact per line' },
];

interface Totals {
  conversations: number;
  messages: number;
  packets: number;
  duplicates: number;
  created: number;
  overCap: number;
  attachments: number;
  nonConversation: number;
  empty: number;
  unreadable: number;
}
const zero = (): Totals => ({ conversations: 0, messages: 0, packets: 0, duplicates: 0, created: 0, overCap: 0, attachments: 0, nonConversation: 0, empty: 0, unreadable: 0 });

type Phase = 'idle' | 'reading' | 'checking' | 'ready' | 'importing' | 'done' | 'error';

/** Newest first, so the per-import cap keeps the most recent history. Splits into chunks well under the body limit. */
function toChunks(convs: NormalizedConversation[]): { chunks: NormalizedConversation[][]; tooLarge: number } {
  const sorted = [...convs].sort((a, b) => String(b.startedAt ?? '').localeCompare(String(a.startedAt ?? '')));
  const chunks: NormalizedConversation[][] = [];
  let cur: NormalizedConversation[] = [];
  let bytes = 0;
  let tooLarge = 0;
  for (const c of sorted) {
    const size = JSON.stringify(c).length;
    if (size > CHUNK_BYTES) {
      tooLarge++;
      continue;
    }
    if (cur.length && (bytes + size > CHUNK_BYTES || cur.length >= CHUNK_CONVERSATIONS)) {
      chunks.push(cur);
      cur = [];
      bytes = 0;
    }
    cur.push(c);
    bytes += size;
  }
  if (cur.length) chunks.push(cur);
  return { chunks, tooLarge };
}

async function post(body: unknown): Promise<any> {
  const res = await fetch(ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(j.error || `Request failed (${res.status})`);
  return j.report;
}

export function AiImport({ onComplete }: { onComplete?: () => void }) {
  const [source, setSource] = useState<AiImportSource>('chatgpt');
  const [file, setFile] = useState<File | null>(null);
  const [pasted, setPasted] = useState('');
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<Totals | null>(null);
  const [result, setResult] = useState<Totals | null>(null);
  const [cap, setCap] = useState(DEFAULT_CAP);
  const [notice, setNotice] = useState<string | null>(null);
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const chunksRef = useRef<NormalizedConversation[][]>([]);
  const importIdRef = useRef('');
  const nextChunkRef = useRef(0);
  const totalsRef = useRef<Totals>(zero());
  const cancelRef = useRef(false);

  const wantsPaste = source === 'memory-list' || source === 'transcript';
  const wantsFile = !(source === 'memory-list');
  const accept = source === 'transcript' ? '.md,.txt,.markdown,text/plain,text/markdown' : '.zip,.json,application/zip,application/json';
  const canCheck = (wantsPaste ? pasted.trim().length > 0 : false) || !!file;
  const busy = phase === 'reading' || phase === 'checking' || phase === 'importing';

  const reset = useCallback(() => {
    setPhase('idle');
    setError(null);
    setPreview(null);
    setResult(null);
    setNotice(null);
    setProgress({ done: 0, total: 0 });
    chunksRef.current = [];
    nextChunkRef.current = 0;
  }, []);

  /** Reads the chosen file or paste in the browser and returns normalised conversations. */
  async function readInput(): Promise<NormalizedConversation[]> {
    if (file) {
      const isZip = /\.zip$/i.test(file.name) || file.type === 'application/zip';
      if (isZip && (source === 'chatgpt' || source === 'claude' || source === 'gemini')) {
        const texts = await readZipTexts(file, ZIP_MATCHERS[source]);
        if (!texts.length) {
          throw new Error(
            source === 'gemini'
              ? 'No Gemini activity file found in this zip. In Google Takeout choose My Activity, Gemini Apps, JSON format.'
              : 'No conversations.json found in this zip. Upload the export zip you received by email, or the conversations.json inside it.',
          );
        }
        return texts.flatMap((t) => parseAiExport(source, t.text, t.name));
      }
      if (file.size > MAX_JSON_BYTES) throw new Error(`This file is over ${MAX_JSON_BYTES / 1024 / 1024} MB. Upload the zip so only the conversations are read.`);
      return parseAiExport(source, await file.text(), file.name);
    }
    return parseAiExport(source, pasted, source === 'transcript' ? 'Pasted transcript' : undefined);
  }

  async function check() {
    reset();
    cancelRef.current = false;
    try {
      setPhase('reading');
      const convs = await readInput();
      if (!convs.length) throw new Error('No conversations with text were found in this file.');
      const { chunks, tooLarge } = toChunks(convs);
      chunksRef.current = chunks;
      importIdRef.current = `imp_${stableId(`${source}|${file ? `${file.name}|${file.size}|${file.lastModified}` : pasted}`)}`;

      setPhase('checking');
      let limit = DEFAULT_CAP;
      try {
        const g = await fetch(ENDPOINT);
        if (g.ok) limit = (await g.json()).maxPacketsPerImport ?? DEFAULT_CAP;
      } catch {
        /* the server still enforces its own cap */
      }
      setCap(limit);

      const t = zero();
      t.unreadable = tooLarge;
      setProgress({ done: 0, total: chunks.length });
      for (let i = 0; i < chunks.length; i++) {
        const r = await post({ mode: 'dry-run', importId: importIdRef.current, conversations: chunks[i] });
        t.conversations += r.conversations;
        t.messages += r.messages;
        t.packets += r.packets;
        t.duplicates += r.duplicates;
        t.created += r.created;
        t.attachments += r.skipped.attachments;
        t.nonConversation += r.skipped.nonConversation;
        t.empty += r.skipped.empty;
        t.unreadable += r.skipped.conversationsWithoutText;
        setProgress({ done: i + 1, total: chunks.length });
      }
      // A dry run writes nothing, so apply the per-import cap to the total here.
      if (t.created > limit) {
        t.overCap = t.created - limit;
        t.created = limit;
      }
      setPreview(t);
      setPhase('ready');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not read this file.');
      setPhase('error');
    }
  }

  async function runImport() {
    cancelRef.current = false;
    setPhase('importing');
    setError(null);
    if (nextChunkRef.current === 0) totalsRef.current = zero();
    const chunks = chunksRef.current;
    try {
      for (let i = nextChunkRef.current; i < chunks.length; i++) {
        if (cancelRef.current) {
          setPhase('ready');
          setNotice(`Paused after ${i} of ${chunks.length} parts. Pick up where you left off, nothing is repeated.`);
          return;
        }
        const r = await post({ mode: 'commit', confirm: true, importId: importIdRef.current, conversations: chunks[i] });
        const t = totalsRef.current;
        t.conversations += r.conversations;
        t.messages += r.messages;
        t.packets += r.packets;
        t.duplicates += r.duplicates;
        t.created += r.created;
        t.overCap += r.overCap;
        t.attachments += r.skipped.attachments;
        t.nonConversation += r.skipped.nonConversation;
        t.empty += r.skipped.empty;
        nextChunkRef.current = i + 1;
        setProgress({ done: i + 1, total: chunks.length });
      }
      setResult({ ...totalsRef.current, unreadable: preview?.unreadable ?? 0 });
      setPhase('done');
      onComplete?.();
    } catch (e) {
      setError(`${e instanceof Error ? e.message : 'Import failed.'} Part ${nextChunkRef.current + 1} of ${chunks.length} did not finish; use Resume to continue. Already imported text is never duplicated.`);
      setPhase('error');
    }
  }

  const resumable = phase === 'error' && chunksRef.current.length > 0 && preview !== null;
  const pct = progress.total ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-secondary">
        Bring your history from other AI tools into memory. The file is read in your browser; only text is sent, in small parts.
        Nothing is public, and nothing is written until you confirm.
      </p>

      <fieldset disabled={busy} className="space-y-2">
        <legend className="text-2xs font-semibold uppercase tracking-wide text-text-tertiary">Source</legend>
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Where the history comes from">
          {SOURCES.map((s) => (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={source === s.key}
              onClick={() => {
                setSource(s.key);
                setFile(null);
                reset();
              }}
              className={`min-h-11 rounded-xl px-3 py-2 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                source === s.key ? 'bg-text-primary text-bg-primary' : 'border border-border-primary text-text-secondary hover:bg-bg-secondary'
              }`}
            >
              {SOURCE_LABELS[s.key]}
              <span className={`block text-2xs font-normal ${source === s.key ? 'text-bg-primary' : 'text-text-tertiary'}`}>{s.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      {wantsFile && (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-border-primary p-4 transition-colors focus-within:ring-2 focus-within:ring-accent hover:bg-bg-secondary">
          <FileUp aria-hidden="true" className="h-5 w-5 shrink-0 text-accent" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-text-primary">{file ? file.name : `Choose a ${SOURCE_LABELS[source]} file`}</span>
            <span className="block text-2xs text-text-tertiary">{file ? `${(file.size / 1024 / 1024).toFixed(1)} MB, read here in your browser` : SOURCES.find((s) => s.key === source)?.hint}</span>
          </span>
          <input
            type="file"
            accept={accept}
            className="sr-only"
            aria-label={`Choose a ${SOURCE_LABELS[source]} file`}
            disabled={busy}
            onChange={(e) => {
              setFile(e.target.files?.[0] ?? null);
              reset();
            }}
          />
        </label>
      )}

      {wantsPaste && (
        <div className="space-y-1">
          <label htmlFor="ai-import-paste" className="text-sm font-medium text-text-primary">
            {source === 'memory-list' ? 'Paste your memory list' : 'Or paste a transcript'}
          </label>
          <textarea
            id="ai-import-paste"
            value={pasted}
            disabled={busy}
            onChange={(e) => {
              setPasted(e.target.value);
              reset();
            }}
            rows={6}
            placeholder={source === 'memory-list' ? 'Lives in Berlin\nPrefers TypeScript\nVegetarian' : 'You: ...\nChatGPT: ...'}
            className="w-full rounded-xl border border-border-primary bg-bg-elevated p-3 text-sm text-text-primary placeholder:text-text-disabled focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          {source === 'memory-list' && (
            <p className="text-2xs text-text-tertiary">
              ChatGPT saved memories are not in its export file. Open Settings, Personalization, Manage memories, copy the list and paste it here.
            </p>
          )}
        </div>
      )}

      <Button type="button" size="lg" variant="outline" className="w-full" onClick={check} disabled={!canCheck || busy} loading={phase === 'reading' || phase === 'checking'} loadingLabel={phase === 'reading' ? 'Reading file' : 'Checking'}>
        Preview, nothing is saved
      </Button>

      <div aria-live="polite" className="space-y-3">
        {(phase === 'checking' || phase === 'importing') && (
          <div className="space-y-1">
            <div role="progressbar" aria-label={phase === 'importing' ? 'Import progress' : 'Preview progress'} aria-valuemin={0} aria-valuemax={100} aria-valuenow={pct} className="h-2 overflow-hidden rounded-full bg-bg-secondary">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-2xs text-text-tertiary">
              {phase === 'importing' ? 'Importing' : 'Checking'} part {Math.min(progress.done + 1, progress.total)} of {progress.total}
            </p>
          </div>
        )}

        {preview && (phase === 'ready' || phase === 'importing' || resumable) && (
          <div className="space-y-2 rounded-xl border border-border-secondary bg-bg-secondary p-3">
            <p className="text-sm font-semibold text-text-primary">What would happen</p>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-3">
              <Stat label="Conversations" value={preview.conversations} />
              <Stat label="Messages" value={preview.messages} />
              <Stat label="Memory items to create" value={preview.created} strong />
              <Stat label="Already imported" value={preview.duplicates} />
              <Stat label="Attachments skipped" value={preview.attachments} />
              <Stat label="System and tool messages dropped" value={preview.nonConversation} />
            </dl>
            {(preview.overCap > 0 || preview.unreadable > 0) && (
              <ul className="space-y-1 text-2xs text-warning">
                {preview.overCap > 0 && <li>Limit: at most {cap} items per import so embedding is not flooded. The newest conversations are kept; {preview.overCap} older items will not be imported. Run it again later to add more.</li>}
                {preview.unreadable > 0 && <li>{preview.unreadable} conversations were too large or had no text and will be skipped.</li>}
              </ul>
            )}
            <p className="flex items-start gap-2 text-2xs text-text-tertiary">
              <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0 text-success" />
              Items are private (never public), keep their original dates, and are embedded slowly in the background after your fresh notes.
            </p>
          </div>
        )}

        {notice && <p className="text-2xs text-text-secondary">{notice}</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      </div>

      {(phase === 'ready' || resumable) && preview && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="lg" onClick={runImport} disabled={preview.created === 0}>
            {resumable || nextChunkRef.current > 0 ? 'Resume import' : `Import ${preview.created} items to memory`}
          </Button>
          {preview.created === 0 && <p className="self-center text-2xs text-text-tertiary">Everything here is already in memory.</p>}
        </div>
      )}
      {phase === 'importing' && (
        <Button type="button" size="lg" variant="outline" onClick={() => (cancelRef.current = true)}>
          Pause after this part
        </Button>
      )}

      {phase === 'done' && result && (
        <div role="status" className="space-y-1 rounded-xl border border-border-secondary bg-bg-secondary p-3">
          <p className="text-sm font-semibold text-text-primary">
            {result.created} imported, {result.duplicates} already there, {result.attachments} attachments skipped
          </p>
          <p className="text-2xs text-text-tertiary">
            They are private and queued for embedding at low priority, so they become searchable gradually. Importing the same file again adds nothing.
            {result.overCap > 0 ? ` ${result.overCap} items were left out by the ${cap}-item limit.` : ''}
          </p>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, strong }: { label: string; value: number; strong?: boolean }) {
  return (
    <div>
      <dt className="text-2xs text-text-tertiary">{label}</dt>
      <dd className={strong ? 'text-lg font-semibold text-text-primary' : 'text-sm text-text-primary'}>{value.toLocaleString('en-US')}</dd>
    </div>
  );
}
