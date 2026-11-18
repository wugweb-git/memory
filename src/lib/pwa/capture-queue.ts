/**
 * Offline capture queue: pure logic with an injectable storage adapter so it can be
 * unit tested without IndexedDB. The browser adapter lives in `capture-store.ts`.
 * public/sw.js replays the same IndexedDB records on a Background Sync event.
 */

export const CAPTURE_ENDPOINT = '/api/blob';
export const CAPTURE_SYNC_TAG = 'prism-capture-sync';
export const MAX_QUEUE_SIZE = 200;
export const MAX_ATTEMPTS = 8;

export interface QueuedCapture {
  id: string;
  url: string;
  body: unknown;
  createdAt: number;
  attempts: number;
}

export interface QueueStorage {
  getAll(): Promise<QueuedCapture[]>;
  put(item: QueuedCapture): Promise<void>;
  remove(id: string): Promise<void>;
}

export type SendResult = { status: number };
export type Sender = (item: QueuedCapture) => Promise<SendResult>;

export type StatusClass = 'ok' | 'retry' | 'auth' | 'drop';

/** Statuses that can never succeed on replay. */
const PERMANENT = new Set([400, 404, 405, 410, 413, 415, 422]);

/**
 * 2xx done; 401/403 keep (needs sign-in); known-permanent 4xx drop. Everything else
 * retries with an attempt cap. /api/blob answers 400 only for invalid input and 500 for
 * internal failures (including a database outage), so 400 can never succeed on replay.
 */
export function classifyStatus(status: number): StatusClass {
  if (status >= 200 && status < 300) return 'ok';
  if (status === 401 || status === 403) return 'auth';
  if (PERMANENT.has(status)) return 'drop';
  return 'retry';
}

/** fetch() rejects with a TypeError on network failure; anything else is a real bug. */
export function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError || (err instanceof Error && /network|failed to fetch|load failed/i.test(err.message));
}

export function makeCaptureId(now: number, rand: () => number = Math.random): string {
  return `${now.toString(36)}-${Math.floor(rand() * 0xffffff).toString(36)}`;
}

export interface EnqueueInput {
  url?: string;
  body: unknown;
}

/** Oldest items are dropped past MAX_QUEUE_SIZE so storage cannot grow without bound. */
export async function enqueue(
  storage: QueueStorage,
  input: EnqueueInput,
  now: number = Date.now(),
  id: string = makeCaptureId(now),
): Promise<QueuedCapture> {
  const item: QueuedCapture = { id, url: input.url ?? CAPTURE_ENDPOINT, body: input.body, createdAt: now, attempts: 0 };
  await storage.put(item);
  const all = (await storage.getAll()).sort((a, b) => a.createdAt - b.createdAt);
  for (const extra of all.slice(0, Math.max(0, all.length - MAX_QUEUE_SIZE))) await storage.remove(extra.id);
  return item;
}

export interface FlushResult {
  sent: number;
  dropped: number;
  remaining: number;
  authRequired: boolean;
  offline: boolean;
}

/** Replays oldest first. Stops on the first network/auth failure so order is preserved. */
export async function flush(storage: QueueStorage, send: Sender, maxAttempts: number = MAX_ATTEMPTS): Promise<FlushResult> {
  const items = (await storage.getAll()).sort((a, b) => a.createdAt - b.createdAt);
  let sent = 0;
  let dropped = 0;
  let authRequired = false;
  let offline = false;

  for (const item of items) {
    let cls: StatusClass;
    try {
      cls = classifyStatus((await send(item)).status);
    } catch (err) {
      if (isNetworkError(err)) {
        offline = true;
        break;
      }
      cls = 'retry';
    }
    if (cls === 'ok') {
      await storage.remove(item.id);
      sent++;
    } else if (cls === 'drop') {
      await storage.remove(item.id);
      dropped++;
    } else if (cls === 'auth') {
      authRequired = true;
      break;
    } else {
      const attempts = item.attempts + 1;
      if (attempts >= maxAttempts) {
        await storage.remove(item.id);
        dropped++;
      } else {
        await storage.put({ ...item, attempts });
      }
    }
  }
  const remaining = (await storage.getAll()).length;
  return { sent, dropped, remaining, authRequired, offline };
}

export type CaptureOutcome =
  | { kind: 'sent'; status: number }
  | { kind: 'queued'; item: QueuedCapture }
  | { kind: 'rejected'; status: number };

/**
 * Try the network first; on offline or a network error, queue instead.
 * A permanent rejection (400/404/405/410/413/415/422) is returned as 'rejected' and not queued.
 * 401/403 and every other failure status are queued so nothing typed is lost.
 * Without storage the send is attempted and any error is rethrown.
 */
export async function captureOrQueue(
  storage: QueueStorage | null,
  send: Sender,
  input: EnqueueInput,
  isOnline: boolean,
  now: number = Date.now(),
): Promise<CaptureOutcome> {
  const url = input.url ?? CAPTURE_ENDPOINT;
  if (isOnline || !storage) {
    const probe: QueuedCapture = { id: 'probe', url, body: input.body, createdAt: now, attempts: 0 };
    try {
      const { status } = await send(probe);
      const cls = classifyStatus(status);
      if (cls === 'ok') return { kind: 'sent', status };
      if (!storage || cls === 'drop') return { kind: 'rejected', status };
    } catch (err) {
      if (!storage || !isNetworkError(err)) throw err;
    }
  }
  return { kind: 'queued', item: await enqueue(storage as QueueStorage, { url, body: input.body }, now) };
}
