import { postgres } from "@/lib/db/postgres";
import crypto from 'crypto';
import { normalizeEntityName, nameKeys } from "@/lib/semantic/dedup";

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
    const normalized = normalizeEntityName(name) || name.toLowerCase().trim();
    const dedupHash = this.generateHash(`${normalized}_${type}`);

    // 1. EXACT MATCH (Normalized Name + Type + TestRunId)
    const existing = await postgres.entity.findUnique({
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
      const updated = await postgres.entity.update({
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
        await postgres.entity.update({
          where: { id: updated.id },
          data: { verified: true }
        });
      }

      return { entityId: updated.id, isNew: false, verified: updated.verified };
    }

    // 2. ALIAS / NORMALIZED-VARIANT MATCH (TSK-005 semantic dedup)
    // Match any alias equal to a lookup key, or an existing same-type entity whose
    // normalized_name equals one of the name's keys (e.g. raw lowercase vs punctuation-stripped).
    const keys = nameKeys(name);
    const aliasMatch = await postgres.entityAlias.findFirst({
      where: { alias: { in: keys }, test_run_id: testRunId, entity: { type } },
      include: { entity: true }
    });
    const variantMatch = aliasMatch
      ? null
      : await postgres.entity.findFirst({
          where: { normalized_name: { in: keys }, type, test_run_id: testRunId }
        });
    const matchedId = aliasMatch?.entity_id ?? variantMatch?.id;

    if (matchedId) {
      const updated = await postgres.entity.update({
        where: { id: matchedId },
        data: {
          occurrences: { increment: 1 },
          last_seen: new Date(),
          source_chunk_ids: { push: packetId }
        }
      });
      // Remember the surface form as an alias so future lookups short-circuit.
      const surface = name.toLowerCase().trim();
      if (surface && surface !== updated.normalized_name && !aliasMatch) {
        await postgres.entityAlias.create({
          data: { entity_id: updated.id, alias: surface, confidence, test_run_id: testRunId }
        }).catch(() => undefined);
      }
      return { entityId: updated.id, isNew: false, verified: updated.verified };
    }

    // 3. CREATE NEW (Unverified)
    const newEntity = await postgres.entity.create({
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
    const pending = await postgres.pendingEdge.findMany({
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
        
        await postgres.relationship.upsert({
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
        await postgres.pendingEdge.delete({ where: { id: edge.id } });
      }
    }
  }

  private static async findVerifiedEntity(name: string, testRunId: string) {
    const keys = nameKeys(name);
    return postgres.entity.findFirst({
      where: {
        test_run_id: testRunId,
        verified: true,
        OR: [
          { normalized_name: { in: keys } },
          { aliases: { some: { alias: { in: keys } } } }
        ]
      }
    });
  }
}
