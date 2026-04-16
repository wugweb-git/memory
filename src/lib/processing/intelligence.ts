import { PrismaClient } from '@prisma/client';
import { WindowType } from '../memory/types';

const prisma = new PrismaClient();

export class IntelligenceEngine {
  /**
   * Recalculates relative intensity for signals based on a 30-day baseline.
   * Also applies time-based decay to signal weights.
   */
  static async scoringEngine() {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // 1. Calculate Baseline (Average Intensity)
    const stats = await prisma.signal.aggregate({
      where: { timestamp: { gte: thirtyDaysAgo } },
      _avg: { intensity_absolute: true }
    });
    
    const baseline = Math.max(0.3, stats._avg.intensity_absolute || 0.5);
    const recentSignals = await prisma.signal.findMany({ 
      where: { timestamp: { gte: thirtyDaysAgo } } 
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
   */
  static async detectPatterns() {
    const windows: WindowType[] = ['7d', '30d', 'all'];
    const now = new Date();

    for (const windowType of windows) {
      const gte = new Date();
      if (windowType === '7d') gte.setDate(gte.getDate() - 7);
      else if (windowType === '30d') gte.setDate(gte.getDate() - 30);
      else gte.setFullYear(2020); // Beginning of time

      const signals = await prisma.signal.findMany({ 
        where: { timestamp: { gte } } 
      });

      if (signals.length < 10) continue; // Noise floor

      // Peak Activity Detection
      const hours = new Set(signals.map(s => new Date(s.timestamp).getHours()));
      if (hours.size < 3) continue; // Dispersion requirement

      const hourCounts: Record<number, number> = {};
      signals.forEach(s => { 
        const h = new Date(s.timestamp).getHours(); 
        hourCounts[h] = (hourCounts[h] || 0) + 1; 
      });

      const peak = Object.entries(hourCounts).sort((a,b) => b[1] - a[1])[0];

      if (peak) {
        // Upsert pattern (one per type per window)
        const existing = await prisma.pattern.findFirst({
          where: { type: 'peak_activity_time', window_type: windowType }
        });

        const data = {
          type: 'peak_activity_time',
          window_type: windowType,
          confidence: 0.8,
          signal_count: signals.length,
          consistency_score: Math.min(1.0, hours.size / 12),
          last_detected: now,
          metadata: { hour: peak[0], count: peak[1] }
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
   * Generates descriptive pattern insights.
   * L2 Standard: Descriptive only, no prescriptive actions.
   */
  static async generatePatternInsights() {
     // This would typically populate the Intel Panel with descriptive data
     // For now, it's a placeholder for L3 to hook into
     console.log('[IntelligenceEngine] Descriptive insights cycle completed.');
  }
}
