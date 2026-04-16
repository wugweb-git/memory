import { PrismaClient } from '@prisma/client';
import { extractSignals } from './signals';
import { MemoryPacket } from '../memory/types';

const prisma = new PrismaClient();

export class ProcessingEngine {
  /**
   * Pure Processor: Transforms a MemoryPacket into Signals and Activity entries.
   * Handles strict idempotency by clearing previous results for the packet.
   */
  static async processPacket(packetId: string): Promise<{ success: boolean; signalCount: number }> {
    try {
      // 1. Fetch Packet
      const packet = await prisma.memoryPacket.findUnique({ where: { id: packetId } });
      if (!packet || packet.status !== 'active') {
        return { success: false, signalCount: 0 };
      }

      // 2. Strict Idempotency: Clear previous L2 debris for this packet
      await Promise.all([
        prisma.signal.deleteMany({ where: { packet_id: packetId } }),
        prisma.activityStream.deleteMany({ where: { packet_id: packetId } })
      ]);

      // 3. Extract Signals
      const signals = extractSignals(packet as any);

      // 4. Persistence
      if (signals.length > 0) {
        // Bulk create signals
        await prisma.signal.createMany({ 
          data: signals.map(s => ({
            ...s,
            timestamp: new Date(s.timestamp)
          })) as any 
        });

        // Create Activity entries for each signal
        for (const signal of signals) {
          await prisma.activityStream.create({
            data: {
              packet_id: packetId,
              activity_type: signal.type,
              timestamp: new Date(signal.timestamp),
              intensity: signal.intensity_absolute,
              source: packet.source,
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
            metadata: { 
              note: 'NEUTRAL_ACTIVITY: No high-confidence signals extracted.'
            }
          }
        });
      }

      return { success: true, signalCount: signals.length };
    } catch (err: any) {
      console.error(`[ProcessingEngine] Core failure for ${packetId}:`, err);
      throw err; // Let scheduler handle status update
    }
  }
}
