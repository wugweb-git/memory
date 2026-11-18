import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isModerationError, embedChunksTolerant } from '../../src/lib/memory/embeddings';

test('isModerationError flags 422 / content-safety wording only', () => {
  assert.equal(isModerationError('422 HTTP 422: input rejected by content safety screening'), true);
  assert.equal(isModerationError('content_safety block'), true);
  assert.equal(isModerationError('request was moderated'), true);
  assert.equal(isModerationError('429 Too Many Requests'), false);
  assert.equal(isModerationError('network timeout'), false);
  assert.equal(isModerationError(''), false);
});

function fakeEmbedder(opts: {
  batchThrows?: string;
  rejectChunks?: Set<number>;
  queryThrows?: string;
  dims?: number;
}) {
  const dims = opts.dims ?? 4;
  const vec = (seed: number) => Array.from({ length: dims }, (_, i) => seed + i / 10);
  return {
    async embedDocuments(texts: string[]) {
      if (opts.batchThrows) throw new Error(opts.batchThrows);
      return texts.map((_, i) => vec(i));
    },
    async embedQuery(text: string) {
      // chunk index is encoded as the number of leading '#' in the text
      const idx = text.length;
      if (opts.queryThrows) throw new Error(opts.queryThrows);
      if (opts.rejectChunks?.has(idx)) throw new Error('422 content safety screening');
      return vec(idx);
    },
  };
}

test('batch success returns all vectors in one call (fast path)', async () => {
  const out = await embedChunksTolerant(fakeEmbedder({}), ['a', 'bb', 'ccc']);
  assert.equal(out.length, 3);
  assert.ok(out.every((v) => Array.isArray(v)));
});

test('batch moderation salvages the chunks that pass', async () => {
  // chunk lengths 1,2,3 → index by length; reject the length-2 chunk
  const out = await embedChunksTolerant(
    fakeEmbedder({ batchThrows: '422 content safety screening', rejectChunks: new Set([2]) }),
    ['a', 'bb', 'ccc'],
  );
  assert.equal(out.length, 3);
  assert.ok(Array.isArray(out[0]));
  assert.equal(out[1], null); // the rejected chunk is null, not dropped from the array
  assert.ok(Array.isArray(out[2]));
});

test('every chunk moderated → CONTENT_MODERATED', async () => {
  await assert.rejects(
    embedChunksTolerant(
      fakeEmbedder({ batchThrows: '422 content safety screening', rejectChunks: new Set([1, 2, 3]) }),
      ['a', 'bb', 'ccc'],
    ),
    /CONTENT_MODERATED/,
  );
});

test('non-moderation batch error is LLM_UNAVAILABLE, no per-chunk retries', async () => {
  let queryCalls = 0;
  const embedder = {
    async embedDocuments() {
      throw new Error('429 Too Many Requests');
    },
    async embedQuery() {
      queryCalls += 1;
      return [0];
    },
  };
  await assert.rejects(embedChunksTolerant(embedder, ['a', 'bb']), /LLM_UNAVAILABLE/);
  assert.equal(queryCalls, 0); // did not burn per-chunk requests on a rate limit
});

test('non-moderation error during salvage aborts as LLM_UNAVAILABLE', async () => {
  await assert.rejects(
    embedChunksTolerant(
      fakeEmbedder({ batchThrows: '422 content safety screening', queryThrows: '503 overloaded' }),
      ['a', 'bb'],
    ),
    /LLM_UNAVAILABLE/,
  );
});
