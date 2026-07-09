/**
 * Auto-sync scheduler (L0) — runs every configured, due connector and pulls
 * new items into the blob buffer. Wired into /api/jobs/run (Vercel Cron).
 *
 * On Hobby cron this fires ~daily; each connector's own `cadenceMins` gates
 * whether it actually pulls on a given run. Manual "Sync now" stays available
 * per-source via POST /api/sources/[id]/sync regardless of cadence.
 */

import { dueConnectors } from '@/lib/ingestion/connectors';

export interface SourceSyncSummary {
  ran: number;
  ingested: number;
  skipped: number;
  results: Array<{ id: string; ingested: number; skipped: number; error?: string }>;
}

export async function runSourceSync(): Promise<SourceSyncSummary> {
  const due = await dueConnectors();
  const summary: SourceSyncSummary = { ran: 0, ingested: 0, skipped: 0, results: [] };

  for (const connector of due) {
    try {
      const res = await connector.sync();
      summary.ran++;
      summary.ingested += res.ingested;
      summary.skipped += res.skipped;
      summary.results.push({ id: connector.id, ingested: res.ingested, skipped: res.skipped, error: res.error });
    } catch (err: any) {
      summary.results.push({ id: connector.id, ingested: 0, skipped: 0, error: err?.message ?? String(err) });
    }
  }

  return summary;
}
