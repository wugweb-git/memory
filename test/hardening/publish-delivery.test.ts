import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildDeliveryRecord, describeDelivery, extractDelivery } from '../../src/lib/publishing/delivery.ts';

const base = { platform: 'linkedin', externalId: null as string | null, delivered: false };

describe('external delivery record and label', () => {
  it('labels a delivered send', () => {
    const rec = buildDeliveryRecord({ ...base, status: 'published', delivered: true, externalId: 'urn:li:share:1' });
    assert.equal(rec.delivered, true);
    assert.equal(rec.externalId, 'urn:li:share:1');
    assert.equal(describeDelivery(rec), 'Posted to LinkedIn');
  });

  it('labels an unconfigured platform', () => {
    const rec = buildDeliveryRecord({ ...base, status: 'not_configured' });
    assert.equal(rec.delivered, false);
    assert.equal(describeDelivery(rec), 'Not sent: LinkedIn not configured');
  });

  it('records an error result as delivered:false and labels the reason', () => {
    const rec = buildDeliveryRecord(
      { ...base, status: 'error', error: 'LinkedIn API responded 401 Unauthorized.' },
      new Date('2026-01-01T00:00:00Z'),
    );
    assert.equal(rec.status, 'error');
    assert.equal(rec.delivered, false);
    assert.equal(rec.externalId, null);
    assert.equal(rec.error, 'LinkedIn API responded 401 Unauthorized.');
    assert.equal(rec.at, '2026-01-01T00:00:00.000Z');
    assert.equal(describeDelivery(rec), 'Not sent: error, LinkedIn API responded 401 Unauthorized');
  });

  it('shortens long reasons and handles a missing reason', () => {
    const long = buildDeliveryRecord({ ...base, status: 'error', error: 'x'.repeat(300) });
    assert.ok((describeDelivery(long) ?? '').length < 110);
    const none = buildDeliveryRecord({ ...base, status: 'error' });
    assert.equal(describeDelivery(none), 'Not sent: error, unknown reason');
  });

  it('never reports success for an unknown status or delivered:true with a non-published status', () => {
    const rec = buildDeliveryRecord({ ...base, status: 'weird', delivered: true });
    assert.equal(rec.status, 'error');
    assert.equal(rec.delivered, false);
  });

  it('has no label for internal platforms or missing records', () => {
    assert.equal(describeDelivery(buildDeliveryRecord({ platform: 'portfolio', status: 'internal', externalId: null, delivered: false })), null);
    assert.equal(describeDelivery(null), null);
  });

  it('round-trips through publishedContent via extractDelivery', () => {
    const rec = buildDeliveryRecord({ ...base, status: 'error', error: 'boom' });
    assert.deepEqual(extractDelivery({ title: 't', delivery: rec }), rec);
    assert.equal(extractDelivery({ title: 't' }), null);
    assert.equal(extractDelivery(null), null);
  });
});
