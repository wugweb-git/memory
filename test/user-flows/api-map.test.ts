import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { listApiEndpoints, UI_API } from '../../src/lib/api/endpoints.ts';

const ROOT = join(import.meta.dirname, '../../src/app/api');

function collectRouteFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      collectRouteFiles(full, acc);
    } else if (entry === 'route.ts') {
      acc.push(full);
    }
  }
  return acc;
}

function filePathToApiPath(file: string): string {
  const rel = file.replace(ROOT, '').replace(/\\/g, '/');
  const segments = rel
    .replace(/\/route\.ts$/, '')
    .split('/')
    .filter(Boolean)
    .map((s) => s);
  return `/api/${segments.join('/')}`;
}

describe('API endpoint map', () => {
  it('lists all documented endpoints with /api prefix', () => {
    const endpoints = listApiEndpoints();
    assert.ok(endpoints.length >= 60);
    for (const ep of endpoints) {
      assert.ok(ep.path.startsWith('/api/'), `bad path: ${ep.path}`);
      assert.ok(ep.methods.length > 0, `no methods: ${ep.path}`);
    }
  });

  it('every route.ts file is represented in the map', () => {
    const routeFiles = collectRouteFiles(ROOT);
    const mapped = new Set(listApiEndpoints().map((e) => e.path));
    const missing: string[] = [];
    for (const file of routeFiles) {
      const apiPath = filePathToApiPath(file);
      if (!mapped.has(apiPath)) {
        missing.push(apiPath);
      }
    }
    assert.deepEqual(
      missing,
      [],
      `Undocumented routes: ${missing.join(', ')}`,
    );
  });

  it('UI_API shortcuts resolve to mapped paths', () => {
    const mapped = new Set(listApiEndpoints().map((e) => e.path));
    for (const path of Object.values(UI_API)) {
      assert.ok(mapped.has(path), `UI_API path not in map: ${path}`);
    }
  });
});
