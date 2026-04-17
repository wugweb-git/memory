import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';
import { SettingsController } from '../memory/settings';
import prisma, { isUniqueError } from '@/lib/prisma';
import crypto from 'crypto';

const model = new ChatOpenAI({
  modelName: 'gpt-4o-mini',
  temperature: 0,
});

const ENTITY_LIMIT = 5;
const RELATIONSHIP_LIMIT = 3;
const TOPIC_LIMIT = 3;
const CONFIDENCE_THRESHOLD = 0.7;
const MERGE_THRESHOLD = 0.75;
const RECONCILIATION_THRESHOLD = 0.85;

/**
 * Layer 2.5: Semantic Enrichment Engine
 * Extracts entities, intents, topics, and relationships from MemoryPackets.
 */
export class SemanticEngine {
  private static reconciliationLocks = new Map<string, Promise<void>>();

  /**
   * Generates a stable hash for deduplication.
   */
  private static generateHash(input: string): string {
    return crypto.createHash('sha256').update(input).digest('hex');
  }

  /**
   * Acquires a soft lock on a MemoryPacket to prevent double-processing.
   * Lock expires after 5 minutes.
   */
  private static async acquireLock(packetId: string): Promise<boolean> {
    const now = new Date();
    const expiryTime = new Date(now.getTime() - 5 * 60 * 1000);

    const result = await prisma.memoryPacket.updateMany({
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

  /**
   * Releases a soft lock on a MemoryPacket.
   */
  private static async releaseLock(packetId: string) {
    await prisma.memoryPacket.update({
      where: { id: packetId },
      data: {
        processing_lock: false,
        locked_at: null
      }
    });
  }

  static async processSemantic(
    packetId: string, 
    options: { llmClient?: any; testRunId?: string } = {}
  ): Promise<{ success: boolean; entityCount: number; fallback: boolean }> {
    const { llmClient = model, testRunId = 'PROD' } = options;
    try {
      // 0. Feature Flag Check (DB-level Singleton)
      const config = await SettingsController.getSettings();
      if (!config.semantic_enabled && testRunId === 'PROD') {
        return { success: false, entityCount: 0, fallback: false };
      }

      // 1. Fetch Packet and Signals (L1 + L2)
      const packet = await prisma.memoryPacket.findFirst({ 
        where: { id: packetId, test_run_id: testRunId } 
      });
      const signals = await prisma.signal.findMany({ 
        where: { packet_id: packetId } 
      });

      if (!packet) return { success: false, entityCount: 0, fallback: false };

      // 1.5. Acquire Lock
      const lockAcquired = await this.acquireLock(packetId);
      if (!lockAcquired) {
        console.warn(`[SemanticEngine] Packet ${packetId} is already being processed or locked.`);
        return { success: false, entityCount: 0, fallback: false };
      }

      await Promise.all([
        prisma.semanticObject.deleteMany({ where: { packet_id: packetId, test_run_id: testRunId } }),
        prisma.relationship.deleteMany({ where: { packet_id: packetId, test_run_id: testRunId } }),
        prisma.pendingEdge.deleteMany({ where: { packet_id: packetId, test_run_id: testRunId } }),
      ]);

      const contentStr = typeof packet.content === 'string' 
        ? packet.content 
        : JSON.stringify(packet.content);
      
      const signalsStr = signals.map(s => `${s.type} (${s.category})`).join(', ');

      // 3. AI Extraction (with Fail-Safe)
      let data: any;
      let isFallback = false;

      try {
        const extractionPrompt = `
          You are a Semantic Extraction Engine for a Personal Operating System.
          Extract structured intelligence from the following Memory Packet and its associated Signals.

          CONTENT:
          "${contentStr}"

          SIGNALS (L2):
          "${signalsStr}"

          INSTRUCTIONS:
          1. Extract up to ${ENTITY_LIMIT} entities: (person, company, project, skill, tool, location, concept).
          2. Identify up to 2 intents: (working_on, learning, planning, consuming, communicating).
          3. Identify up to ${TOPIC_LIMIT} topics: (broad thematic clusters).
          4. Define up to ${RELATIONSHIP_LIMIT} relationships between the extracted entities.
          5. Provide a confidence score (0-1) for each item.

          OUTPUT FORMAT (JSON):
          {
            "entities": [{"name": "Name", "type": "Type", "confidence": 0.9}],
            "intents": [{"intent": "Intent", "confidence": 0.85}],
            "topics": [{"name": "Topic Name", "confidence": 0.8}],
            "relationships": [{"from": "Entity A", "to": "Entity B", "type": "Type", "weight": 0.9}]
          }
        `;

        const response = await llmClient.call([
          new SystemMessage("Extract structured semantic intelligence strictly as JSON."),
          new HumanMessage(extractionPrompt),
        ]);

        data = JSON.parse(response.content as string);
      } catch (err: any) {
        console.warn('[SemanticEngine] LLM Failure, falling back to rule-based extraction:', err.message);
        isFallback = true;
        data = this.runFallbackExtraction(contentStr);
      }

      // 4. Normalize and Store Entities
      const processedEntities: any[] = [];
      for (const rawEntity of (data.entities || []).slice(0, ENTITY_LIMIT)) {
        if (rawEntity.confidence < CONFIDENCE_THRESHOLD && !isFallback) continue;

        const entity = await this.normalizeEntity(
          rawEntity.name, 
          rawEntity.type, 
          rawEntity.confidence,
          packetId,
          isFallback ? 'unverified' : 'verified',
          testRunId,
          "pending" // ATOMICITY: Start as pending
        );

        processedEntities.push({
          name: entity.name,
          type: entity.type,
          confidence: rawEntity.confidence,
          entity_id: entity.id,
          verification_status: entity.verification_status
        });
      }

      // 5. Store Topics (Skip if fallback OR unverified)
      const processedTopics: any[] = [];
      if (!isFallback) {
        for (const rawTopic of (data.topics || []).slice(0, TOPIC_LIMIT)) {
          if (rawTopic.confidence < CONFIDENCE_THRESHOLD) continue;
          
          const topic = await prisma.topic.upsert({
            where: { 
              name_test_run_id: { 
                name: rawTopic.name.toLowerCase(), 
                test_run_id: testRunId 
              } 
            },
            update: {
              strength: { increment: 0.1 },
              packet_ids: { push: packetId },
              last_updated: new Date()
            },
            create: {
              name: rawTopic.name.toLowerCase(),
              strength: rawTopic.confidence,
              packet_ids: [packetId],
              test_run_id: testRunId,
              processing_state: "complete" // ATOMICITY: Start as complete
            }
          });
          processedTopics.push({ topic: topic.name, confidence: rawTopic.confidence });
        }
      }

      // 6. Store Relationships (STRICT: Both sides must be verified)
      if (!isFallback && data.relationships) {
        for (const rel of data.relationships.slice(0, RELATIONSHIP_LIMIT)) {
          if (rel.weight < CONFIDENCE_THRESHOLD) continue;

          const fromEnt = processedEntities.find(e => e.name.toLowerCase() === rel.from.toLowerCase());
          const toEnt = processedEntities.find(e => e.name.toLowerCase() === rel.to.toLowerCase());

          if (fromEnt && toEnt && fromEnt.verification_status === 'verified' && toEnt.verification_status === 'verified') {
            // DUPLICATE GUARD
            const existingRel = await prisma.relationship.findFirst({
              where: {
                from_entity_id: fromEnt.entity_id,
                to_entity_id: toEnt.entity_id,
                type: rel.type.toLowerCase().replace(' ', '_'),
                test_run_id: testRunId
              }
            });

            if (!existingRel) {
              const relDedupHash = this.generateHash(`${fromEnt.entity_id}_${toEnt.entity_id}_${rel.type.toLowerCase().replace(' ', '_')}_${testRunId}`);
              
              try {
                await prisma.relationship.create({
                  data: {
                    from_entity_id: fromEnt.entity_id,
                    to_entity_id: toEnt.entity_id,
                    type: rel.type.toLowerCase().replace(' ', '_'),
                    weight: rel.weight || 0.5,
                    packet_id: packetId,
                    test_run_id: testRunId,
                    dedup_hash: relDedupHash,
                    processing_state: "complete" // ATOMICITY: Start as complete
                  }
                });
              } catch (err: any) {
                if (!isUniqueError(err)) throw err;
                // Race condition: another worker created it. Safe to ignore.
                console.log(`[SemanticEngine] Relationship collision handled for ${relDedupHash}`);
              }
            }
          } else {
            // Store as PendingEdge for future reconciliation
            await prisma.pendingEdge.create({
              data: {
                from_name: rel.from.toLowerCase(),
                to_name: rel.to.toLowerCase(),
                type: rel.type.toLowerCase().replace(' ', '_'),
                weight: rel.weight || 0.5,
                packet_id: packetId,
                test_run_id: testRunId
              }
            });
          }
        }
      }

      // 7. Final Semantic Object (Atomicity: Start as pending)
      await prisma.semanticObject.create({
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
          model: isFallback ? 'rule-based' : 'gpt-4o-mini',
          test_run_id: testRunId,
          processing_state: "complete"
        }
      });

      // 8. Atomicity Flip (Redundant now but kept for legacy logic safety)
      await Promise.all([
        prisma.entity.updateMany({ 
          where: { packet_ids: { has: packetId }, processing_state: "pending" }, 
          data: { processing_state: "complete" } 
        }),
        prisma.relationship.updateMany({ 
          where: { packet_id: packetId, processing_state: "pending" }, 
          data: { processing_state: "complete" } 
        }),
        prisma.semanticObject.updateMany({ 
          where: { packet_id: packetId, processing_state: "pending" }, 
          data: { processing_state: "complete" } 
        }),
        prisma.topic.updateMany({
          where: { packet_ids: { has: packetId }, processing_state: "pending" },
          data: { processing_state: "complete" }
        })
      ]);

      return { success: true, entityCount: processedEntities.length, fallback: isFallback };
    } catch (error: any) {
      console.error('[SemanticEngine] Failure:', error);
      throw error;
    } finally {
      await this.releaseLock(packetId);
    }
  }

  /**
   * Rule-Based Fallback Extraction (No LLM)
   */
  private static runFallbackExtraction(content: string) {
    const entities: any[] = [];
    const intents: any[] = [];

    const intentMap: Record<string, string[]> = {
      working_on: ['building', 'coding', 'implementing', 'working on', 'drafting', 'writing'],
      learning: ['learning', 'studying', 'reading up', 'exploring'],
      planning: ['planning', 'scheduling', 'todo', 'setup'],
      communicating: ['email', 'sent', 'replied', 'messaged'],
    };

    const lowercaseContent = content.toLowerCase();
    for (const [intent, keywords] of Object.entries(intentMap)) {
      if (keywords.some(kw => lowercaseContent.includes(kw))) {
        intents.push({ intent, confidence: 0.65 });
      }
    }

    const capsRegex = /\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)*)\b/g;
    const matches = content.match(capsRegex) || [];
    
    const stopwords = ['The', 'And', 'But', 'If', 'This', 'That', 'With', 'From', 'Each'];
    const uniqueMatches = Array.from(new Set(matches)).filter(m => !stopwords.includes(m) && m.length > 2);

    uniqueMatches.slice(0, ENTITY_LIMIT).forEach(name => {
      entities.push({ name, type: 'concept', confidence: 0.6 });
    });

    return { entities, intents, topics: [], relationships: [] };
  }

