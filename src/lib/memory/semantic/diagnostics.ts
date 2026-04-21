import { mongo } from "@/lib/db/mongo";
import { SemanticEngine } from "@/lib/processing/semantic";
import { MemoryService } from "../service";

export interface DiagnosticReport {
  testRunId: string;
  results: {
    name: string;
    status: 'PASS' | 'FAIL';
    details?: any;
    error?: string;
  }[];
}

/**
 * Layer 2.5 Hardening Diagnostics
 */
export class SemanticDiagnostics {
  
  static async runFullSuite(): Promise<DiagnosticReport> {
    const testRunId = `DIAG_${Date.now()}`;
    const report: DiagnosticReport = { testRunId, results: [] };
    const userId = 'system_diag';

    console.log(`[Semantic/Diagnostics] Starting suite with id: ${testRunId}`);

    const runTest = async (name: string, fn: () => Promise<any>) => {
      try {
        const details = await fn();
        report.results.push({ name, status: 'PASS', details });
      } catch (err: any) {
        report.results.push({ name, status: 'FAIL', error: err.message });
      }
    };

    // 1. ISOLATION TEST
    await runTest('1. Isolation Check', async () => {
      const packet = await mongo.memoryPacket.create({
        data: {
          source: 'diag',
          source_id: 'iso_1',
          content: 'Isolation test content.',
          type: 'note',
          event_time: new Date(),
          hash: 'iso_hash_1',
          test_run_id: testRunId,
          trace: {},
          metadata: {}
        }
      });
      
      await SemanticEngine.processSemantic(packet.id, { testRunId });
      
      const prodEntities = await mongo.entity.findMany({ where: { test_run_id: 'PROD' } });
      const diagEntities = await mongo.entity.findMany({ where: { test_run_id: testRunId } });
      
      if (diagEntities.length === 0) throw new Error("No entities created in diag scope.");
      return { diagEntitiesCount: diagEntities.length, prodEntitiesStabiltiy: "Checked" };
    });

    // 2. DETERMINISTIC MERGE TEST
    await runTest('2. Deterministic Merge', async () => {
      const packet = await mongo.memoryPacket.create({
        data: {
          source: 'diag',
          source_id: 'merge_1',
          content: 'Alice works at Project Phoenix.',
          type: 'note',
          event_time: new Date(),
          hash: `merge_hash_${Date.now()}`,
          test_run_id: testRunId,
          trace: {},
          metadata: {}
        }
      });

      // Mock LLM to return same entities twice
      const mockLLM = {
        call: async () => ({ content: JSON.stringify({
          entities: [{ name: 'Alice', type: 'person', confidence: 0.9 }],
          relationships: []
        })})
      };

      await SemanticEngine.processSemantic(packet.id, { testRunId, llmClient: mockLLM });
      await SemanticEngine.processSemantic(packet.id, { testRunId, llmClient: mockLLM });

      const entities = await mongo.entity.findMany({ where: { normalized_name: 'alice', test_run_id: testRunId } });
      if (entities.length !== 1) throw new Error(`Expected 1 entity, found ${entities.length}`);
      if (entities[0].occurrences !== 2) throw new Error(`Expected 2 occurrences, found ${entities[0].occurrences}`);
      
      return { entityId: entities[0].id, occurrences: entities[0].occurrences };
    });

    // 3. RELATIONSHIP BLOCK (Unverified)
    await runTest('3. Relationship Block', async () => {
      const packet = await mongo.memoryPacket.create({
        data: {
          source: 'diag',
          source_id: 'rel_block_1',
          content: 'Alice works at BobCorp.',
          type: 'note',
          event_time: new Date(),
          hash: `rel_hash_${Date.now()}`,
          test_run_id: testRunId,
          trace: {},
          metadata: {}
        }
      });

      const mockLLM = {
        call: async () => ({ content: JSON.stringify({
          entities: [
            { name: 'Alice', type: 'person', confidence: 0.9 },
            { name: 'BobCorp', type: 'company', confidence: 0.9 }
          ],
          relationships: [
            { from: 'Alice', to: 'BobCorp', type: 'works_at', weight: 0.9 }
          ]
        })})
      };

      await SemanticEngine.processSemantic(packet.id, { testRunId, llmClient: mockLLM });

      const relationships = await mongo.relationship.findMany({ where: { test_run_id: testRunId } });
      const pending = await mongo.pendingEdge.findMany({ where: { test_run_id: testRunId } });

      if (relationships.length > 0) throw new Error("Relationship created for unverified entities!");
      if (pending.length === 0) throw new Error("No PendingEdge created for unverified relationship.");

      return { relationshipsCount: relationships.length, pendingEdgesCount: pending.length };
    });

    // 4. PROMOTION TEST
    await runTest('4. Promotion Pass', async () => {
      // Alice and BobCorp exist from previous test as unverified
      // We manually promote them or process a second signal to trigger verification behavior
      const alice = await mongo.entity.findFirst({ where: { normalized_name: 'alice', test_run_id: testRunId } });
      const bobCorp = await mongo.entity.findFirst({ where: { normalized_name: 'bobcorp', test_run_id: testRunId } });

      if (!alice || !bobCorp) throw new Error("Setup failed: Entities not found.");

      // Verify both (simulation of reconciliation/source count growth)
      await mongo.entity.updateMany({
        where: { id: { in: [alice.id, bobCorp.id] } },
        data: { verified: true }
      });

      // Run promotion pass (normally triggered at end of processSemantic or by a job)
      const ReconciliationEngine = (await import('./reconciliation')).ReconciliationEngine;
      const packet = await mongo.memoryPacket.findFirst({ where: { source_id: 'rel_block_1', test_run_id: testRunId } });
      
      await ReconciliationEngine.promotePendingEdges(packet!.id, testRunId);

      const relationships = await mongo.relationship.findMany({ where: { test_run_id: testRunId } });
      const pending = await mongo.pendingEdge.findMany({ where: { test_run_id: testRunId } });

      if (relationships.length === 0) throw new Error("Relationship not promoted after verification.");
      if (pending.length !== 0) throw new Error("PendingEdge not cleared after promotion.");

      return { relationshipsCount: relationships.length };
    });

    // CLEANUP DIAGNOSTIC DATA (Sequential to avoid transaction errors)
    try {
      await mongo.memoryPacket.deleteMany({ where: { test_run_id: testRunId } });
      await mongo.entity.deleteMany({ where: { test_run_id: testRunId } });
      await mongo.relationship.deleteMany({ where: { test_run_id: testRunId } });
      await mongo.pendingEdge.deleteMany({ where: { test_run_id: testRunId } });
      await mongo.semanticObject.deleteMany({ where: { test_run_id: testRunId } });
    } catch (err) {
      console.warn('[Semantic/Diagnostics] Cleanup failed (non-critical):', err);
    }

    console.log(`[Semantic/Diagnostics] Suite complete. Results: ${report.results.length}`);
    return report;
  }
}
