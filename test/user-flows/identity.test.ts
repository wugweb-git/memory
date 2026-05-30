import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { IDENTITY_CONFIG, resolveUserId } from '../../src/config/identity.ts';
import {
  APP_NAV_ITEMS,
  WORKSPACE_NAV,
  INDUSTRIES,
  IDENTITY_PILLARS,
  PUBLIC_PROFILE_SERVICES,
} from '../../src/config/ui-content.ts';

describe('identity resolution', () => {
  it('falls back to default user when no explicit id', () => {
    const result = resolveUserId();
    assert.equal(result.userId, IDENTITY_CONFIG.DEFAULT_USER_ID);
    assert.equal(result.source, 'fallback');
  });

  it('uses explicit user id from request', () => {
    const result = resolveUserId('user_abc');
    assert.equal(result.userId, 'user_abc');
    assert.equal(result.source, 'session');
  });
});

describe('ui content config', () => {
  it('exports navigation and marketing content', () => {
    assert.ok(APP_NAV_ITEMS.length >= 5);
    assert.ok(WORKSPACE_NAV.length >= 4);
    assert.equal(INDUSTRIES.length, 12);
    assert.equal(IDENTITY_PILLARS.length, 3);
    assert.ok(PUBLIC_PROFILE_SERVICES.length >= 1);
  });

  it('nav items have unique hrefs', () => {
    const hrefs = APP_NAV_ITEMS.map((n) => n.href);
    assert.equal(new Set(hrefs).size, hrefs.length);
  });
});
