/**
 * Entity de-duplication helpers (TSK-005). Pure, so they are unit-testable.
 * normalizeEntityName collapses case, accents, punctuation, whitespace and
 * trailing corporate suffixes so "Acme, Inc." and "acme" resolve to one entity.
 */
const CORP_SUFFIXES = new Set(['inc', 'llc', 'ltd', 'corp', 'co', 'gmbh', 'plc']);

export function normalizeEntityName(name: string): string {
  const base = String(name ?? '')
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const parts = base.split(' ');
  while (parts.length > 1 && CORP_SUFFIXES.has(parts[parts.length - 1])) parts.pop();
  return parts.join(' ');
}

/** Candidate lookup keys for a name: plain lowercase/trim form plus the fully normalized form. */
export function nameKeys(name: string): string[] {
  const plain = String(name ?? '').toLowerCase().trim();
  const norm = normalizeEntityName(name);
  return Array.from(new Set([plain, norm].filter(Boolean)));
}
