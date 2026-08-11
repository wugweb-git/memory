/**
 * Postgres text/jsonb columns cannot store the NUL character (U+0000) — it
 * raises `22P05 unsupported Unicode escape sequence`. Extracted text from PDFs,
 * .docx, and some CSVs commonly contains stray NULs (and other disallowed C0
 * control chars), which otherwise crashes every packet/blob write.
 *
 * `stripNullBytes` deep-cleans strings inside plain objects/arrays while leaving
 * Dates, numbers, booleans, null, and other non-plain objects untouched.
 */

/** Drop NUL + C0 control chars Postgres rejects, keeping tab/newline/carriage-return. */
function cleanString(s: string): string {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i);
    const isDisallowed = (code >= 0 && code <= 8) || code === 11 || code === 12 || (code >= 14 && code <= 31);
    if (!isDisallowed) out += s[i];
  }
  return out;
}

export function stripNullBytes<T>(value: T): T {
  if (typeof value === 'string') return cleanString(value) as unknown as T;
  if (Array.isArray(value)) return value.map((v) => stripNullBytes(v)) as unknown as T;
  // Only recurse into plain objects — never Date, Buffer, etc.
  if (value && typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = stripNullBytes(v);
    }
    return out as unknown as T;
  }
  return value;
}