  /**
   * Hybrid Normalization: Exact -> Alias -> Fuzzy
   */
  private static async normalizeEntity(
    name: string, 
    type: string, 
    confidence: number, 
    packetId: string, 
    status: string = 'verified',
    testRunId: string = 'PROD',
    processingState: string = 'complete'
  ) {
    const normalized = name.toLowerCase().trim();
    const dedupHash = this.generateHash(`${normalized}_${type}_${testRunId}`);

    // 1. Dedup Hash Match (Exact)
    let entity = await prisma.entity.findFirst({ 
      where: { 
        dedup_hash: dedupHash
      } 
    });

    if (entity) {
      const updated = await prisma.entity.update({
        where: { id: entity.id },
        data: { 
          occurrences: { increment: 1 }, 
          last_seen: new Date(),
          packet_ids: entity.packet_ids.includes(packetId) ? undefined : { push: packetId }
        }
      });
      
      // If found verified match for unverified, trigger reconciliation
      if (status === 'verified' && updated.verification_status === 'unverified') {
        await this.reconcileEntities(updated.id, testRunId); 
      }
      return updated;
    }

    // 2. Alias Match
    const aliasMatch = await prisma.entityAlias.findFirst({ 
      where: { 
        alias: normalized, 
        test_run_id: testRunId 
      },
      include: { entity: true } 
    });

    if (aliasMatch) {
      return await prisma.entity.update({
        where: { id: aliasMatch.entity_id },
        data: { 
          occurrences: { increment: 1 }, 
          last_seen: new Date(),
          packet_ids: { push: packetId }
        }
      });
    }

    // 3. Simple Fuzzy/Heuristic (ONLY if verified)
    if (confidence >= MERGE_THRESHOLD && status === 'verified') {
      const partialMatch = await prisma.entity.findFirst({
        where: {
          type,
          test_run_id: testRunId,
          normalized_name: { contains: normalized }
        }
      });
      if (partialMatch) {
        await prisma.entityAlias.create({
          data: {
            entity_id: partialMatch.id,
            alias: normalized,
            confidence: confidence,
            test_run_id: testRunId
          }
        });
        return partialMatch;
      }
    }

    // 4. Create New Entity
    try {
      const newEntity = await prisma.entity.create({
        data: {
          name: normalized,
          normalized_name: normalized,
          type,
          confidence,
          verification_status: status,
          source_type: status === 'unverified' ? 'fallback' : 'llm',
          processing_state: processingState,
          dedup_hash: dedupHash,
          packet_ids: [packetId],
          occurrences: 1,
          test_run_id: testRunId
        }
      });

      // TRIGGER RECONCILIATION if new verified entity might match old unverified ones
      if (status === 'verified') {
        await this.reconcileEntities(newEntity.id, testRunId);
      }

      return newEntity;
    } catch (err: any) {
      if (!isUniqueError(err)) throw err;
      
      // COLLISION: Another worker beat us. Fetch and update.
      console.log(`[SemanticEngine] Entity collision handled for ${dedupHash}`);
      return await prisma.entity.update({
        where: { dedup_hash_test_run_id: { dedup_hash: dedupHash, test_run_id: testRunId } },
        data: {
          occurrences: { increment: 1 },
          last_seen: new Date(),
          packet_ids: { push: packetId }
        }
      });
    }
  }

