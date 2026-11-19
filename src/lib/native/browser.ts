/** Browser-side wrappers for single-purpose web APIs that are not part of the adapter (clipboard, wake lock, storage, misc). */
import { shapeEstimate, type StorageHealth } from './storage';

export type ClipboardReadResult = { status: 'ok'; text: string } | { status: 'empty' | 'denied' | 'unsupported' };

export async function writeClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.setAttribute('readonly', '');
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

/** Call from a click handler only; Android Chrome shows a paste prompt. */
export async function readClipboard(): Promise<ClipboardReadResult> {
  if (typeof navigator === 'undefined' || typeof navigator.clipboard?.readText !== 'function') return { status: 'unsupported' };
  try {
    const text = await navigator.clipboard.readText();
    return text.trim() ? { status: 'ok', text } : { status: 'empty' };
  } catch {
    return { status: 'denied' };
  }
}

export interface WakeLockHandle {
  release(): Promise<void>;
}

/** Keeps the screen on; re-acquires after the tab returns to the foreground. null when unsupported or refused. */
export async function holdWakeLock(): Promise<WakeLockHandle | null> {
  const wl = (navigator as any)?.wakeLock;
  if (!wl?.request) return null;
  let sentinel: any = null;
  let released = false;
  const acquire = async () => {
    try {
      sentinel = await wl.request('screen');
    } catch {
      sentinel = null;
    }
  };
  await acquire();
  if (!sentinel) return null;
  const onVisible = () => {
    if (!released && document.visibilityState === 'visible') void acquire();
  };
  document.addEventListener('visibilitychange', onVisible);
  return {
    async release() {
      released = true;
      document.removeEventListener('visibilitychange', onVisible);
      try {
        await sentinel?.release();
      } catch {
        /* ignore */
      }
    },
  };
}

export async function readStorageHealth(): Promise<StorageHealth> {
  try {
    return shapeEstimate(await navigator.storage?.estimate?.());
  } catch {
    return shapeEstimate(null);
  }
}

export async function isStoragePersisted(): Promise<boolean | null> {
  try {
    return typeof navigator.storage?.persisted === 'function' ? await navigator.storage.persisted() : null;
  } catch {
    return null;
  }
}

/** Heuristic grant: Chrome allows it for installed or engaged sites, otherwise silently refuses. */
export async function requestPersistentStorage(): Promise<boolean | null> {
  try {
    return typeof navigator.storage?.persist === 'function' ? await navigator.storage.persist() : null;
  } catch {
    return null;
  }
}

export function speak(text: string): boolean {
  try {
    if (typeof speechSynthesis === 'undefined') return false;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

export function stopSpeaking(): void {
  try {
    speechSynthesis?.cancel();
  } catch {
    /* ignore */
  }
}

/** Reads one NFC tag on explicit tap (Android Chrome only). Resolves with text records or null. */
export async function scanNfcOnce(timeoutMs = 15_000): Promise<string[] | null> {
  const W: any = window;
  if (typeof W.NDEFReader === 'undefined') return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const reader = new W.NDEFReader();
    await reader.scan({ signal: ctrl.signal });
    return await new Promise<string[] | null>((resolve) => {
      ctrl.signal.addEventListener('abort', () => resolve(null));
      reader.onreading = (e: any) => {
        const dec = new TextDecoder();
        const out: string[] = [];
        for (const r of e.message.records) if ((r.recordType === 'text' || r.recordType === 'url') && r.data) out.push(dec.decode(r.data));
        ctrl.abort();
        resolve(out);
      };
    });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function takeScreenshotFrame(): Promise<string | null> {
  const md: any = navigator.mediaDevices;
  if (typeof md?.getDisplayMedia !== 'function') return null;
  let stream: MediaStream | null = null;
  try {
    stream = await md.getDisplayMedia({ video: true });
    const video = document.createElement('video');
    video.srcObject = stream;
    video.muted = true;
    await video.play();
    const c = document.createElement('canvas');
    c.width = video.videoWidth;
    c.height = video.videoHeight;
    c.getContext('2d')?.drawImage(video, 0, 0);
    return c.toDataURL('image/jpeg', 0.8);
  } catch {
    return null;
  } finally {
    stream?.getTracks().forEach((t) => t.stop());
  }
}

export function registerPrismProtocol(): boolean {
  try {
    navigator.registerProtocolHandler('web+prism', `${location.origin}/share-target/review?url=%s`);
    return true;
  } catch {
    return false;
  }
}
