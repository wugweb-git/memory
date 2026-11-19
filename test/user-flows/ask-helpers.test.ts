import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createTimestampStore,
  isNearBottom,
  enterKeyAction,
  clampTextareaHeight,
  answerNotice,
} from '../../src/lib/chat/ask-helpers';

test('timestamp store keeps the first time for an id', () => {
  let t = 1000;
  const store = createTimestampStore(() => t);
  assert.equal(store.stamp('a'), 1000);
  t = 5000;
  assert.equal(store.stamp('a'), 1000);
  assert.equal(store.stamp('b'), 5000);
  assert.equal(store.size(), 2);
  store.clear();
  assert.equal(store.size(), 0);
});

test('isNearBottom respects the threshold', () => {
  assert.equal(isNearBottom({ scrollTop: 920, scrollHeight: 1000, clientHeight: 80 }), true);
  assert.equal(isNearBottom({ scrollTop: 0, scrollHeight: 1000, clientHeight: 500 }), false);
  assert.equal(isNearBottom({ scrollTop: 400, scrollHeight: 1000, clientHeight: 500 }, 100), true);
});

test('enter key: send on desktop, newline on touch, shift or IME', () => {
  const base = { key: 'Enter', shiftKey: false, isComposing: false, coarsePointer: false };
  assert.equal(enterKeyAction(base), 'send');
  assert.equal(enterKeyAction({ ...base, coarsePointer: true }), 'newline');
  assert.equal(enterKeyAction({ ...base, shiftKey: true }), 'newline');
  assert.equal(enterKeyAction({ ...base, isComposing: true }), 'newline');
  assert.equal(enterKeyAction({ ...base, key: 'a' }), 'newline');
});

test('textarea height caps at four lines', () => {
  assert.equal(clampTextareaHeight(30, 24, 4, 16), 30);
  assert.equal(clampTextareaHeight(400, 24, 4, 16), 112);
});

test('answerNotice: user stop is neutral, real failure is an error', () => {
  assert.equal(answerNotice({ hasError: true, userStopped: true, isLoading: false }), 'stopped');
  assert.equal(answerNotice({ hasError: true, userStopped: false, isLoading: false }), 'error');
  assert.equal(answerNotice({ hasError: false, userStopped: true, isLoading: false }), 'stopped');
  assert.equal(answerNotice({ hasError: false, userStopped: false, isLoading: false }), 'none');
  assert.equal(answerNotice({ hasError: true, userStopped: true, isLoading: true }), 'none');
});
