import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';

process.env.brain_POSTGRES_PRISMA_URL ||= 'postgresql://u:p@127.0.0.1:1/none?connect_timeout=1';

import { isSchedulablePlatform } from '../../src/lib/publishing/allowlist';
import { OUTPUT_PLATFORMS } from '../../src/config/ui-content';
import { routeDistribution } from '../../src/lib/distribution/router';
import { publishToPlatform } from '../../src/lib/publishing/platforms';
import { normalizeOutputPlatform } from '../../src/lib/output/generator';
import { isRetryableDelivery, queueOutcomeFor, buildDeliveryRecord } from '../../src/lib/publishing/delivery';
import { hasSpike, SPIKE_THRESHOLD } from '../../src/lib/cognitive/signal-trigger';
import { staleProcessingWhere } from '../../src/lib/queue/stale';
import { summarizeJobRuns } from '../../src/lib/health/jobs-last-run';
import { safeEqual } from '../../src/lib/security/safe-compare';
import { purgeBlobItems, getBlobStats, BLOB_DONE_RETENTION_DAYS } from '../../src/lib/blobLayer';

const realFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = realFetch;
  delete process.env.X_ACCESS_TOKEN;
});

test('schedule allow-list covers every Content page platform, manual platforms and internal targets', () => {
  for (const p of OUTPUT_PLATFORMS) assert.ok(isSchedulablePlatform(p.value), p.value);
  for (const p of ['substack', 'behance', 'dribbble', 'cms', 'email-digest', 'export-api', 'x', 'facebook']) assert.ok(isSchedulablePlatform(p), p);
  assert.equal(isSchedulablePlatform('instagram'), false);
  assert.equal(isSchedulablePlatform('nope'), false);
  assert.equal(isSchedulablePlatform(5), false);
});

test('x and facebook are offered, normalised and routable; instagram is not offered', () => {
  const values = OUTPUT_PLATFORMS.map((p) => p.value as string);
  assert.ok(values.includes('x') && values.includes('facebook'));
  assert.ok(!values.includes('instagram'));
  assert.equal(normalizeOutputPlatform('X'), 'x');
  assert.equal(normalizeOutputPlatform('facebook'), 'facebook');
});

test('blog and memo route and record as internal, never an unsupported-platform error', async () => {
  for (const platform of ['blog', 'memo']) {
    const routed = routeDistribution({ platform, content: 'Hello world' });
    assert.equal(routed.platform, platform);
    const res = await publishToPlatform(platform, routed);
    assert.equal(res.status, 'internal');
    assert.equal(res.delivered, false);
  }
  assert.throws(() => routeDistribution({ platform: 'nope', content: 'x' }), /UNSUPPORTED_PLATFORM/);
});

test('only a failed or unconfigured, undelivered send is retryable', () => {
  assert.equal(isRetryableDelivery(null), false);
  assert.equal(isRetryableDelivery({ status: 'error', delivered: false }), true);
  assert.equal(isRetryableDelivery({ status: 'not_configured', delivered: false }), true);
  for (const status of ['published', 'internal', 'manual', 'posted_manually'] as const) {
    assert.equal(isRetryableDelivery({ status, delivered: status === 'published' }), false, status);
  }
  assert.equal(isRetryableDelivery({ status: 'error', delivered: true }), false);
});

test('queue outcome is honest: errors retry, missing credentials need setup, the rest are published', () => {
  assert.equal(queueOutcomeFor('published', { platform: 'x', status: 'error', error: 'HTTP_401' }).kind, 'retry');
  assert.equal(queueOutcomeFor('resent', { platform: 'x', status: 'not_configured' }).kind, 'needs_setup');
  for (const status of ['published', 'internal', 'manual']) {
    assert.equal(queueOutcomeFor('published', { platform: 'x', status }).kind, 'published', status);
  }
  const dup = queueOutcomeFor('duplicate', undefined);
  assert.equal(dup.kind, 'published');
});

type Row = { id: string; publishedContent: any };

/** Replaces the prisma delegates the publish path touches with an in-memory fake. */
function installFakeDb(initial: Row | null, output = { id: 'o1', userId: 'u', platform: 'x', content: 'Hello there', decisionId: null }) {
  return import('../../src/lib/db/postgres').then(({ postgres }) => {
    const state = { row: initial, outputStatus: 'draft', profilePublishes: 0, fetches: 0 };
    const fake: any = {
      outputLog: {
        findUnique: async () => output,
        update: async ({ data }: any) => { state.outputStatus = data.status; return output; },
      },
      publishedOutput: {
        findFirst: async () => state.row,
        update: async ({ data }: any) => { state.row = { ...(state.row as Row), publishedContent: data.publishedContent }; return state.row; },
      },
    };
    for (const k of Object.keys(fake)) Object.defineProperty(postgres, k, { value: fake[k], configurable: true, writable: true });
    return state;
  });
}

