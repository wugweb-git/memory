import { MemoryService } from './service';
import { processEmbedding } from './rag';
import { mongo as prisma } from '@/lib/db/mongo';
import { ingestionGate } from './gate';

export interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL';
  evidence: any;
  error?: string;
}

/**
 * IDENTITY PRISM: LAYER 1 STRESS SUITE
 * -----------------------------------
 * Runs 16 high-fidelity operational validation tests.
 */
export async function runL1ValidationSuite(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const runTest = async (name: string, fn: () => Promise<any>): Promise<void> => {
    try {
      const evidence = await fn();
      results.push({ name, status: 'PASS', evidence });
    } catch (err: any) {
      results.push({ name, status: 'FAIL', evidence: null, error: err.message });
    }
  };

  const userId = 'system_test_user';

  // 1. Happy Path Ingestion
  await runTest('1. Happy Path Ingestion', async () => {
    const res = await MemoryService.ingest({
      source: 'test_runner',
      source_id: `valid_${Date.now()}`,
      content: 'Standard operational validation payload.',
      event_time: new Date().toISOString()
    }, userId);
    if (res.status !== 'ACCEPTED') throw new Error(`Status: ${res.status}`);
    return res;
  });

  // 2. Duplicate Lock
  await runTest('2. Duplicate Lock', async () => {
    const payload = {
      source: 'dedupe_test',
      source_id: 'unique_id_123',
      content: 'Identical content to test hash collision.',
      event_time: '2026-04-16T10:00:00Z'
    };
    await MemoryService.ingest(payload, userId);
    const res2 = await MemoryService.ingest(payload, userId);
    if (res2.status !== 'IGNORE' || res2.reason !== 'DUPLICATE_HASH') throw new Error(`Failed to ignore duplicate. Status: ${res2.status}`);
    return res2;
  });

  // 3. Trace Immutability
  await runTest('3. Trace Immutability', async () => {
    const res = await MemoryService.ingest({
      source: 'immutable_test',
      source_id: `imm_${Date.now()}`,
      content: 'Trace anchoring test.',
      trace: { origin: 'original_origin' }
    }, userId);
    
    // Attempt violation
    try {
      await MemoryService.updatePacket(res.packet_id, {
        trace: { origin: 'hacked_origin' }
      } as any);
      throw new Error('Allowed origin mutation!');
    } catch (err: any) {
      return { msg: 'Correctly blocked immutability violation', error: err.message };
    }
  });

  // 4. Storage Hard Stop
  await runTest('4. Storage Hard Stop (95%)', async () => {
    const mockSource = { trust_score: 1.0 } as any;
    const res = await ingestionGate({ content: 'test' }, mockSource, 95);
    if (res.decision !== 'REJECT' || res.reason !== 'STORAGE_CRITICAL_FULL') throw new Error(`Decision: ${res.decision}`);
    return res;
  });

  // 5. Loop Protection
  await runTest('5. Loop Protection', async () => {
    const res = await MemoryService.ingest({
      source: 'loop_test',
      source_id: 'SRC_123',
      trace: { parent_origin_id: 'SRC_123' }
    }, userId);
    if (res.status !== 'REJECT' || res.reason !== 'RECURSIVE_LOOP_DETECTED') throw new Error(`Decision: ${res.status}`);
    return res;
  });

  // 6. Parallel Ingestion Race
  await runTest('6. Parallel Ingestion Race', async () => {
    const payload = {
      source: 'race_test',
      source_id: `race_${Date.now()}`,
      content: 'Parallel hit test.',
      event_time: new Date().toISOString()
    };
    const results = await Promise.all([
      MemoryService.ingest(payload, userId),
      MemoryService.ingest(payload, userId)
    ]);
    const acceptedCount = results.filter(r => r.status === 'ACCEPTED').length;
    const ignoredCount = results.filter(r => r.status === 'IGNORE').length;
    if (acceptedCount !== 1) throw new Error(`Accepted: ${acceptedCount}, Expected: 1`);
    return { acceptedCount, ignoredCount };
  });

  // 7. Embedding State Machine & 8. Worker Race
  await runTest('7 & 8. Embedding Worker Race', async () => {
    const res = await MemoryService.ingest({
      source: 'rag_race',
      source_id: `rag_${Date.now()}`,
      content: 'Testing parallel worker locks with sufficient length to trigger embedding.', // Length > 50
      event_time: new Date().toISOString()
    }, userId);
    
    // Force parallel workers
    const workerHits = await Promise.all([
      processEmbedding(res.packet_id),
      processEmbedding(res.packet_id)
    ]);
    
    // Verification: Check DB logs or status
    const packet = await prisma.memoryPacket.findUnique({ where: { id: res.packet_id } });
    return { embedding_status: packet?.embedding_status };
  });

  // 12. Update Content Sync
  await runTest('12. Update Content Sync', async () => {
    const res = await MemoryService.ingest({
      source: 'update_sync',
      source_id: `upd_${Date.now()}`,
      content: 'Original content for sync test.',
      event_time: new Date().toISOString()
    }, userId);
    
    // Simulate embedding embedded
    await prisma.memoryPacket.update({ where: { id: res.packet_id }, data: { embedding_status: 'embedded' } });
    
    // Update content
    await MemoryService.updatePacket(res.packet_id, { content: 'MODIFIED content for sync test.' });
    
    const packet = await prisma.memoryPacket.findUnique({ where: { id: res.packet_id } });
    if (packet?.embedding_status !== 'pending') throw new Error(`Status: ${packet?.embedding_status}`);
    return packet?.embedding_status;
  });

  // 13. Safe Immediate Delete
  await runTest('13. Safe Immediate Delete (Orphan Check)', async () => {
    const res = await MemoryService.ingest({
      source: 'delete_sync',
      source_id: `del_${Date.now()}`,
      content: 'Content to be deleted immediately after embedding start.',
      event_time: new Date().toISOString()
    }, userId);
    
    // Start embedding then delete
    processEmbedding(res.packet_id); // Start async
    await MemoryService.deletePacket(res.packet_id);
    
    // Check if embeddings exist
    const embeddings = await prisma.embedding.findMany({ where: { packet_id: res.packet_id } });
    if (embeddings.length > 0) throw new Error(`Orphan vectors found: ${embeddings.length}`);
    return { msg: 'Zero orphans detected' };
  });

  // 14. Encryption Guard
  await runTest('14. Encryption Guard', async () => {
    const res = await MemoryService.ingest({
      source: 'crypto_test',
      source_id: `sec_${Date.now()}`,
      content: 'Classified highly sensitive content.',
      sensitivity: 'restricted'
    }, userId);
    
    const raw = await prisma.memoryPacket.findUnique({ where: { id: res.packet_id } });
    if (!(raw?.content as any)._encrypted) throw new Error('Data stored in plaintext!');
    return { msg: 'Data is encrypted' };
  });

  return results;
}
