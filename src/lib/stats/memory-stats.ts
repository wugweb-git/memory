/**
 * Single source of truth for memory-packet (L1) counts.
 *
 * Every endpoint that reports packet counts (console, /memory, admin, system
 * health, recommendations) must call `loadMemoryStats` so the numbers agree.
 *
 * Definitions (all scoped to one `test_run_id`, default PROD):
 *
 * - excluded      Packets with status `rejected` or `archived`. They are retired
 *                 and never count towards any other number; reported separately.
 * - total         Packets in scope that are not excluded.
 * - embedded      embedding_status = `embedded`. These are the searchable packets.
 * - pending       embedding_status = `pending` (includes packets that will never
 *                 embed, see not_embeddable).
 * - processing    embedding_status = `processing` (an embed call is in flight).
 * - failed        embedding_status = `failed`.
 *                 embedded + pending + processing + failed = total.
 * - not_embeddable  is_embeddable = false and not yet embedded: intentionally
 *                 skipped (restricted, too short, permanent embed failure).
 *                 Counted inside pending/failed, never inside backlog.
 * - backlog       Work waiting for the embedder: pending (embeddable) + processing.
 * - not_searchable  total - embedded.
 * - needs_attention  Packets a person may need to look at: status `failed` or
 *                 `partial`, OR embedding_status `failed`, OR processing_status
 *                 `failed`. Each packet is counted once.
 * - processing_failed  processing_status = `failed` (pipeline failure, feeds the
 *                 system-health fail rate).
 *
 * The buffer (L0 blob items) is a different layer with its own counts
 * (`/api/blob/stats`); it is never part of these numbers.
 */
import { postgres } from '@/lib/db/postgres';

export const EXCLUDED_PACKET_STATUSES = ['rejected', 'archived'] as const;
export const ATTENTION_PACKET_STATUSES = ['failed', 'partial'] as const;
export const DEFAULT_TEST_RUN_ID = 'PROD';

export interface PacketGroupRow {
  status: string;
  embedding_status: string;
  processing_status: string;
  is_embeddable: boolean;
  _count: { _all: number } | number;
}

export interface MemoryStats {
  test_run_id: string;
  total: number;
  excluded: number;
  embedded: number;
  pending: number;
  processing: number;
  failed: number;
  not_embeddable: number;
  backlog: number;
  not_searchable: number;
  needs_attention: number;
  processing_failed: number;
  /** processing_status distribution over counted packets (same shape as the old health groupBy). */
  processing_distribution: Array<{ processing_status: string; _count: number }>;
}

export function isExcludedStatus(status: string): boolean {
  return (EXCLUDED_PACKET_STATUSES as readonly string[]).includes(status);
}

function countOf(row: PacketGroupRow): number {
  return typeof row._count === 'number' ? row._count : row._count?._all ?? 0;
}

/** Pure: derive every shared number from grouped packet rows. */
export function computeMemoryStats(rows: PacketGroupRow[], testRunId = DEFAULT_TEST_RUN_ID): MemoryStats {
  const s: MemoryStats = {
    test_run_id: testRunId,
    total: 0,
    excluded: 0,
    embedded: 0,
    pending: 0,
    processing: 0,
    failed: 0,
    not_embeddable: 0,
    backlog: 0,
    not_searchable: 0,
    needs_attention: 0,
    processing_failed: 0,
    processing_distribution: [],
  };
  const dist = new Map<string, number>();

  for (const row of rows) {
    const n = countOf(row);
    if (n <= 0) continue;
    if (isExcludedStatus(row.status)) {
      s.excluded += n;
      continue;
    }
    s.total += n;
    dist.set(row.processing_status, (dist.get(row.processing_status) ?? 0) + n);

    if (row.embedding_status === 'embedded') s.embedded += n;
    else if (row.embedding_status === 'processing') s.processing += n;
    else if (row.embedding_status === 'failed') s.failed += n;
    else s.pending += n;

    if (!row.is_embeddable && row.embedding_status !== 'embedded') s.not_embeddable += n;
    if (row.embedding_status === 'pending' && row.is_embeddable) s.backlog += n;
    if (row.embedding_status === 'processing') s.backlog += n;

    if (row.processing_status === 'failed') s.processing_failed += n;
    if (
      (ATTENTION_PACKET_STATUSES as readonly string[]).includes(row.status) ||
      row.embedding_status === 'failed' ||
      row.processing_status === 'failed'
    ) {
      s.needs_attention += n;
    }
  }

  s.not_searchable = s.total - s.embedded;
  s.processing_distribution = [...dist.entries()].map(([processing_status, _count]) => ({ processing_status, _count }));
  return s;
}

type StatsDb = {
  memoryPacket: {
    groupBy: (args: any) => Promise<any[]>;
  };
};

/** One grouped query; everything else is derived in memory. */
export async function loadMemoryStats(
  testRunId: string = DEFAULT_TEST_RUN_ID,
  db: StatsDb = postgres as unknown as StatsDb,
): Promise<MemoryStats> {
  const rows = await db.memoryPacket.groupBy({
    by: ['status', 'embedding_status', 'processing_status', 'is_embeddable'],
    where: { test_run_id: testRunId },
    _count: { _all: true },
  });
  return computeMemoryStats(rows as PacketGroupRow[], testRunId);
}
