import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

describe('route access policy (default-deny)', () => {
  it('keeps the visitor-facing surfaces public', async () => {
    const { isPublicRoute } = await import('../../src/lib/security/route-access.ts');
    for (const p of ['/', '/login', '/ask', '/p/system_user', '/offline']) {
      assert.equal(isPublicRoute(p, 'GET'), true, p);
    }
    assert.equal(isPublicRoute('/api/chat', 'POST'), true);
    assert.equal(isPublicRoute('/api/showcase', 'GET'), true);
    assert.equal(isPublicRoute('/api/profile/system_user', 'GET'), true);
    assert.equal(isPublicRoute('/api/auth/login', 'POST'), true);
  });

  it('keeps self-authenticating routes reachable', async () => {
    const { isPublicRoute } = await import('../../src/lib/security/route-access.ts');
    assert.equal(isPublicRoute('/api/jobs/process', 'POST'), true);
    assert.equal(isPublicRoute('/api/jobs/run', 'GET'), true);
    assert.equal(isPublicRoute('/api/webhooks/email', 'POST'), true);
    assert.equal(isPublicRoute('/api/oauth/google/callback', 'GET'), true);
  });

  it('protects the private app and its data', async () => {
    const { isPublicRoute } = await import('../../src/lib/security/route-access.ts');
    for (const p of ['/memory', '/buffer', '/content', '/cognitive', '/persona', '/career', '/history', '/system', '/integrations', '/console', '/admin']) {
      assert.equal(isPublicRoute(p, 'GET'), false, p);
    }
    for (const p of ['/api/memory/stats', '/api/cognitive/history', '/api/persona/profile', '/api/health/system', '/api/blob', '/api/upload', '/api/oauth/google/start', '/api/admin/checklist']) {
      assert.equal(isPublicRoute(p, 'GET'), false, p);
    }
  });

  it('allows profile and showcase to be read but never written without a session', async () => {
    const { isPublicRoute } = await import('../../src/lib/security/route-access.ts');
    assert.equal(isPublicRoute('/api/profile/system_user', 'PATCH'), false);
    assert.equal(isPublicRoute('/api/profile/system_user/sections', 'POST'), false);
    assert.equal(isPublicRoute('/api/showcase', 'POST'), false);
  });

  it('ignores trailing slashes so a slash cannot bypass or break the rule', async () => {
    const { isPublicRoute } = await import('../../src/lib/security/route-access.ts');
    assert.equal(isPublicRoute('/memory/', 'GET'), false);
    assert.equal(isPublicRoute('/ask/', 'GET'), true);
  });
});
