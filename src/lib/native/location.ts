/** Pure location helpers: error mapping, payload shaping, permission-state copy. */
import { geoUrl, isValidCoordinate, mapsWebUrl } from './deep-links';

export type LocationErrorKind = 'denied' | 'unavailable' | 'timeout' | 'unsupported';

export interface Place {
  lat: number;
  lon: number;
  accuracy: number | null;
  /** ISO timestamp of the fix. */
  timestamp: string;
  mapsUrl: string;
  geoUri: string;
}

export const LOCATION_TIMEOUT_MS = 10_000;

/** GeolocationPositionError.code: 1 denied, 2 unavailable, 3 timeout. */
export function mapGeoError(code: number): LocationErrorKind {
  return code === 1 ? 'denied' : code === 3 ? 'timeout' : 'unavailable';
}

export function locationErrorMessage(kind: LocationErrorKind): string {
  switch (kind) {
    case 'denied': return 'Location permission was denied. Allow it in your browser or Android site settings, then try again.';
    case 'timeout': return 'Location took too long (10 seconds). Move to open sky or try high accuracy.';
    case 'unsupported': return 'This browser cannot share location.';
    default: return 'Location is unavailable right now. Check that location is switched on.';
  }
}

export function permissionLabel(state: string | null | undefined): string {
  if (state === 'granted') return 'Allowed';
  if (state === 'denied') return 'Blocked';
  if (state === 'prompt') return 'Will ask';
  return 'Unknown';
}

export function buildPlace(c: { latitude: number; longitude: number; accuracy?: number | null }, at: Date = new Date()): Place | null {
  if (!isValidCoordinate(c.latitude, c.longitude)) return null;
  const r = (n: number) => Math.round(n * 1e5) / 1e5;
  return {
    lat: r(c.latitude),
    lon: r(c.longitude),
    accuracy: typeof c.accuracy === 'number' && Number.isFinite(c.accuracy) ? Math.round(c.accuracy) : null,
    timestamp: at.toISOString(),
    mapsUrl: mapsWebUrl(c.latitude, c.longitude) as string,
    geoUri: geoUrl(c.latitude, c.longitude) as string,
  };
}

/** Human line for notes: "52.52, 13.405 (about 20 m)". */
export function formatPlace(p: Place): string {
  return `${p.lat}, ${p.lon}${p.accuracy !== null ? ` (about ${p.accuracy} m)` : ''}`;
}

/**
 * Adds a `place` to an existing capture body (raw_payload object + trace_json) without touching other
 * fields, so old payloads and offline-queue replays keep working unchanged.
 */
export function attachPlaceToBody<T extends { raw_payload?: unknown; trace_json?: unknown }>(body: T, place: Place | null): T {
  if (!place) return body;
  const raw = body.raw_payload;
  const rawOut = raw && typeof raw === 'object' && !Array.isArray(raw) ? { ...(raw as Record<string, unknown>), place } : raw;
  const trace = body.trace_json && typeof body.trace_json === 'object' ? (body.trace_json as Record<string, unknown>) : {};
  return { ...body, raw_payload: rawOut, trace_json: { ...trace, place } };
}
