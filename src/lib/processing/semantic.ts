import { SettingsController } from '../memory/settings';

const prisma = new PrismaClient();

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
  static async processSemantic(packetId: string): Promise<{ success: boolean; entityCount: number; fallback: boolean }> {
    try {
      // 0. Feature Flag Check (DB-level Singleton)
      const config = await SettingsController.getSettings();
      if (!config.semantic_enabled) {
        return { success: false, entityCount: 0, fallback: false };
      }

      // 1. Fetch Packet and Signals (L1 + L2)
      const packet = await prisma.memoryPacket.findUnique({ where: { id: packetId } });
      const signals = await prisma.signal.findMany({ where: { packet_id: packetId } });

      if (!packet) return { success: false, entityCount: 0, fallback: false };

      // 2. Strict Idempotency: Clear previous semantic objects and relationships for this packet
      await Promise.all([
        prisma.semanticObject.deleteMany({ where: { packet_id: packetId } }),
        prisma.relationship.deleteMany({ where: { packet_id: packetId } }),
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

        const response = await model.call([
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
      const processedEntities = [];
      for (const rawEntity of (data.entities || []).slice(0, ENTITY_LIMIT)) {
        if (rawEntity.confidence < CONFIDENCE_THRESHOLD && !isFallback) continue;

        const entity = await this.normalizeEntity(
          rawEntity.name, 
          rawEntity.type, 
          rawEntity.confidence,
          packetId,
          isFallback ? 'unverified' : 'verified'
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
      const processedTopics = [];
      if (!isFallback) {
        for (const rawTopic of (data.topics || []).slice(0, TOPIC_LIMIT)) {
          if (rawTopic.confidence < CONFIDENCE_THRESHOLD) continue;
          
          const topic = await prisma.topic.upsert({
            where: { name: rawTopic.name.toLowerCase() },
            update: {
              strength: { increment: 0.1 },
              packet_ids: { push: packetId },
              last_updated: new Date()
            },
            create: {
              name: rawTopic.name.toLowerCase(),
              strength: rawTopic.confidence,
              packet_ids: [packetId]
            }
          });
          processedTopics.push({ topic: topic.name, confidence: rawTopic.confidence });
        }
      }

      // 6. Store Relationships (STRICT: Both sides must be verified)
      if (!isFallback) {
        for (const rel of (data.relationships || []).slice(0, RELATIONSHIP_LIMIT)) {
          const fromEnt = processedEntities.find(e => e.name.toLowerCase() === rel.from.toLowerCase());
          const toEnt = processedEntities.find(e => e.name.toLowerCase() === rel.to.toLowerCase());

          if (fromEnt && toEnt && fromEnt.verification_status === 'verified' && toEnt.verification_status === 'verified') {
            await prisma.relationship.create({
              data: {
                from_entity_id: fromEnt.entity_id,
                to_entity_id: toEnt.entity_id,
                type: rel.type.toLowerCase().replace(' ', '_'),
                weight: rel.weight || 0.5,
                packet_id: packetId
              }
            });
          }
        }
      }

      // 7. Final Semantic Object
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
          confidence: isFallback ? 0.6 : (data.entities?.length > 0 ? data.entities[0].confidence : 1.0),
          verification_status: isFallback ? 'unverified' : 'verified',
          fallback: isFallback,
          model: isFallback ? 'rule-based' : 'gpt-4o-mini'
        }
      });

      return { success: true, entityCount: processedEntities.length, fallback: isFallback };
    } catch (error: any) {
      console.error('[SemanticEngine] Failure:', error);
      throw error;
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
    const uniqueMatches = [...new Set(matches)].filter(m => !stopwords.includes(m) && m.length > 2);

    uniqueMatches.slice(0, ENTITY_LIMIT).forEach(name => {
      entities.push({ name, type: 'concept', confidence: 0.6 });
    });

    return { entities, intents, topics: [], relationships: [] };
  }

  /**
   * Hybrid Normalization: Exact -> Alias -> Fuzzy
   */
  private static async normalizeEntity(name: string, type: string, confidence: number, packetId: string, status: string = 'verified') {
    const normalized = name.toLowerCase().trim();

    // 1. Exact Match
    let entity = await prisma.entity.findUnique({ where: { name: normalized } });
    if (entity) {
      const updated = await prisma.entity.update({
        where: { id: entity.id },
        data: { 
          occurrences: { increment: 1 }, 
          last_seen: new Date(),
          packet_ids: { push: packetId }
        }
      });
      
      // If found verified match for unverified, trigger reconciliation
      if (status === 'verified' && updated.verification_status === 'unverified') {
        await this.reconcile(entity.id, updated.id); // Placeholder for complex logic
      }
      return updated;
    }

    // 2. Alias Match
    const aliasMatch = await prisma.entityAlias.findUnique({ 
      where: { alias: normalized },
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
          name: { contains: normalized }
        }
      });
      if (partialMatch) {
        await prisma.entityAlias.create({
          data: {
            entity_id: partialMatch.id,
            alias: normalized,
            confidence: confidence
          }
        });
        return partialMatch;
      }
    }

    // 4. Create New Entity
    const newEntity = await prisma.entity.create({
      data: {
        name: normalized,
        normalized_name: normalized,
        type,
        confidence,
        verification_status: status,
        fallback: status === 'unverified',
        packet_ids: [packetId],
        occurrences: 1
      }
    });

    // TRIGGER RECONCILIATION if new verified entity might match old unverified ones
    if (status === 'verified') {
      await this.reconcileEntities(newEntity.id);
    }

    return newEntity;
  }

  /**
   * RECONCILIATION SYSTEM: Upgrade unverified -> verified via fuzzy/alias match
   */
  static async reconcileEntities(verifiedId: string) {
    const verified = await prisma.entity.findUnique({ where: { id: verifiedId } });
    if (!verified || verified.verification_status !== 'verified') return;

    // Scan for unverified entities of same type
    const candidates = await prisma.entity.findMany({
      where: {
        type: verified.type,
        verification_status: 'unverified'
      }
    });

    for (const unverified of candidates) {
      // Basic Jaro-Winkler or similarity check (placeholder representation)
      const similarity = this.calculateSimilarity(verified.name, unverified.name);
      
      if (similarity >= RECONCILIATION_THRESHOLD) {
        console.log(`[Reconciliation] Merging unverified ${unverified.name} into verified ${verified.name}`);
        
        await prisma.$transaction([
          // 1. Move packet references
          prisma.entity.update({
            where: { id: verified.id },
            data: {
              packet_ids: { push: unverified.packet_ids },
              occurrences: { increment: unverified.occurrences }
            }
          }),
          // 2. Add alias
          prisma.entityAlias.upsert({
            where: { alias: unverified.name },
            update: { entity_id: verified.id },
            create: {
              entity_id: verified.id,
              alias: unverified.name,
              confidence: 0.85
            }
          }),
          // 3. Delete unverified
          prisma.entity.delete({ where: { id: unverified.id } })
        ]);

        // Future hook: Retroactively scan packets for relationship discovery
        // await this.discoverRelationships(verified.id);
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

  private static reconcile(oldId: string, newId: string) {
    // Basic redirect for direct exact matches found during normalization
  }
}
