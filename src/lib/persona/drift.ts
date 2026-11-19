/**
 * Layer 4 — Persona drift detection.
 *
 * Drift = how far the *recent* persona vector has moved from its *baseline*.
 * Vectors are the numeric keys of the persona JSON fields (communicationStyle
 * tone metrics, writingStyle structure metrics, decisionStyle markers) as
 * recorded by the evolution log, so no extra storage is needed.
 */
import { postgres } from "@/lib/db/postgres";

/** Scalar helper (kept for existing callers). */
export function detectPersonaDrift(baseline: number, latest: number, threshold = 0.2) {
  const delta = Math.abs(latest - baseline);
  return { drifted: delta >= threshold, delta: Number(delta.toFixed(3)) };
}

export type TraitVector = Record<string, number>;

export interface DriftChange {
  key: string;
  from: number;
  to: number;
  delta: number;
}

export interface VectorDrift {
  drifted: boolean;
  /** Mean absolute delta over the keys present in both vectors (0..1 for normalised metrics). */
  magnitude: number;
  maxDelta: number;
  /** 1 - cosine similarity of the shared keys (0 = same direction). */
  cosineDistance: number;
  comparedKeys: number;
  /** Keys whose |delta| >= keyThreshold, largest first. */
  changes: DriftChange[];
}

/** Extract finite numeric leaves (top level) from a persona JSON field. */
export function toTraitVector(value: unknown): TraitVector {
  const out: TraitVector = {};
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (typeof v === "number" && Number.isFinite(v)) out[k] = v;
    }
  }
  return out;
}

export function compareTraitVectors(
  baseline: TraitVector,
  recent: TraitVector,
  opts: { threshold?: number; keyThreshold?: number } = {},
): VectorDrift {
  const threshold = opts.threshold ?? 0.1;
  const keyThreshold = opts.keyThreshold ?? 0.15;
  const keys = Object.keys(baseline).filter((k) => k in recent);
  if (!keys.length) {
    return { drifted: false, magnitude: 0, maxDelta: 0, cosineDistance: 0, comparedKeys: 0, changes: [] };
  }

  let sumAbs = 0;
  let maxDelta = 0;
  let dot = 0;
  let nb = 0;
  let nr = 0;
  const changes: DriftChange[] = [];
  for (const k of keys) {
    const delta = recent[k] - baseline[k];
    const abs = Math.abs(delta);
    sumAbs += abs;
    maxDelta = Math.max(maxDelta, abs);
    dot += baseline[k] * recent[k];
    nb += baseline[k] ** 2;
    nr += recent[k] ** 2;
    if (abs >= keyThreshold) {
      changes.push({ key: k, from: round(baseline[k]), to: round(recent[k]), delta: round(delta) });
    }
  }
  const magnitude = sumAbs / keys.length;
  const cosine = nb > 0 && nr > 0 ? dot / (Math.sqrt(nb) * Math.sqrt(nr)) : 1;
  changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));

  return {
    drifted: magnitude >= threshold || maxDelta >= Math.max(threshold * 2, keyThreshold * 2),
    magnitude: round(magnitude),
    maxDelta: round(maxDelta),
    cosineDistance: round(Math.max(0, 1 - cosine)),
    comparedKeys: keys.length,
    changes,
  };
}

const round = (n: number) => Number(n.toFixed(3));

export type DriftField = "communicationStyle" | "writingStyle" | "decisionStyle";
const FIELDS: DriftField[] = ["communicationStyle", "writingStyle", "decisionStyle"];

export interface LogRow {
  changedField: string | null;
  oldValue: unknown;
  newValue: unknown;
  createdAt: Date;
}

/**
 * Pure: given evolution-log rows (any order), compute per-field drift between the
 * baseline (value before the oldest change in the window) and the recent value
 * (after the newest change).
 */
export function driftFromLogs(rows: LogRow[], opts: { threshold?: number } = {}) {
  const fields: Record<string, VectorDrift & { changeCount: number; since: string | null; until: string | null }> = {};
  for (const field of FIELDS) {
    const mine = rows
      .filter((r) => r.changedField === field)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    if (!mine.length) continue;
    const first = mine[0];
    const last = mine[mine.length - 1];
    const d = compareTraitVectors(toTraitVector(first.oldValue), toTraitVector(last.newValue), opts);
    fields[field] = {
      ...d,
      changeCount: mine.length,
      since: first.createdAt.toISOString(),
      until: last.createdAt.toISOString(),
    };
  }
  const list = Object.values(fields);
  return {
    drifted: list.some((f) => f.drifted),
    magnitude: list.length ? round(Math.max(...list.map((f) => f.magnitude))) : 0,
    fields,
  };
}

/** Loads the evolution log window and computes drift for a user. */
export async function analyzePersonaDrift(userId: string, opts: { limit?: number; threshold?: number } = {}) {
  const rows = await postgres.personaEvolutionLog.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: opts.limit ?? 100,
    select: { changedField: true, oldValue: true, newValue: true, createdAt: true },
  });
  return driftFromLogs(rows, { threshold: opts.threshold });
}