  /**
   * RECONCILIATION SYSTEM: Upgrade unverified -> verified via fuzzy/alias match
   * Also promotes PendingEdge to Relationship
   */
  static async reconcileEntities(verifiedId: string, testRunId: string = 'PROD') {
    const lockKey = `${verifiedId}_${testRunId}`;
    while (this.reconciliationLocks.has(lockKey)) {
      await this.reconciliationLocks.get(lockKey);
    }

    let resolveLock: () => void;
    const lockPromise = new Promise<void>((resolve) => {
      resolveLock = resolve;
    });
    this.reconciliationLocks.set(lockKey, lockPromise);

    try {
      const verified = await prisma.entity.findUnique({ 
        where: { id: verifiedId },
        include: { aliases: true }
      });
      if (!verified || verified.verification_status !== 'verified') return;

      // A. Entity Merging Logic
      const candidates = await prisma.entity.findMany({
        where: {
          type: verified.type,
          verification_status: 'unverified',
          test_run_id: testRunId
        }
      });

      for (const unverified of candidates) {
        // IDEMPOTENCY: Same type mandatory (enforced by candidate query)
        const similarity = this.calculateSimilarity(verified.name, unverified.name);
        
        if (similarity >= RECONCILIATION_THRESHOLD) {
          console.log(`[Reconciliation] Merging unverified ${unverified.name} into verified ${verified.name}`);
          
          await prisma.entity.update({
            where: { id: verified.id },
            data: {
              packet_ids: { push: unverified.packet_ids },
              occurrences: { increment: unverified.occurrences }
            }
          });

          const existingAliasDedupHash = this.generateHash(`${unverified.name}_alias_${verified.id}_${testRunId}`);
          const existingAlias = await prisma.entityAlias.findFirst({
            where: { alias: unverified.name, test_run_id: testRunId }
          });

          if (!existingAlias) {
            await prisma.entityAlias.create({
              data: {
                entity_id: verified.id,
                alias: unverified.name,
                confidence: 0.85,
                test_run_id: testRunId
              }
            });
          }
          await prisma.entity.delete({ where: { id: unverified.id } });

          // Deterministic Promotion
          await this.promotePendingEdges(verified.id, testRunId);
        }
      }
    } finally {
      this.reconciliationLocks.delete(lockKey);
      resolveLock!();
    }
  }

