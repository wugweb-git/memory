import { validatePostUrl } from '@/lib/platforms/manual';
import { applyManualConfirmation, type DeliveryRecord } from './delivery';

export type ManualConfirmDeps = {
  findPublished: (outputId: string) => Promise<{ id: string; publishedContent: unknown } | null>;
  updatePublished: (id: string, publishedContent: Record<string, unknown>) => Promise<void>;
};

export type ManualConfirmResult =
  | { ok: true; delivery: DeliveryRecord }
  | { ok: false; status: 400 | 404 | 409; error: string };

async function defaultDeps(): Promise<ManualConfirmDeps> {
  const { postgres } = await import('@/lib/db/postgres');
  const db = postgres as any;
  return {
    findPublished: (outputId) =>
      db.publishedOutput.findFirst({ where: { outputId }, select: { id: true, publishedContent: true } }),
    updatePublished: async (id, publishedContent) => {
      await db.publishedOutput.update({ where: { id }, data: { publishedContent } });
    },
  };
}

/** Records that the owner posted a prepared output by hand. Validates the optional URL first. */
export async function confirmManualPost(
  input: { outputId: unknown; url?: unknown },
  deps?: ManualConfirmDeps,
  now: Date = new Date(),
): Promise<ManualConfirmResult> {
  if (typeof input.outputId !== 'string' || !input.outputId.trim()) {
    return { ok: false, status: 400, error: 'outputId required' };
  }
  const check = validatePostUrl(input.url);
  if (!check.ok) return { ok: false, status: 400, error: check.error };

  const d = deps ?? (await defaultDeps());
  const row = await d.findPublished(input.outputId);
  if (!row) return { ok: false, status: 404, error: 'Nothing prepared for this output' };

  const applied = applyManualConfirmation(row.publishedContent, check.url, now);
  if (!applied.ok) return { ok: false, status: 409, error: 'This output was not prepared for manual posting' };

  await d.updatePublished(row.id, applied.content);
  return { ok: true, delivery: applied.delivery };
}
