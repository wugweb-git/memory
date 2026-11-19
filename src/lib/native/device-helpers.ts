/** Small pure helpers for misc device APIs (network, battery, NFC, speech, media session, idle, protocols). */

export interface NetworkInfoLike {
  effectiveType?: string;
  saveData?: boolean;
  downlink?: number;
}

export function describeNetwork(online: boolean, c?: NetworkInfoLike | null): { label: string; saveData: boolean; constrained: boolean } {
  if (!online) return { label: 'Offline', saveData: false, constrained: true };
  const eff = c?.effectiveType;
  const saveData = c?.saveData === true;
  const slow = eff === 'slow-2g' || eff === '2g';
  const label = eff ? `Online (${eff})${saveData ? ', data saver on' : ''}` : saveData ? 'Online, data saver on' : 'Online';
  return { label, saveData, constrained: saveData || slow };
}

export function describeBattery(b?: { level: number; charging: boolean } | null): string {
  if (!b || !Number.isFinite(b.level)) return 'Not reported';
  return `${Math.round(b.level * 100)}%${b.charging ? ', charging' : ''}`;
}

/** Text of a decoded Web NFC text/url record. */
export function decodeNdefRecord(r: { recordType: string; data?: DataView | ArrayBuffer | null; encoding?: string }): string | null {
  if ((r.recordType !== 'text' && r.recordType !== 'url') || !r.data) return null;
  try {
    return new TextDecoder(r.encoding || 'utf-8').decode(r.data);
  } catch {
    return null;
  }
}

/** Plain text for speech synthesis: strips markdown/URLs and caps length. */
export function speakableText(s: string, max = 3000): string {
  return s
    .replace(/https?:\/\/\S+/g, 'link')
    .replace(/[`*_#>~]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
}

export function mediaSessionMetadata(title: string, artist = 'Identity Prism OS') {
  return { title: title.trim().slice(0, 120) || 'Untitled', artist, album: '' };
}

export const IDLE_MIN_MS = 60_000; // Idle Detection API floor

export function clampIdleThreshold(ms: number): number {
  return Number.isFinite(ms) ? Math.max(IDLE_MIN_MS, Math.floor(ms)) : IDLE_MIN_MS;
}

/** registerProtocolHandler template: same-origin and must contain %s. */
export function protocolHandlerUrl(origin: string): string {
  return `${origin.replace(/\/+$/, '')}/share-target/review?url=%s`;
}

export function isWebPlusScheme(s: string): boolean {
  return /^web\+[a-z]+$/.test(s);
}
