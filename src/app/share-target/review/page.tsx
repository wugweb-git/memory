'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { captureToBuffer } from '@/lib/pwa/capture-client';
import {
  buildShareCaptureBody, buildSharedFileCaptureBody, classifySharedFile, decodeReviewQuery,
  isEmptyShare, MAX_TEXT_FILE_BYTES, normalizeSharedFields, SHARE_INBOX_CACHE, type SharedPayload,
} from '@/lib/native/share-data';
import { mapStorageError, storageErrorMessage } from '@/lib/native/storage';

interface SharedFile { name: string; type: string; text: string | null; kind: ReturnType<typeof classifySharedFile> }

async function loadInbox(id: string): Promise<{ payload: SharedPayload; files: SharedFile[] } | null> {
  try {
    const cache = await caches.open(SHARE_INBOX_CACHE);
    const metaRes = await cache.match(`/__share/${id}/meta`);
    if (!metaRes) return null;
    const meta = (await metaRes.json()) as { title?: string; text?: string; url?: string; files?: { name: string; type: string }[] };
    const files: SharedFile[] = [];
    for (let i = 0; i < (meta.files?.length ?? 0); i++) {
      const f = meta.files![i];
      const kind = classifySharedFile(f.name, f.type);
      const res = await cache.match(`/__share/${id}/file/${i}`);
      const text = kind !== 'unsupported' && res ? (await res.text()).slice(0, MAX_TEXT_FILE_BYTES) : null;
      files.push({ name: f.name, type: f.type, text, kind });
    }
    // One-shot inbox: remove after reading.
    const keys = await cache.keys();
    await Promise.all(keys.filter((k) => k.url.includes(`/__share/${id}/`)).map((k) => cache.delete(k)));
    return { payload: normalizeSharedFields(meta), files };
  } catch {
    return null;
  }
}

function ReviewInner() {
  const params = useSearchParams();
  const [payload, setPayload] = useState<SharedPayload>(() => decodeReviewQuery(new URLSearchParams(params?.toString() ?? '')));
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const shareId = params?.get('share');

  useEffect(() => {
    if (!shareId) return;
    void loadInbox(shareId).then((r) => {
      if (r) {
        setPayload(r.payload);
        setFiles(r.files);
      }
    });
  }, [shareId]);

  async function save() {
    setBusy(true);
    try {
      const bodies: Record<string, unknown>[] = [];
      if (!isEmptyShare(payload)) bodies.push(buildShareCaptureBody(payload));
      for (const f of files) if (f.text !== null) bodies.push(buildSharedFileCaptureBody({ name: f.name, type: f.type, text: f.text }));
      if (bodies.length === 0) {
        setMsg({ tone: 'err', text: 'There is nothing to save.' });
        return;
      }
      let queued = 0;
      for (const body of bodies) {
        const out = await captureToBuffer({ body });
        if (out.kind === 'rejected') throw new Error('The buffer rejected this item.');
        if (out.kind === 'queued') queued++;
      }
      setMsg({ tone: 'ok', text: queued ? 'Saved offline. It will sync when you are back online.' : 'Saved to the buffer for review.' });
    } catch (e) {
      const kind = mapStorageError(e);
      setMsg({ tone: 'err', text: kind === 'unknown' ? (e instanceof Error ? e.message : 'Save failed.') : storageErrorMessage(kind) });
    } finally {
      setBusy(false);
    }
  }

  const unsupported = files.filter((f) => f.kind === 'unsupported');

  return (
    <main className="mx-auto max-w-xl space-y-4 p-4">
      <h1 className="text-2xl font-bold text-text-primary">Save to buffer</h1>
      <p className="text-sm text-text-secondary">Review what was shared with Identity Prism OS. Nothing is saved until you tap Save.</p>
      <label className="block text-2xs text-text-tertiary">
        Title
        <input value={payload.title} onChange={(e) => setPayload({ ...payload, title: e.target.value })} className="mt-1 block min-h-11 w-full rounded-xl border border-border-primary bg-bg-elevated px-3 text-sm text-text-primary" />
      </label>
      <label className="block text-2xs text-text-tertiary">
        Note
        <textarea value={payload.text} rows={6} onChange={(e) => setPayload({ ...payload, text: e.target.value })} className="mt-1 block w-full rounded-xl border border-border-primary bg-bg-elevated p-3 text-sm text-text-primary" />
      </label>
      {payload.url && <p className="break-all text-sm text-text-secondary">Link: {payload.url}</p>}
      {files.length > 0 && (
        <ul className="text-2xs text-text-secondary">
          {files.map((f) => <li key={f.name}>{f.name} ({f.kind === 'calendar' ? 'calendar file' : f.kind === 'text' ? 'text file' : 'not supported yet'})</li>)}
        </ul>
      )}
      {unsupported.length > 0 && <p className="text-2xs text-text-tertiary">Images and other binary files cannot be stored yet and will be skipped.</p>}
      <div className="flex gap-2">
        <Button size="lg" loading={busy} onClick={save}>Save to buffer</Button>
        <Button size="lg" variant="outline" onClick={() => { window.location.href = '/buffer'; }}>Open buffer</Button>
      </div>
      {msg && <p role={msg.tone === 'ok' ? 'status' : 'alert'} aria-live="polite" className={`text-sm ${msg.tone === 'ok' ? 'text-success' : 'text-danger'}`}>{msg.text}</p>}
    </main>
  );
}

export default function ShareReviewPage() {
  return (
    <Suspense fallback={null}>
      <ReviewInner />
    </Suspense>
  );
}
