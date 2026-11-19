/**
 * Owner setting: should items pulled in by connector syncs flow straight into
 * memory (L1), or wait in the buffer for review?
 *
 *   off      (default) review-first: everything waits in the buffer.
 *   trusted  auto-promote only connectors with low privacy risk.
 *   all      auto-promote every synced connector, Gmail included.
 *
 * Persisted in Neon `scheduler_state` under `setting:auto-promote-sync`, value
 * `{ mode }`, so no migration is needed. Reads fail closed to `off`.
 * Promotion itself goes through Promote_To_Memory -> MemoryService.ingest, so
 * the noise filter, normalization and sensitivity gate still apply.
 */

export const AUTO_PROMOTE_KEY = 'setting:auto-promote-sync';

export const AUTO_PROMOTE_MODES = ['off', 'trusted', 'all'] as const;
export type AutoPromoteMode = (typeof AUTO_PROMOTE_MODES)[number];
export const DEFAULT_AUTO_PROMOTE_MODE: AutoPromoteMode = 'off';

/** Connectors whose content is low-risk: public activity, own media and calendar/task metadata. */
const TRUSTED_IDS = new Set(['github', 'youtube', 'blog', 'notion', 'spotify', 'google-tasks']);

export function isTrustedConnector(connectorId: string): boolean {
  return TRUSTED_IDS.has(connectorId) || connectorId === 'google-calendar' || connectorId.startsWith('google-calendar-');
}

export function isAutoPromoteMode(v: unknown): v is AutoPromoteMode {
  return typeof v === 'string' && (AUTO_PROMOTE_MODES as readonly string[]).includes(v);
}

/** Pure decision: does this mode auto-promote items from this connector? */
export function shouldAutoPromote(mode: AutoPromoteMode, connectorId: string): boolean {
  if (mode === 'all') return true;
  if (mode === 'trusted') return isTrustedConnector(connectorId);
  return false;
}

export interface AutoPromoteStore {
  get(): Promise<unknown>;
  set(value: { mode: AutoPromoteMode }): Promise<void>;
}

const dbStore: AutoPromoteStore = {
  async get() {
    const { postgres } = await import('@/lib/db/postgres');
    const row = await postgres.schedulerState.findUnique({ where: { key: AUTO_PROMOTE_KEY } });
    return row?.value ?? null;
  },
  async set(value) {
    const { postgres } = await import('@/lib/db/postgres');
    await postgres.schedulerState.upsert({
      where: { key: AUTO_PROMOTE_KEY },
      create: { key: AUTO_PROMOTE_KEY, value: value as any },
      update: { value: value as any },
    });
  },
};

export async function getAutoPromoteMode(store: AutoPromoteStore = dbStore): Promise<AutoPromoteMode> {
  try {
    const v = (await store.get()) as { mode?: unknown } | null;
    return isAutoPromoteMode(v?.mode) ? v!.mode as AutoPromoteMode : DEFAULT_AUTO_PROMOTE_MODE;
  } catch {
    return DEFAULT_AUTO_PROMOTE_MODE;
  }
}

export async function setAutoPromoteMode(
  mode: AutoPromoteMode,
  store: AutoPromoteStore = dbStore,
): Promise<void> {
  await store.set({ mode });
}

/** Whether a sync of this connector should auto-promote, per the saved setting. */
export async function autoPromoteFor(connectorId: string, store: AutoPromoteStore = dbStore): Promise<boolean> {
  return shouldAutoPromote(await getAutoPromoteMode(store), connectorId);
}

/** Request validation for PUT /api/settings/auto-promote. */
export function parseAutoPromoteBody(body: unknown): { ok: true; mode: AutoPromoteMode } | { ok: false; error: string } {
  const mode = (body as { mode?: unknown } | null)?.mode;
  if (!isAutoPromoteMode(mode)) return { ok: false, error: 'Mode must be off, trusted or all.' };
  return { ok: true, mode };
}
