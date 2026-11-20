/**
 * Pure filter for publishing_queue rows stuck in `processing`.
 *
 * The table has no updatedAt, so the claim time lives in `scheduledAt` (the
 * publishing-queue job stamps it when it claims an item). Rows claimed by an
 * older build have no claim stamp and fall back to createdAt. Using createdAt
 * alone would steal a long-queued item the moment it is claimed.
 */
export function staleProcessingWhere(cutoff: Date) {
  return {
    status: 'processing',
    OR: [
      { scheduledAt: { lt: cutoff } },
      { scheduledAt: null, createdAt: { lt: cutoff } },
    ],
  };
}
