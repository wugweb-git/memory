/** Deep-link builders for tel:, sms:, mailto:, geo: and a maps web fallback. Pure; return null for unusable input. */

/** Keep a leading + and digits only. Returns null when fewer than 3 digits remain. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith('+') ? '+' : '';
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 3 ? `${plus}${digits}` : null;
}

export function telUrl(phone: string): string | null {
  const p = normalizePhone(phone);
  return p ? `tel:${p}` : null;
}

/** Android and iOS both accept `sms:<number>?body=`. */
export function smsUrl(phone: string, body?: string): string | null {
  const p = normalizePhone(phone);
  if (!p) return null;
  return body?.trim() ? `sms:${p}?body=${encodeURIComponent(body.trim())}` : `sms:${p}`;
}

const EMAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
export const isEmail = (s: string) => EMAIL_RE.test(s.trim());

export interface MailtoInput {
  to: string | string[];
  subject?: string;
  body?: string;
  cc?: string[];
  bcc?: string[];
}

export function mailtoUrl(input: MailtoInput): string | null {
  const to = (Array.isArray(input.to) ? input.to : [input.to]).map((s) => s.trim()).filter(isEmail);
  if (to.length === 0) return null;
  const q: string[] = [];
  const add = (k: string, v?: string) => v && v.trim() && q.push(`${k}=${encodeURIComponent(v.trim())}`);
  const list = (xs?: string[]) => (xs ?? []).map((s) => s.trim()).filter(isEmail).join(',');
  add('cc', list(input.cc));
  add('bcc', list(input.bcc));
  add('subject', input.subject);
  add('body', input.body);
  return `mailto:${to.map(encodeURIComponent).join(',').replace(/%40/g, '@')}${q.length ? `?${q.join('&')}` : ''}`;
}

export function isValidCoordinate(lat: number, lng: number): boolean {
  return Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;
}

const round5 = (n: number) => Math.round(n * 1e5) / 1e5;

/** geo: URI (RFC 5870). With a label Android maps apps show a named pin. */
export function geoUrl(lat: number, lng: number, label?: string): string | null {
  if (!isValidCoordinate(lat, lng)) return null;
  const c = `${round5(lat)},${round5(lng)}`;
  return label?.trim() ? `geo:${c}?q=${c}(${encodeURIComponent(label.trim())})` : `geo:${c}`;
}

/** Web fallback that works everywhere (opens the Maps app on Android when installed). */
export function mapsWebUrl(lat: number, lng: number): string | null {
  if (!isValidCoordinate(lat, lng)) return null;
  return `https://www.google.com/maps/search/?api=1&query=${round5(lat)}%2C${round5(lng)}`;
}
