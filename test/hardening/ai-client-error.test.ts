import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readAiErrorBody } from '../../src/lib/ai/client-error';
import { aiErrorBody, describeAiError } from '../../src/lib/ai/error-messages';
import { parseAskError } from '../../src/lib/chat/useAskChat';

test('quota error is a calm limit with no retry, message shown as returned', () => {
  const info = describeAiError(new Error('429 free-models-per-day'))!;
  const out = readAiErrorBody(aiErrorBody(info), 'fallback');
  assert.equal(out.message, info.userMessage);
  assert.equal(out.limit, true);
  assert.equal(out.retryable, false);
});

test('a retryable AI failure keeps Retry', () => {
  const out = readAiErrorBody({ error: 'Busy.', message: 'Busy.', code: 'AI_RATE_LIMITED', retryable: true }, 'fallback');
  assert.equal(out.message, 'Busy.');
  assert.equal(out.limit, false);
  assert.equal(out.retryable, true);
});

test('a code-only error field never becomes the message; budget code is a limit', () => {
  const out = readAiErrorBody({ error: 'BUDGET_EXCEEDED', message: 'Daily ask budget used up.' }, 'fallback');
  assert.equal(out.message, 'Daily ask budget used up.');
  assert.equal(out.code, 'BUDGET_EXCEEDED');
  assert.equal(out.retryable, false);
  assert.equal(readAiErrorBody({ error: 'BUDGET_EXCEEDED' }, 'fallback').message, 'fallback');
});

test('unknown body falls back and stays retryable', () => {
  const out = readAiErrorBody(null, 'The search could not be completed.');
  assert.equal(out.message, 'The search could not be completed.');
  assert.equal(out.retryable, true);
});

test('ask error round trips code and retryability, plain text stays retryable', () => {
  const raw = 'ask-error:' + JSON.stringify({ message: 'Limit reached.', code: 'AI_QUOTA_EXHAUSTED', retryable: false });
  const out = parseAskError(raw);
  assert.equal(out.message, 'Limit reached.');
  assert.equal(out.retryable, false);
  assert.equal(out.limit, true);
  const plain = parseAskError('You are asking too fast. Wait a moment and try again.');
  assert.equal(plain.retryable, true);
  assert.equal(parseAskError(undefined).message, 'The answer could not be completed. Try again.');
});
