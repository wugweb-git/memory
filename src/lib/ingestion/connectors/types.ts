/**
 * Connector framework (L0 ingestion) — a registry of modules that each know
 * how to pull from one real source into the blob buffer.
 *
 * Design rules:
 *  - Every connector either **really fetches** or **honestly reports** that it
 *    needs credentials. Nothing decorative.
 *  - `configured()` is a cheap, synchronous env/OAuth check — no network.
 *  - `sync()` is idempotent across runs: it dedupes against per-connector state
 *    (see ./state) so a daily scheduler run never re-ingests the same item.
 */

export type ConnectorCategory =
  | 'code'
  | 'writing'
  | 'video'
  | 'knowledge'
  | 'social'
  | 'design'
  | 'files'
  | 'device'
  | 'email';

/** How the connector talks to its source. */
export type ConnectorKind = 'rss' | 'api' | 'oauth' | 'manual' | 'device';

/** What the connector needs before it can run. */
export type ConnectorRequires = 'none' | 'env' | 'oauth';

export interface SyncResult {
  /** New blob items written this run. */
  ingested: number;
  /** Items seen but skipped (already ingested / no text). */
  skipped: number;
  /** Items examined from the source this run. */
  scanned?: number;
  /** Set when the sync failed; `ingested`/`skipped` will be 0. */
  error?: string;
}

export interface Connector {
  /** Stable id, kebab-case (used in URLs + scheduler state keys). */
  id: string;
  label: string;
  category: ConnectorCategory;
  kind: ConnectorKind;
  requires: ConnectorRequires;
  /** Minimum minutes between auto-syncs. */
  cadenceMins: number;
  /** One-line hint on what the owner must set to enable it. */
  setupHint: string;
  /** Cheap, synchronous readiness check (env var present, etc.). No network. */
  configured(): boolean;
  /** Pull from the source into the blob buffer. Must dedupe across runs. */
  sync(opts?: { autoPromote?: boolean }): Promise<SyncResult>;
}

/** Serializable view of a connector for the API / UI (no functions). */
export interface ConnectorStatus {
  id: string;
  label: string;
  category: ConnectorCategory;
  kind: ConnectorKind;
  requires: ConnectorRequires;
  cadenceMins: number;
  setupHint: string;
  configured: boolean;
  lastSyncAt: string | null;
  lastError: string | null;
  lastResult: { ingested: number; skipped: number; scanned?: number } | null;
}
