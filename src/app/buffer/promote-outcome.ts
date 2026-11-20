export type PromoteOutcome = {
  /** True when the item left the raw state (promoted or rejected). */
  closed: boolean;
  tone: 'success' | 'warning';
  message: string;
};

/** Turns a Promote_To_Memory response body into an honest message. HOLD keeps the item; anything else non-accepted is rejected. */
export function describePromoteOutcome(body: unknown): PromoteOutcome {
  const b = (body && typeof body === 'object' ? body : {}) as { ingest_status?: string; reason?: string | null };
  const status = String(b.ingest_status ?? '').toUpperCase();
  const reason = b.reason ? String(b.reason) : '';
  if (status === 'HOLD') {
    return { closed: false, tone: 'warning', message: `Held for review${reason ? `: ${reason}` : '. It stays in the buffer.'}` };
  }
  if (status === 'ACCEPTED' || status === 'IGNORE' || status === '') {
    return { closed: true, tone: 'success', message: 'Promoted to memory.' };
  }
  return { closed: true, tone: 'warning', message: `Filtered out${reason ? `: ${reason}` : '. It was not added to memory.'}` };
}
