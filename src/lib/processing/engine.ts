import { postgres as prisma } from '@/lib/db/postgres';
import { extractSignals } from './signals';
import { applySignalImportance } from './signal-importance';
import { MemoryPacket } from '../memory/types';
import { IDENTITY_CONFIG } from '@/config/identity';
import { maybeTriggerCognitiveRun } from '@/lib/cognitive/signal-trigger';


export class ProcessingEngine {
  /**
   * Pure Processor: Transforms a MemoryPacket into Signals and Activity entries.
   * Handles strict idempotency by clearing previous results for the packet.
   */
  static async processPacket(packetId: string, options: { testRunId?: string } = {}): Promise<{ success: boolean; signalCount: number }> {
    const { testRunId = 'PROD' } = options;
    try {
      // 1. Fetch Packet
      const packet = await prisma.memoryPacket.findFirst({ 
        where: { id: packetId, test_run_id: testRunId } 
      });
      if (!packet || packet.status !== 'active') {
        return { success: false, signalCount: 0 };
      }

      // 2. Strict Idempotency: Clear previous L2 debris for this packet
      await Promise.all([
        prisma.signal.deleteMany({ where: { packet_id: packetId, test_run_id: testRunId } }),
        prisma.activityStream.deleteMany({ where: { packet_id: packetId, test_run_id: testRunId } })
      ]);

      // 3. Extract Signals
      let signals = extractSignals(packet as any);
      // Optional (DECIDER_SIGNALS=1): drop signals the Decider rates unimportant.
      if (process.env.DECIDER_SIGNALS === '1') {
        const content = typeof packet.content === 'string' ? packet.content : JSON.stringify(packet.content);
        signals = await applySignalImportance(content, signals);
      }

      // 4. Persistence
      if (signals.length > 0) {
        // Bulk create signals
        await prisma.signal.createMany({ 
          data: signals.map(s => ({
            ...s,
            timestamp: new Date(s.timestamp),
            test_run_id: testRunId,
            processing_state: 'complete'
          })) as any
        });

        // Signal-spike trigger (opt-in via COGNITIVE_SIGNAL_TRIGGER=1): deduped/capped/timeboxed
        // inside maybeTriggerCognitiveRun, which never throws.
        await maybeTriggerCognitiveRun({ userId: IDENTITY_CONFIG.DEFAULT_USER_ID, signals, testRunId });

        // Create Activity entries for each signal
        for (const signal of signals) {
          await prisma.activityStream.create({
            data: {
              packet_id: packetId,
              activity_type: signal.type,
              timestamp: new Date(signal.timestamp),
              intensity: signal.intensity_absolute,
              source: packet.source,
              test_run_id: testRunId,
              metadata: {
                ...signal.metadata,
                category: signal.category,
                confidence: signal.confidence
              }
            }
          });
        }
      } else {
        // neutral activity if no signals extracted
        await prisma.activityStream.create({
          data: {
            packet_id: packetId,
            activity_type: 'neutral',
            timestamp: new Date(packet.event_time as any),
            intensity: 0.1,
            source: packet.source,
            test_run_id: testRunId,
            metadata: { 
              note: 'NEUTRAL_ACTIVITY: No high-confidence signals extracted.'
            }
          }
        });
      }

      return { success: true, signalCount: signals.length };
    } catch (err: any) {
      console.error('[ProcessingEngine] Core failure for %s:', String(packetId), err);
      throw err; // Let scheduler handle status update
    }
  }
}
