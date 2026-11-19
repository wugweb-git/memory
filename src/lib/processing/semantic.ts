import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { SettingsController } from '../memory/settings';
import { postgres } from '@/lib/db/postgres';
import { isUniqueError } from '@/lib/prisma';
import crypto from 'crypto';
import { runFallbackExtraction } from '@/lib/semantic/fallback';
import { ReconciliationEngine } from '../memory/semantic/reconciliation';
import { isOpenRouterEnabled } from '@/lib/ai/models';
import { createJobClient, type JobClient } from '@/lib/ai/job-client';

const defaultModel = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
});

const ENTITY_LIMIT = 5;
const RELATIONSHIP_LIMIT = 3;
const TOPIC_LIMIT = 3;
const CONFIDENCE_THRESHOLD = 0.7;

/**
 * Layer 2.5: Semantic Enrichment Engine (Hardened)
 * Extracts entities, intents, topics, and relationships from MemoryPackets.
 * Implements deterministic reconciliation and provenance tracking.
 */
export class SemanticEngine {
  
  private static generateHash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  private static async acquireLock(packetId: string): Promise<boolean> {
    const now = new Date();
    const expiryTime = new Date(now.getTime() - 5 * 60 * 1000);

    const result = await postgres.memoryPacket.updateMany({
      where: {
        id: packetId,
        OR: [
          { processing_lock: false },
          { locked_at: { lt: expiryTime } }
        ]
      },
      data: {
        processing_lock: true,
        locked_at: now
      }
    });

    return result.count > 0;
  }

  private static async releaseLock(packetId: string) {
    await postgres.memoryPacket.update({
      where: { id: packetId },
      data: {
        processing_lock: false,
        locked_at: null
      }
    });
  }

