import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parsePagination,
  pageRangeLabel,
  hasPrevPage,
  hasNextPage,
  LIST_ORDER_BY,
} from '../../src/lib/memory/list-pagination';

const sp = (q: string) => new URLSearchParams(q);

test('parsePagination defaults', () => {
  assert.deepEqual(parsePagination(sp('')), { limit: 10, offset: 0 });
});

test('parsePagination clamps and sanitises', () => {
  assert.deepEqual(parsePagination(sp('limit=500&offset=999999999')), { limit: 200, offset: 100000 });
  assert.deepEqual(parsePagination(sp('limit=0&offset=-5')), { limit: 10, offset: 0 });
  assert.deepEqual(parsePagination(sp('limit=abc&offset=1.5x')), { limit: 10, offset: 0 });
  assert.deepEqual(parsePagination(sp('limit=25&offset=40')), { limit: 25, offset: 40 });
});

test('stable order has id tiebreaker', () => {
  assert.deepEqual(LIST_ORDER_BY, [{ ingestion_time: 'desc' }, { id: 'desc' }]);
});

test('pageRangeLabel: first, middle, last partial, empty', () => {
  assert.equal(pageRangeLabel(0, 10, 134), 'Showing 1 to 10 of 134');
  assert.equal(pageRangeLabel(10, 10, 134), 'Showing 11 to 20 of 134');
  assert.equal(pageRangeLabel(130, 4, 134), 'Showing 131 to 134 of 134');
  assert.equal(pageRangeLabel(0, 0, 0), 'No packets to show');
});

test('prev/next availability', () => {
  assert.equal(hasPrevPage(0), false);
  assert.equal(hasPrevPage(10), true);
  assert.equal(hasNextPage(0, 10, 134), true);
  assert.equal(hasNextPage(130, 4, 134), false);
  assert.equal(hasNextPage(0, 0, 0), false);
});
