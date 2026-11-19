import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { expectNoNewViolations } from '../ux-helpers.ts';
import { loadNav, routeExists, listPages, isIcon } from '../../src/lib/ui-guards/rules.ts';

describe('UX guard: navigation config (src/config/ui-content.ts)', () => {
  it('sanity: nav exports are populated and the route resolver understands dynamic segments', async () => {
    const nav = await loadNav();
    assert.ok(nav.groups.length > 0 && nav.dock.length > 0);
    const pages = listPages();
    assert.ok(routeExists('/console', pages));
    assert.ok(routeExists('/p/anyone', pages), 'dynamic /p/[username] must match');
    assert.ok(routeExists('/memory?tab=1#x', pages), 'query and hash are ignored');
    assert.ok(!routeExists('/definitely-not-a-route', pages));
    assert.ok(isIcon(nav.dock[0].icon));
  });
  it('every NAV_GROUPS / MOBILE_DOCK_ITEMS href resolves to an existing src/app/**/page.tsx', () =>
    expectNoNewViolations('nav-href-resolves', 'a nav item points at a route that has no page.tsx'));
  it('bottom dock has at most 5 tabs including the More tab', () =>
    expectNoNewViolations('nav-dock-limit', 'dock items + More must be <= 5 (Material 3 bottom bar)'));
  it('every nav item has a non-empty label and an icon component', () =>
    expectNoNewViolations('nav-item-complete', 'nav items need a label and a lucide icon'));
  it('no duplicate hrefs within the nav groups or within the dock', () =>
    expectNoNewViolations('nav-no-duplicate-hrefs', 'each destination may appear once'));
});
