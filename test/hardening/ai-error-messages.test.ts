import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeAiError, aiErrorResponse, AI_QUOTA_MESSAGE } from '../../src/lib/ai/error-messages';
import { JobFailedError } from '../../src/lib/ai/openrouter';

const LEAKY = 'https://openrouter.ai/api/v1/chat/completions sk-or-v1-abcdef123 free-models-per-day';

test('free-models-per-day 429 maps to AI_QUOTA_EXHAUSTED with the fixed message', () => {
  const info = describeAiError(new Error(`LLM_FAILURE: 429 Rate limit exceeded: ${LEAKY}`))!;
  assert.equal(info.code, 'AI_QUOTA_EXHAUSTED');
  assert.equal(info.status, 429);
  assert.equal(info.userMessage, 'The daily free AI limit is reached. Try again after it resets.');
  assert.equal(info.userMessage, AI_QUOTA_MESSAGE);
  assert.equal(info.retryable, false);
});

test('no credits remaining maps to quota exhausted', () => {
  assert.equal(describeAiError(new Error('402 No credits remaining on this account'))!.code, 'AI_QUOTA_EXHAUSTED');
});

test('RateLimitCapacityError is a retryable rate limit', () => {
  const err = Object.assign(new Error('capacity'), { name: 'RateLimitCapacityError' });
  const info = describeAiError(err)!;
  assert.equal(info.code, 'AI_RATE_LIMITED');
  assert.equal(info.status, 429);
  assert.equal(info.retryable, true);
});

test('AI_RetryError unwraps its last error', () => {
  const inner = new Error('429 free-models-per-day');
  const retry = Object.assign(new Error('Failed after 3 attempts.'), { name: 'AI_RetryError', lastError: inner });
  assert.equal(describeAiError(retry)!.code, 'AI_QUOTA_EXHAUSTED');
  const plain = Object.assign(new Error('Failed after 3 attempts.'), { name: 'AI_RetryError' });
  assert.equal(describeAiError(plain)!.code, 'AI_FAILED');
});

test('job failures use the attempt reasons', () => {
  const quota = new JobFailedError('decision', [{ model: 'm1', ms: 1, ok: false, status: 429, reason: 'quota_exhausted' }]);
  assert.equal(describeAiError(new Error(`LLM_FAILURE: ${quota.message}`))!.code, 'AI_QUOTA_EXHAUSTED');
  const rate = new JobFailedError('decision', [{ model: 'm1', ms: 1, ok: false, status: 429, reason: 'rate_limited' }]);
  assert.equal(describeAiError(rate)!.code, 'AI_RATE_LIMITED');
  const net = new JobFailedError('decision', [{ model: 'm1', ms: 1, ok: false, reason: 'network' }]);
  assert.equal(describeAiError(net)!.code, 'AI_UNAVAILABLE');
});

test('network failures map to AI_UNAVAILABLE 503', () => {
  const info = describeAiError(new Error('LLM_FAILURE: fetch failed ECONNRESET'))!;
  assert.equal(info.code, 'AI_UNAVAILABLE');
  assert.equal(info.status, 503);
  assert.equal(info.retryable, true);
});

test('unrelated errors are not classified as AI errors', () => {
  assert.equal(describeAiError(new Error('Prisma: unique constraint failed')), null);
  assert.equal(describeAiError(new Error('Connection timeout to database')), null);
  assert.equal(describeAiError(undefined), null);
});

test('response never leaks provider URLs, keys or raw text', async () => {
  const res = aiErrorResponse(new Error(`LLM_FAILURE: 429 ${LEAKY}`))!;
  assert.equal(res.status, 429);
  const body = await res.json();
  assert.equal(body.code, 'AI_QUOTA_EXHAUSTED');
  assert.equal(body.error, AI_QUOTA_MESSAGE);
  const text = JSON.stringify(body);
  assert.ok(!/openrouter|sk-or|https?:/i.test(text));
  assert.equal(aiErrorResponse(new Error('bug')), null);
});
