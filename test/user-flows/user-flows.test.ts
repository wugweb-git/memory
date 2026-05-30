import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { UI_API } from '../../src/lib/api/endpoints.ts';

/**
 * User-flow contract tests: verify each primary journey targets a known endpoint.
 * These do not hit the network; they document and guard routing contracts.
 */
const USER_FLOWS = [
  { name: 'auth session', path: UI_API.authMe, method: 'GET' },
  { name: 'RAG chat', path: UI_API.chat, method: 'POST' },
  { name: 'file upload', path: UI_API.upload, method: 'POST' },
  { name: 'memory stats', path: UI_API.memoryStats, method: 'GET' },
  { name: 'memory monitor', path: UI_API.memoryMonitor, method: 'GET' },
  { name: 'blob list', path: UI_API.blobList, method: 'GET' },
  { name: 'cognitive decide', path: UI_API.cognitiveDecide, method: 'POST' },
  { name: 'persona profile', path: UI_API.personaProfile, method: 'GET' },
  { name: 'output generate', path: UI_API.outputGenerate, method: 'POST' },
  { name: 'system health', path: UI_API.healthSystem, method: 'GET' },
] as const;

describe('primary user flows', () => {
  for (const flow of USER_FLOWS) {
    it(`${flow.name} → ${flow.method} ${flow.path}`, () => {
      assert.ok(flow.path.startsWith('/api/'));
    });
  }
});

