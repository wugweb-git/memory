import { mongo } from "@/lib/db/mongo";
import crypto from 'crypto';

export interface ReconciliationResult {
  entityId: string;
  isNew: boolean;
  verified: boolean;
}

/**
 * Reconciliation Engine (Layer 2.5 Hardened)
 * Logic: Exact Match -> Alias Match -> Embedding (Future) -> LLM (Future)
 */
export class ReconciliationEngine {
  
  private static generateHash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Deterministic First Reconciliation
   */
  static async reconcile(params: {
    name: string;
    type: string;
    confidence: number;
    testRunId: string;
    packetId: string;
  }): Promise<ReconciliationResult> {
    const { name, type, confidence, testRunId, packetId } = params;
    const normalized = name.toLowerCase().trim();
    const dedupHash = this.generateHash(`${normalized}_${type}`);

    // 1. EXACT MATCH (Normalized Name + Type + TestRunId)
    const existing = await mongo.entity.findUnique({
      where: {
        normalized_name_type_test_run_id: {
          normalized_name: normalized,
          type,
          test_run_id: testRunId
        }
      }
    });

    if (existing) {
      const metadata = (existing.metadata as any) || { source_count: 1 };
      const newSourceCount = (metadata.source_count || 0) + 1;
      
      // Update metadata and occurrences
      const updated = await mongo.entity.update({
        where: { id: existing.id },
        data: {
          occurrences: { increment: 1 },
          last_seen: new Date(),
          source_chunk_ids: { push: packetId },
          packet_ids: existing.packet_ids.includes(packetId) ? undefined : { push: packetId },
          metadata: {
            ...metadata,
            source_count: newSourceCount,
            last_seen_at: new Date()
          }
        }
      });

      // Verification Logic: verified = true ONLY IF source_count >= 2
      const sourceCount = (updated.metadata as any)?.source_count || 1;
      if (!updated.verified && sourceCount >= 2) {
        await mongo.entity.update({
          where: { id: updated.id },
          data: { verified: true }
        });
      }

      return { entityId: updated.id, isNew: false, verified: updated.verified };
    }

    // 2. ALIAS MATCH
    const aliasMatch = await mongo.entityAlias.findFirst({
      where: {
        alias: normalized,
        test_run_id: testRunId
      },
      include: { entity: true }
    });

    if (aliasMatch && aliasMatch.entity.type === type) {
      const updated = await mongo.entity.update({
        where: { id: aliasMatch.entity_id },
        data: {
          occurrences: { increment: 1 },
          last_seen: new Date(),
          source_chunk_ids: { push: packetId }
        }
      });
      return { entityId: updated.id, isNew: false, verified: updated.verified };
    }

    // 3. CREATE NEW (Unverified)
    const newEntity = await mongo.entity.create({
      data: {
        name,
        normalized_name: normalized,
        type,
        confidence,
        verified: false,
        source_chunk_ids: [packetId],
        packet_ids: [packetId],
        occurrences: 1,
        dedup_hash: dedupHash,
        test_run_id: testRunId,
        metadata: {
          source_count: 1,
          last_seen_at: new Date()
        }
      }
    });

    return { entityId: newEntity.id, isNew: true, verified: false };
  }

  /**
   * Promote Pending Edges to Relationships
   * Rule: Relationship created ONLY IF both sides are verified.
   */
  static async promotePendingEdges(packetId: string, testRunId: string) {
    const pending = await mongo.pendingEdge.findMany({
      where: { source_chunk_id: packetId, test_run_id: testRunId }
    });

    for (const edge of pending) {
      // Find both entities by name/alias and ensure THEY ARE VERIFIED
      const [fromEnt, toEnt] = await Promise.all([
        this.findVerifiedEntity(edge.from_temp, testRunId),
        this.findVerifiedEntity(edge.to_temp, testRunId)
      ]);

      if (fromEnt && toEnt) {
        const relDedupHash = this.generateHash(`${fromEnt.id}_${toEnt.id}_${edge.type}`);
        
        await mongo.relationship.upsert({
          where: { 
            dedup_hash_test_run_id: { 
              dedup_hash: relDedupHash, 
              test_run_id: testRunId 
            } 
          },
          update: {
            source_chunk_ids: { push: edge.source_chunk_id }
          },
          create: {
            from_entity_id: fromEnt.id,
            to_entity_id: toEnt.id,
            type: edge.type,
            confidence: edge.confidence,
            verified: true,
            source_chunk_ids: [edge.source_chunk_id],
            dedup_hash: relDedupHash,
            test_run_id: testRunId,
            processing_state: "complete"
          }
        });

        // Cleanup pending edge
        await mongo.pendingEdge.delete({ where: { id: edge.id } });
      }
    }
  }

  private static async findVerifiedEntity(name: string, testRunId: string) {
    const normalized = name.toLowerCase().trim();
    return mongo.entity.findFirst({
      where: {
        test_run_id: testRunId,
        verified: true,
        OR: [
          { normalized_name: normalized },
          { aliases: { some: { alias: normalized } } }
        ]
      }
    });
  }
}