  /**
   * Main Semantic Processing Loop
   */
  static async processSemantic(
    packetId: string, 
    options: { llmClient?: any; testRunId?: string } = {}
  ): Promise<{ success: boolean; entityCount: number; fallback: boolean }> {
    const { testRunId = 'PROD' } = options;
    // Per-job routing: structured extraction uses the `ingest` chain when OPENROUTER_API_KEY
    // is set (unless a client is injected, e.g. diagnostics). Otherwise the existing OpenAI model.
    const jobClient: JobClient | null = !options.llmClient && isOpenRouterEnabled() ? createJobClient('ingest') : null;
    const model = options.llmClient ?? jobClient ?? defaultModel;
    try {
      // 1. Settings & Kill Switch
      const config = await SettingsController.getSettings();
      if (!config.semantic_enabled && testRunId === 'PROD') {
        return { success: false, entityCount: 0, fallback: false };
      }

      // 2. Fetch Context
      const packet = await postgres.memoryPacket.findFirst({ 
        where: { id: packetId, test_run_id: testRunId } 
      });
      if (!packet) return { success: false, entityCount: 0, fallback: false };

      const signals = await postgres.signal.findMany({ 
        where: { packet_id: packetId, test_run_id: testRunId } 
      });

      // 3. Acquire Distributed Lock
      const lockAcquired = await this.acquireLock(packetId);
      if (!lockAcquired) return { success: false, entityCount: 0, fallback: false };

      // Cleanup previous partial attempts for idempotency (Sequential to avoid transactions)
      await postgres.semanticObject.deleteMany({ where: { packet_id: packetId, test_run_id: testRunId } });
      await postgres.relationship.deleteMany({ where: { source_chunk_ids: { has: packetId }, test_run_id: testRunId } });
      await postgres.pendingEdge.deleteMany({ where: { source_chunk_id: packetId, test_run_id: testRunId } });

      const contentStr = typeof packet.content === 'string' ? packet.content : JSON.stringify(packet.content);
      const signalsStr = signals.map(s => `${s.type} (${s.category})`).join(', ');

      // 4. Extraction Logic
      let data: any;
      let isFallback = false;

      try {
        const extractionPrompt = `
          You are a Semantic Extraction Engine for a Personal Operating System.
          Extract structured intelligence from the following Memory Packet and its associated Signals.

          CONTENT: "${contentStr}"
          SIGNALS (L2): "${signalsStr}"

          INSTRUCTIONS:
          1. Extract up to ${ENTITY_LIMIT} entities: (person, company, project, skill, tool, location, concept).
          2. Identify up to 2 intents: (working_on, learning, planning, consuming, communicating).
          3. Identify up to ${TOPIC_LIMIT} topics: (broad thematic clusters).
          4. Define up to ${RELATIONSHIP_LIMIT} relationships between the extracted entities.

          OUTPUT FORMAT (JSON):
          {
            "entities": [{"name": "Name", "type": "Type", "confidence": 0.9}],
            "intents": [{"intent": "Intent", "confidence": 0.85}],
            "topics": [{"name": "Topic Name", "confidence": 0.8}],
            "relationships": [{"from": "Entity A", "to": "Entity B", "type": "Type", "weight": 0.9}]
          }
        `;

        const response = await model.call([
          new SystemMessage("Extract structured semantic intelligence strictly as JSON."),
          new HumanMessage(extractionPrompt),
        ]);

        data = JSON.parse(response.content as string);
      } catch (err: any) {
        console.warn('[SemanticEngine] LLM Failure, using fallback:', err.message);
        isFallback = true;
        data = runFallbackExtraction(contentStr, { entities: ENTITY_LIMIT, topics: TOPIC_LIMIT, relationships: RELATIONSHIP_LIMIT });
      }

      // 5. Reconciliation Path
      const processedEntities: any[] = [];
      for (const rawEntity of (data.entities || []).slice(0, ENTITY_LIMIT)) {
        if (rawEntity.confidence < CONFIDENCE_THRESHOLD && !isFallback) continue;

        const recon = await ReconciliationEngine.reconcile({
          name: rawEntity.name,
          type: rawEntity.type,
          confidence: rawEntity.confidence,
          testRunId,
          packetId
        });

        processedEntities.push({
          ...rawEntity,
          entity_id: recon.entityId,
          verified: recon.verified
        });
      }

      // 6. Topics & Intents (Stored in SemanticObject)
      // Fallback topics are kept (flagged fallback:true, low confidence) so downstream isn't empty.
      const processedTopics = (data.topics || []).filter((t: any) => isFallback || t.confidence >= 0.7);

      // 7. Relationship Path (Strict Verified Rule)
      if (!isFallback && data.relationships) {
        for (const rel of data.relationships.slice(0, RELATIONSHIP_LIMIT)) {
          if (rel.weight < CONFIDENCE_THRESHOLD) continue;

          const fromEnt = processedEntities.find(e => e.name.toLowerCase() === rel.from.toLowerCase());
          const toEnt = processedEntities.find(e => e.name.toLowerCase() === rel.to.toLowerCase());

          if (fromEnt?.verified && toEnt?.verified) {
            // Both verified -> Create Relationship
            const relDedupHash = this.generateHash(`${fromEnt.entity_id}_${toEnt.entity_id}_${rel.type.toLowerCase().replace(' ', '_')}`);
            
            try {
              await postgres.relationship.upsert({
                where: { dedup_hash_test_run_id: { dedup_hash: relDedupHash, test_run_id: testRunId } },
                update: { source_chunk_ids: { push: packetId } },
                create: {
                  from_entity_id: fromEnt.entity_id,
                  to_entity_id: toEnt.entity_id,
                  type: rel.type.toLowerCase().replace(' ', '_'),
                  confidence: rel.weight,
                  verified: true,
                  source_chunk_ids: [packetId],
                  dedup_hash: relDedupHash,
                  test_run_id: testRunId,
                  processing_state: "complete"
                }
              });
            } catch (err) { /* Unique collision handled */ }
          } else {
            // Buffer in PendingEdge for future reconciliation
            await postgres.pendingEdge.create({
              data: {
                from_temp: rel.from.toLowerCase(),
                to_temp: rel.to.toLowerCase(),
                type: rel.type.toLowerCase().replace(' ', '_'),
                confidence: rel.weight,
                source_chunk_id: packetId,
                test_run_id: testRunId
              }
            });
          }
        }
      }

      // 7b. Fallback co-mention relationships: written directly but clearly low confidence
      // and unverified (never reach the 0.7 verify bar); the graph API surfaces confidence.
      if (isFallback && data.relationships) {
        for (const rel of data.relationships.slice(0, RELATIONSHIP_LIMIT)) {
          const fromEnt = processedEntities.find(e => e.name === rel.from);
          const toEnt = processedEntities.find(e => e.name === rel.to);
          if (!fromEnt || !toEnt || fromEnt.entity_id === toEnt.entity_id) continue;
          const relType = 'co_mentioned';
          const relDedupHash = this.generateHash(`${fromEnt.entity_id}_${toEnt.entity_id}_${relType}`);
          try {
            await postgres.relationship.upsert({
              where: { dedup_hash_test_run_id: { dedup_hash: relDedupHash, test_run_id: testRunId } },
              update: { source_chunk_ids: { push: packetId } },
              create: {
                from_entity_id: fromEnt.entity_id,
                to_entity_id: toEnt.entity_id,
                type: relType,
                confidence: rel.weight,
                verified: false,
                source_chunk_ids: [packetId],
                dedup_hash: relDedupHash,
                test_run_id: testRunId,
                processing_state: "complete"
              }
            });
          } catch (err) { /* unique collision handled */ }
        }
      }

      // 8. Capture Results in SemanticObject
      await postgres.semanticObject.create({
        data: {
          packet_id: packetId,
          entities: processedEntities.map(e => ({
            name: e.name,
            type: e.type,
            confidence: e.confidence,
            entity_id: e.entity_id
          })),
          intents: data.intents || [],
          topics: processedTopics,
          confidence: isFallback ? 0.3 : (data.entities?.length > 0 ? data.entities[0].confidence : 1.0),
          verification_status: isFallback ? 'unverified' : 'verified',
          fallback: isFallback,
          model: isFallback ? 'rule-based' : jobClient?.lastModel ?? 'gpt-4o-mini',
          test_run_id: testRunId,
          processing_state: "complete"
        }
      });

      // 9. Trigger Promotion Pass
      await ReconciliationEngine.promotePendingEdges(packetId, testRunId);

      return { success: true, entityCount: processedEntities.length, fallback: isFallback };
    } catch (error: any) {
      console.error('[SemanticEngine] Failure:', error);
      throw error;
    } finally {
      await this.releaseLock(packetId);
    }
  }
}
