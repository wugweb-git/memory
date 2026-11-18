import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  chatRetrievalFilters,
  emptyContextText,
  parsePublicMarkInput,
  NO_PUBLIC_NOTES_MESSAGE,
} from '../../src/lib/memory/visibility.ts';
import { isPublicRoute } from '../../src/lib/security/route-access.ts';

const ROOT = join(import.meta.dirname, '../..');
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8');

describe('/ask retrieval limited to public memory', () => {
  it('visitors retrieve public only; the owner keeps everything', () => {
    assert.deepEqual(chatRetrievalFilters(false), { publicOnly: true });
    assert.deepEqual(chatRetrievalFilters(true), { publicOnly: false });
  });

  it('shows a clear "No public notes yet" message to visitors, not an error', () => {
    assert.match(emptyContextText(false), new RegExp(NO_PUBLIC_NOTES_MESSAGE));
    assert.doesNotMatch(emptyContextText(true), new RegExp(NO_PUBLIC_NOTES_MESSAGE));
  });

  it('chat route filters on admin status and keeps the OpenRouter routing', () => {
    const src = read('src/app/api/chat/route.ts');
    assert.match(src, /isAdminRequest\(req\)/);
    assert.match(src, /retrieve\(question, chatRetrievalFilters\(admin\)\)/);
    assert.match(src, /runJob\('ask'/);
  });

  it('retrieve filters by is_public with a constant parameterised fragment', () => {
    const src = read('src/lib/memory/rag.ts');
    assert.match(src, /filters\.publicOnly === true/);
    assert.match(src, /is_public = true/);
    // no string-concatenated SQL: only Prisma.sql tagged templates
    assert.doesNotMatch(src, /\$queryRawUnsafe|\$executeRawUnsafe/);
  });

  it('migration is additive: one column + index on memory_packets only', () => {
    const sql = read('prisma/postgres/migrations/20261119140000_memory_packets_is_public/migration.sql');
    const stmts = sql.replace(/--.*$/gm, '').split(';').map((s) => s.trim()).filter(Boolean);
    assert.equal(stmts.length, 2);
    assert.match(stmts[0], /ALTER TABLE "memory_packets" ADD COLUMN IF NOT EXISTS "is_public" BOOLEAN NOT NULL DEFAULT false/);
    assert.match(stmts[1], /CREATE INDEX IF NOT EXISTS .* ON "memory_packets"\("is_public"\)/);
    assert.doesNotMatch(stmts.join(';'), /DROP|TRUNCATE|DELETE/i);
    assert.match(read('prisma/postgres/schema.prisma'), /is_public\s+Boolean\s+@default\(false\)/);
  });

  it('owner mark-public input is validated', () => {
    assert.equal(parsePublicMarkInput({ ids: ['a'], isPublic: true }).ok, true);
    assert.equal(parsePublicMarkInput({ ids: [], isPublic: true }).ok, false);
    assert.equal(parsePublicMarkInput({ ids: ['a'], isPublic: 'true' }).ok, false);
    assert.equal(parsePublicMarkInput({ ids: [1], isPublic: true }).ok, false);
    assert.equal(parsePublicMarkInput(null).ok, false);
  });

  it('mark-public endpoint is admin-gated and not a public route; /ask and chat stay public', () => {
    assert.equal(isPublicRoute('/api/memory/public', 'POST'), false);
    assert.equal(isPublicRoute('/api/memory/public', 'GET'), false);
    assert.equal(isPublicRoute('/ask', 'GET'), true);
    assert.equal(isPublicRoute('/api/chat', 'POST'), true);
    const src = read('src/app/api/memory/public/route.ts');
    assert.equal((src.match(/requireAdmin\(/g) ?? []).length, 2);
  });
});