  /**
   * Promotes PendingEdges to Relationships if both sides are verified.
   * Deterministic and Idempotent.
   */
  static async promotePendingEdges(entityId: string, testRunId: string = 'PROD') {
    const entity = await prisma.entity.findUnique({ 
      where: { id: entityId },
      include: { aliases: true }
    });
    if (!entity || entity.verification_status !== 'verified') return;

    const validNames = [entity.name, entity.normalized_name, ...entity.aliases.map(a => a.alias)];
    
    const relevantEdges = await prisma.pendingEdge.findMany({
      where: {
        test_run_id: testRunId,
        OR: [
          { from_name: { in: validNames } },
          { to_name: { in: validNames } }
        ]
      }
    });

    for (const edge of relevantEdges) {
      const fromIsSelf = validNames.includes(edge.from_name);
      const otherSideName = fromIsSelf ? edge.to_name : edge.from_name;
      
      const otherSide = await prisma.entity.findFirst({
        where: {
          test_run_id: testRunId,
          verification_status: 'verified',
          OR: [
            { name: otherSideName },
            { normalized_name: otherSideName },
            { aliases: { some: { alias: otherSideName } } }
          ]
        }
      });

      if (otherSide) {
        const fromId = fromIsSelf ? entity.id : otherSide.id;
        const toId = fromIsSelf ? otherSide.id : entity.id;
        const relDedupHash = this.generateHash(`${fromId}_${toId}_${edge.type}_${testRunId}`);

        const existing = await prisma.relationship.findFirst({
          where: { dedup_hash: relDedupHash }
        });

        if (!existing) {
          try {
            await prisma.relationship.create({
              data: {
                from_entity_id: fromId,
                to_entity_id: toId,
                type: edge.type,
                weight: edge.weight,
                packet_id: edge.packet_id,
                test_run_id: testRunId,
                dedup_hash: relDedupHash,
                processing_state: "complete"
              }
            });
          } catch (err: any) {
            if (!isUniqueError(err)) throw err;
            console.log(`[SemanticEngine] Promotion collision handled for ${relDedupHash}`);
          }
        }
        await prisma.pendingEdge.delete({ where: { id: edge.id } });
      }
    }
  }

  private static calculateSimilarity(s1: string, s2: string): number {
    if (s1 === s2) return 1.0;
    const longer = s1.length > s2.length ? s1 : s2;
    const shorter = s1.length > s2.length ? s2 : s1;
    if (longer.length === 0) return 1.0;
    return (longer.length - this.editDistance(longer, shorter)) / longer.length;
  }

  private static editDistance(s1: string, s2: string): number {
    s1 = s1.toLowerCase();
    s2 = s2.toLowerCase();
    const costs = new Array();
    for (let i = 0; i <= s1.length; i++) {
      let lastValue = i;
      for (let j = 0; j <= s2.length; j++) {
        if (i == 0) costs[j] = j;
        else {
          if (j > 0) {
            let newValue = costs[j - 1];
            if (s1.charAt(i - 1) != s2.charAt(j - 1))
              newValue = Math.min(Math.min(newValue, lastValue), costs[j]) + 1;
            costs[j - 1] = lastValue;
            lastValue = newValue;
          }
        }
      }
      if (i > 0) costs[s2.length] = lastValue;
    }
    return costs[s2.length];
  }

  private static reconcile(oldId: string, newId: string, testRunId: string) {
    // Basic redirect for direct exact matches found during normalization
  }
}
