'use client';

import {
  CAPTURE_SYNC_TAG,
  captureOrQueue,
  flush,
  type CaptureOutcome,
  type EnqueueInput,
  type FlushResult,
  type QueuedCapture,
  type QueueStorage,
  type SendResult,
} from './capture-queue';
import { createIndexedDbStorage } from './capture-store';
import { haptic, setAppBadge } from './browser';

export const CAPTURE_EVENT = 'prism:capture-queue';

const send = async (item: QueuedCapture): Promise<SendResult> => {
  const res = await fetch(item.url, {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(item.body),
  });
  return { status: res.status };
};

function storage(): QueueStorage | null {
  try {
    return createIndexedDbStorage();
  } catch {
    return null;
  }
}

async function updateBadge(): Promise<number> {
  let n = 0;
  try {
    n = (await storage()?.getAll())?.length ?? 0;
  } catch {
    n = 0;
  }
  setAppBadge(n);
  try {
    window.dispatchEvent(new CustomEvent(CAPTURE_EVENT, { detail: { pending: n } }));
  } catch {
    /* ignore */
  }
  return n;
}

async function registerSync(): Promise<void> {
  try {
    const reg = (await navigator.serviceWorker?.ready) as
      | (ServiceWorkerRegistration & { sync?: { register: (tag: string) => Promise<void> } })
      | undefined;
    await reg?.sync?.register(CAPTURE_SYNC_TAG);
  } catch {
    /* Background Sync unsupported: the online event fallback handles it */
  }
}

/** POST a capture to the intake endpoint, or queue it locally when offline. */
export async function captureToBuffer(input: EnqueueInput): Promise<CaptureOutcome> {
  const online = typeof navigator === 'undefined' ? true : navigator.onLine !== false;
  const out = await captureOrQueue(storage(), send, input, online);
  if (out.kind === 'queued') {
    haptic('warning');
    void registerSync();
    void updateBadge();
  } else if (out.kind === 'sent') {
    haptic('success');
  }
  return out;
}

/** Replay queued captures now (online event, app start). */
export async function flushCaptureQueue(): Promise<FlushResult | null> {
  const s = storage();
  if (!s) return null;
  try {
    const result = await flush(s, send);
    if (result.sent > 0) haptic('success');
    await updateBadge();
    return result;
  } catch {
    return null;
  }
}

export async function pendingCaptureCount(): Promise<number> {
  return updateBadge();
}
