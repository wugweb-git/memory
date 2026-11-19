/** Journey (d): content generate -> edit -> publish (honest statuses) -> history delivery record, incl. manual platforms. */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

process.env.brain_POSTGRES_PRISMA_URL ||= 'postgresql://u:p@127.0.0.1:1/none?connect_timeout=1';
for (const k of ['MEDIUM_TOKEN', 'LINKEDIN_ACCESS_TOKEN', 'X_BEARER_TOKEN', 'FACEBOOK_PAGE_TOKEN', 'INSTAGRAM_ACCESS_TOKEN']) delete process.env[k];

import { routeDistribution } from '../../src/lib/distribution/router.ts';
import { publishToPlatform } from '../../src/lib/publishing/platforms.ts';
import { buildDeliveryRecord, describeDelivery, extractDelivery, deliveryTone } from '../../src/lib/publishing/delivery.ts';
import { confirmManualPost } from '../../src/lib/publishing/manual-confirm.ts';

/** In-memory stand-in for the published_outputs table. */
function table() {
  const rows = new Map<string, { id: string; publishedContent: unknown }>();
  return {
    rows,
    deps: {
      findPublished: async (outputId: string) => rows.get(outputId) ?? null,
      updatePublished: async (id: string, content: Record<string, unknown>) => {
        for (const r of rows.values()) if (r.id === id) r.publishedContent = content;
      },
    },
  };
}

async function publish(platform: string, content: string) {
  const routed = routeDistribution({ platform, content });
  const result = await publishToPlatform(platform, routed);
  return buildDeliveryRecord(result);
}

describe('content publish journey', () => {
  it('an edited draft is what gets routed: the final text, not the first generation', () => {
    const generated = '# Draft title\n\nfirst pass';
    const edited = generated.replace('first pass', 'final pass');
    const r = routeDistribution({ platform: 'substack', content: edited });
    assert.deepEqual(r.payload, { title: 'Draft title', content: 'final pass' });
  });

  it('an external platform without a token reports not-sent, never published', async () => {
    for (const p of ['linkedin', 'medium', 'x']) {
      const d = await publish(p, 'hello world');
      assert.equal(d.status, 'not_configured', p);
      assert.equal(d.delivered, false);
      assert.equal(d.externalId, null);
      assert.match(describeDelivery(d) ?? '', /^Not sent/);
      assert.notEqual(deliveryTone(d.status), 'success');
    }
  });

  it('manual platforms are prepared, not sent, and do not claim delivery', async () => {
    for (const p of ['substack', 'behance', 'dribbble']) {
      const d = await publish(p, '# T\n\nbody');
      assert.equal(d.status, 'manual', p);
      assert.equal(d.delivered, false);
      assert.equal(d.externalId, null);
    }
  });

  it('internal platforms hand off to the profile path without an external send', async () => {
    const r = await publishToPlatform('portfolio', routeDistribution({ platform: 'portfolio', content: 'x' }));
    assert.equal(r.status, 'internal');
    assert.equal(r.delivered, false);
  });

  it('history round trip: the delivery record survives publishedContent and is read back', async () => {
    const d = await publish('substack', '# T\n\nbody');
    const stored = { body: 'x', delivery: d };
    assert.deepEqual(extractDelivery(stored), d);
    assert.equal(extractDelivery({ body: 'legacy row with no delivery' }), null);
    assert.equal(extractDelivery(null), null);
  });

  it('confirming a manual post marks it posted by hand, still not "delivered", with a validated URL', async () => {
    const t = table();
    const d = await publish('substack', '# T\n\nbody');
    t.rows.set('out1', { id: 'row1', publishedContent: { delivery: d } });

    const bad = await confirmManualPost({ outputId: 'out1', url: 'javascript:alert(1)' }, t.deps);
    assert.equal(bad.ok, false);
    assert.equal((bad as any).status, 400);

    const ok = await confirmManualPost({ outputId: 'out1', url: 'https://example.substack.com/p/hello' }, t.deps);
    assert.equal(ok.ok, true);
    const rec = extractDelivery(t.rows.get('out1')!.publishedContent)!;
    assert.equal(rec.status, 'posted_manually');
    assert.equal(rec.delivered, false);
    assert.equal(rec.postUrl, 'https://example.substack.com/p/hello');
  });

  it('confirm refuses missing ids, unknown outputs, and outputs that were not prepared for manual posting', async () => {
    const t = table();
    assert.equal(((await confirmManualPost({ outputId: '' }, t.deps)) as any).status, 400);
    assert.equal(((await confirmManualPost({ outputId: 5 }, t.deps)) as any).status, 400);
    assert.equal(((await confirmManualPost({ outputId: 'nope' }, t.deps)) as any).status, 404);
    const sent = buildDeliveryRecord({ platform: 'linkedin', status: 'published', delivered: true, externalId: 'urn:1' });
    t.rows.set('o2', { id: 'r2', publishedContent: { delivery: sent } });
    assert.equal(((await confirmManualPost({ outputId: 'o2' }, t.deps)) as any).status, 409);
  });
});