test('a failed external send is re-sent once the credential works, without republishing the profile or duplicating a delivered post', async () => {
  process.env.X_ACCESS_TOKEN = 'tok';
  const failed = buildDeliveryRecord({ platform: 'x', status: 'error', delivered: false, externalId: null, error: 'HTTP_500' });
  const state = await installFakeDb({ id: 'p1', publishedContent: { delivery: failed } });
  let posts = 0;
  globalThis.fetch = (async () => { posts += 1; return new Response(JSON.stringify({ data: { id: 'tw1' } }), { status: 200 }); }) as any;

  const { publishOutput } = await import('../../src/lib/output/automation');
  const first = await publishOutput('o1');
  assert.equal(first.mode, 'resent');
  assert.equal(first.platformResult?.status, 'published');
  assert.equal(posts, 1);
  assert.equal((state.row as Row).publishedContent.delivery.delivered, true);
  assert.equal(state.outputStatus, 'pushed');

  // Now delivered: a further call is a duplicate and sends nothing.
  const second = await publishOutput('o1');
  assert.equal(second.mode, 'duplicate');
  assert.equal(posts, 1);
});

test('a still-failing resend leaves the output ready, not pushed', async () => {
  process.env.X_ACCESS_TOKEN = 'tok';
  const nc = buildDeliveryRecord({ platform: 'x', status: 'not_configured', delivered: false, externalId: null });
  const state = await installFakeDb({ id: 'p1', publishedContent: { delivery: nc } });
  globalThis.fetch = (async () => new Response('{}', { status: 500 })) as any;
  const { publishOutput } = await import('../../src/lib/output/automation');
  const r = await publishOutput('o1');
  assert.equal(r.mode, 'resent');
  assert.equal(r.platformResult?.status, 'error');
  assert.equal(state.outputStatus, 'ready');
  assert.equal((state.row as Row).publishedContent.delivery.status, 'error');
});

test('spike threshold is inclusive so the 0.9 intensity cap can fire', () => {
  assert.equal(SPIKE_THRESHOLD, 0.9);
  assert.equal(hasSpike([{ intensity_absolute: 0.9 }]), true);
  assert.equal(hasSpike([{ intensity_absolute: 0.89 }]), false);
});

test('stale processing sweep keys off the claim time, not createdAt', () => {
  const cutoff = new Date('2026-01-01T00:10:00Z');
  const where = staleProcessingWhere(cutoff);
  assert.equal(where.status, 'processing');
  assert.deepEqual(where.OR[0], { scheduledAt: { lt: cutoff } });
  assert.deepEqual(where.OR[1], { scheduledAt: null, createdAt: { lt: cutoff } });
});

test('job last-run summary reports the newest run per job and an honest never-run state', () => {
  const rows = [
    { eventType: 'jobs:run', status: 'ok', createdAt: new Date('2026-01-01T03:00:00Z') },
    { eventType: 'jobs:run', status: 'error', createdAt: new Date('2026-01-02T03:00:00Z') },
  ];
  const out = summarizeJobRuns(rows);
  const run = out.find((j) => j.job === 'jobs:run')!;
  assert.equal(run.last_run_at, '2026-01-02T03:00:00.000Z');
  assert.equal(run.status, 'failed');
  const pipe = out.find((j) => j.job === 'jobs:process-memory')!;
  assert.equal(pipe.last_run_at, null);
  assert.equal(pipe.status, 'never');
});

test('safeEqual compares different-length and equal-length strings correctly', () => {
  assert.equal(safeEqual('abc', 'abc'), true);
  assert.equal(safeEqual('abc', 'abd'), false);
  assert.equal(safeEqual('abc', 'abcd'), false);
  assert.equal(safeEqual('', ''), true);
});

test('blob purge removes done and expired rows only; stats ignore expired rows', async () => {
  const now = new Date('2026-06-01T00:00:00Z');
  let where: any = null;
  const fake: any = {
    blobItem: {
      deleteMany: async (args: any) => { where = args.where; return { count: 3 }; },
      aggregate: async (args: any) => { where = args.where; return { _sum: { size: 10 }, _count: { id: 1 } }; },
    },
  };
  assert.equal(await purgeBlobItems(fake, now), 3);
  const done = where.OR.find((c: any) => c.state?.in);
  assert.deepEqual(done.state.in, ['promoted', 'rejected']);
  assert.equal(done.updated_at.lt.getTime(), now.getTime() - BLOB_DONE_RETENTION_DAYS * 86_400_000);
  assert.ok(where.OR.some((c: any) => c.state === 'expired'));

  await getBlobStats(fake);
  assert.deepEqual(where, { state: { not: 'expired' } });
});
