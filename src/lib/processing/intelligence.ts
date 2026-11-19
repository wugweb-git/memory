import { postgres as prisma } from '@/lib/db/postgres';
import { WindowType } from '../memory/types';

export interface DetectedPattern {
  type: string;
  confidence: number;
  consistency_score: number;
  metadata: Record<string, any>;
}

type SignalLike = { timestamp: Date | string; type?: string; source?: string };

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const MIN_PATTERN_SIGNALS = 10;

function topEntry(counts: Record<string, number>): [string, number] | null {
  // Deterministic: highest count, ties broken alphabetically.
  const entries = Object.entries(counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return entries[0] ?? null;
}

/**
 * Pure pattern detection over a window of signals (UTC-based, deterministic).
 * Emits peak_activity_time, weekday_rhythm, source_concentration and
 * dominant_signal_type when each clears its own dispersion/support threshold.
 */
export function computePatterns(signals: SignalLike[]): DetectedPattern[] {
  const total = signals.length;
  if (total < MIN_PATTERN_SIGNALS) return [];
  const out: DetectedPattern[] = [];

  // Peak activity hour (needs >=3 distinct hours so one burst is not a "pattern").
  const hourCounts: Record<string, number> = {};
  signals.forEach((s) => {
    const h = String(new Date(s.timestamp).getUTCHours());
    hourCounts[h] = (hourCounts[h] || 0) + 1;
  });
  const hourKeys = Object.keys(hourCounts);
  if (hourKeys.length >= 3) {
    const peak = topEntry(hourCounts)!;
    out.push({
      type: 'peak_activity_time',
      confidence: 0.8,
      consistency_score: Math.min(1.0, hourKeys.length / 12),
      metadata: { hour: Number(peak[0]), count: peak[1], share: peak[1] / total, timezone: 'UTC' },
    });
  }

  // Weekday rhythm: a weekday carrying clearly more than the uniform 1/7 share.
  const dayCounts: Record<string, number> = {};
  signals.forEach((s) => {
    const d = String(new Date(s.timestamp).getUTCDay());
    dayCounts[d] = (dayCounts[d] || 0) + 1;
  });
  const dayKeys = Object.keys(dayCounts);
  if (dayKeys.length >= 2) {
    const peak = topEntry(dayCounts)!;
    const share = peak[1] / total;
    if (share >= 0.25) {
      out.push({
        type: 'weekday_rhythm',
        confidence: Math.min(0.9, 0.5 + share / 2),
        consistency_score: Math.min(1.0, dayKeys.length / 7),
        metadata: { weekday: Number(peak[0]), weekday_name: WEEKDAYS[Number(peak[0])], count: peak[1], share, timezone: 'UTC' },
      });
    }
  }

  // Source concentration: one source dominating the stream.
  const sourceCounts: Record<string, number> = {};
  signals.forEach((s) => {
    if (s.source) sourceCounts[s.source] = (sourceCounts[s.source] || 0) + 1;
  });
  const topSource = topEntry(sourceCounts);
  if (topSource && Object.keys(sourceCounts).length >= 2) {
    const share = topSource[1] / total;
    if (share >= 0.5) {
      out.push({
        type: 'source_concentration',
        confidence: Math.min(0.95, 0.5 + share / 2),
        consistency_score: share,
        metadata: { source: topSource[0], count: topSource[1], share, distinct_sources: Object.keys(sourceCounts).length },
      });
    }
  }

  // Dominant signal type.
  const typeCounts: Record<string, number> = {};
  signals.forEach((s) => {
    if (s.type) typeCounts[s.type] = (typeCounts[s.type] || 0) + 1;
  });
  const topType = topEntry(typeCounts);
  if (topType && Object.keys(typeCounts).length >= 2) {
    const share = topType[1] / total;
    if (share >= 0.4) {
      out.push({
        type: 'dominant_signal_type',
        confidence: Math.min(0.9, 0.5 + share / 2),
        consistency_score: share,
        metadata: { signal_type: topType[0], count: topType[1], share, distinct_types: Object.keys(typeCounts).length },
      });
    }
  }

  return out;
}

const pct = (n: number) => `${Math.round(n * 100)}%`;
const windowLabel = (w: string) => (w === '7d' ? 'the last 7 days' : w === '30d' ? 'the last 30 days' : 'all time');
const hourLabel = (h: number) => `${String(h).padStart(2, '0')}:00 UTC`;

export interface PatternInsight {
  type: string;
  window_type: string;
  text: string;
  confidence: number;
}

/**
 * Rule-based, purely descriptive sentence for a detected pattern (L2: no advice, no LLM).
 */
export function describePattern(p: { type: string; window_type: string; confidence: number; signal_count: number; metadata: any }): PatternInsight | null {
  const m = p.metadata || {};
  const w = windowLabel(p.window_type);
  let text: string | null = null;
  switch (p.type) {
    case 'peak_activity_time':
      text = `Activity peaks around ${hourLabel(Number(m.hour))} over ${w} (${m.count} of ${p.signal_count} signals).`;
      break;
    case 'weekday_rhythm':
      text = `${m.weekday_name || 'One weekday'} is the busiest day over ${w}, carrying ${pct(Number(m.share) || 0)} of signals.`;
      break;
    case 'source_concentration':
      text = `${pct(Number(m.share) || 0)} of signals over ${w} come from ${m.source} (${m.distinct_sources} sources in total).`;
      break;
    case 'dominant_signal_type':
      text = `${String(m.signal_type).replace(/_/g, ' ')} makes up ${pct(Number(m.share) || 0)} of signals over ${w}.`;
      break;
  }
  return text ? { type: p.type, window_type: p.window_type, text, confidence: p.confidence } : null;
}

/** Builds insights from patterns, narrower windows first, then by confidence. Pure. */
export function buildPatternInsights(
  patterns: Array<{ type: string; window_type: string; confidence: number; signal_count: number; metadata: any }>,
): PatternInsight[] {
  const order: Record<string, number> = { '7d': 0, '30d': 1, all: 2 };
  return patterns
    .map(describePattern)
    .filter((i): i is PatternInsight => i !== null)
    .sort(
      (a, b) =>
        (order[a.window_type] ?? 9) - (order[b.window_type] ?? 9) ||
        b.confidence - a.confidence ||
        a.type.localeCompare(b.type),
    );
}


export class IntelligenceEngine {
  /**
   * Recalculates relative intensity for signals based on a 30-day baseline.
   * Also applies time-based decay to signal weights.
   */
  static async scoringEngine(testRunId: string = 'PROD') {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Calculate Baseline (Average Intensity) scoped by test_run_id
    const stats = await prisma.signal.aggregate({
      where: { 
        timestamp: { gte: thirtyDaysAgo },
        test_run_id: testRunId
      },
      _avg: { intensity_absolute: true }
    });
    
    const baseline = Math.max(0.3, stats._avg.intensity_absolute || 0.5);
    const recentSignals = await prisma.signal.findMany({ 
      where: { 
        timestamp: { gte: thirtyDaysAgo },
        test_run_id: testRunId
      } 
    });

    const now = new Date();

    for (const signal of recentSignals) {
      // 2. Time Decay Logic
      const daysSince = (now.getTime() - new Date(signal.timestamp).getTime()) / (1000 * 60 * 60 * 24);
      const timeDecay = Math.max(0.1, 1 - (daysSince / 30));
      
      const baseWeight = (signal.metadata as any)?.signal_weight || 1.0;
      const effectiveWeight = baseWeight * timeDecay;

      // 3. Normalization
      const relative = Math.min(1.0, (signal.intensity_absolute * effectiveWeight) / baseline);
      
      await prisma.signal.update({
        where: { id: signal.id },
        data: { 
          intensity_relative: Math.max(0.05, relative),
          metadata: {
            ...signal.metadata as any,
            decay_factor: timeDecay,
            last_scored: now.toISOString()
          }
        }
      });
    }
  }

  /**
   * Detects behavioral trends (patterns) across 7d, 30d, and all-time windows.
   * Pure detection lives in computePatterns(); this persists one row per
   * (type, window, test_run_id) with a descriptive insight attached.
   */
  static async detectPatterns(testRunId: string = 'PROD') {
    const windows: WindowType[] = ['7d', '30d', 'all'];
    const now = new Date();

    for (const windowType of windows) {
      const gte = new Date();
      if (windowType === '7d') gte.setDate(gte.getDate() - 7);
      else if (windowType === '30d') gte.setDate(gte.getDate() - 30);
      else gte.setFullYear(2020); // Beginning of time

      const signals = await prisma.signal.findMany({
        where: { timestamp: { gte }, test_run_id: testRunId },
        select: { timestamp: true, type: true, source: true },
      });

      for (const p of computePatterns(signals)) {
        const insight = describePattern({
          type: p.type,
          window_type: windowType,
          confidence: p.confidence,
          signal_count: signals.length,
          metadata: p.metadata,
        });
        const existing = await prisma.pattern.findFirst({
          where: { type: p.type, window_type: windowType, test_run_id: testRunId },
        });
        const data = {
          type: p.type,
          window_type: windowType,
          confidence: p.confidence,
          signal_count: signals.length,
          consistency_score: p.consistency_score,
          last_detected: now,
          test_run_id: testRunId,
          metadata: { ...p.metadata, insight: insight?.text ?? null },
        };
        if (existing) {
          await prisma.pattern.update({ where: { id: existing.id }, data });
        } else {
          await prisma.pattern.create({ data });
        }
      }
    }
  }

  /**
   * Generates descriptive pattern insights from the stored patterns.
   * L2 Standard: Descriptive only, no prescriptive actions; rule-based, no LLM.
   */
  static async generatePatternInsights(testRunId: string = 'PROD'): Promise<PatternInsight[]> {
    const patterns = await prisma.pattern.findMany({ where: { test_run_id: testRunId } });
    return buildPatternInsights(
      patterns.map((p) => ({
        type: p.type,
        window_type: p.window_type,
        confidence: p.confidence,
        signal_count: p.signal_count,
        metadata: p.metadata as any,
      })),
    );
  }
}
