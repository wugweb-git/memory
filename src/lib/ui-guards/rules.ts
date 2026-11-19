/**
 * UX/accessibility rule detectors. Each per-file rule is a pure function
 * (file, source) -> Offender[] so it can be unit-tested on synthetic snippets.
 * Project-level rules (nav, titles, h1, PWA) read the repo from disk.
 */
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  ROOT, rel, walk, read, stripComments, lineOf, findTags, enclosingTag, classContext, hasAttr, attrValue,
  offender, uiSourceFiles, applyAllowlist, type Offender,
} from './scan';

export type FileRule = (file: string, rawSrc: string) => Offender[];

const re = (rule: string, file: string, src: string, rx: RegExp, msg: (m: RegExpExecArray) => string, ok?: (m: RegExpExecArray) => boolean): Offender[] => {
  const out: Offender[] = [];
  for (const m of src.matchAll(rx)) {
    if (ok && ok(m as RegExpExecArray)) continue;
    out.push(offender(rule, file, src, m.index ?? 0, msg(m as RegExpExecArray)));
  }
  return out;
};

/* ------------------------- design tokens (CLAUDE.md) ------------------------- */

export const tokenHex: FileRule = (file, raw) => {
  const src = stripComments(raw);
  // 3/4/6/8-digit hex colours; URL fragments (href="#abc", url(#abc), /#abc, &#123) are not colours.
  return re('token-hex', file, src, /(?<![\w&/])#(?:[0-9a-fA-F]{8}|[0-9a-fA-F]{6}|[0-9a-fA-F]{4}|[0-9a-fA-F]{3})(?![\w-])/g,
    (m) => `hardcoded hex colour ${m[0]} (use a CSS-variable token)`,
    (m) => {
      const before = src.slice(Math.max(0, (m.index ?? 0) - 14), m.index ?? 0);
      return /(href|url\(|id|htmlFor|aria-\w+)\s*=?\s*\{?["'`(]?$/.test(before);
    },
  );
};

export const tokenBlackZinc: FileRule = (file, raw) => {
  const src = stripComments(raw);
  return re('token-black-zinc', file, src,
    /(?<![\w-])(?:[a-z0-9]+:)*(?:text|bg|border|ring|fill|stroke|from|to|via|divide|outline|shadow|decoration|caret|accent)-(?:black(?:\/\d+)?|zinc-\d{2,3}(?:\/\d+)?)(?![\w-])/g,
    (m) => `hardcoded palette class "${m[0]}" (use text-text-*, bg-bg-*, border-border-* tokens)`);
};

export const tokenArbitraryFont: FileRule = (file, raw) => {
  const src = stripComments(raw);
  return re('token-arbitrary-font', file, src, /(?<![\w-])(?:[a-z0-9]+:)*text-\[\s*[\d.]+\s*(?:px|rem|em|pt)\s*\]/g,
    (m) => `arbitrary font size "${m[0]}" (use the named scale 2xs..5xl)`);
};

export const tokenItalic: FileRule = (file, raw) => {
  const src = stripComments(raw);
  return [
    ...re('token-italic', file, src, /(?<![\w-])(?:[a-z0-9]+:)*italic(?![\w-])(?=[\s"'`])/g, () => 'italic class (headings and body use no italics)'),
    ...re('token-italic', file, src, /fontStyle\s*:\s*['"`]italic['"`]|font-style\s*:\s*italic/g, () => 'inline italic font style'),
  ];
};

/** Small uppercase eyebrow labels are the one exception: the element must also carry text-2xs or text-xs. */
export const tokenUppercase: FileRule = (file, raw) => {
  const src = stripComments(raw);
  const out: Offender[] = [];
  for (const m of src.matchAll(/(?<![\w-])(?:[a-z0-9]+:)*uppercase(?![\w-])(?=[\s"'`])/g)) {
    const ctx = classContext(src, m.index ?? 0);
    if (/(?<![\w-])(?:[a-z0-9]+:)*text-(?:2xs|xs)(?![\w-])/.test(ctx)) continue;
    out.push(offender('token-uppercase-eyebrow', file, src, m.index ?? 0, 'uppercase without text-2xs/text-xs (only small eyebrow labels may be uppercase)'));
  }
  return out;
};

export const tokenInlineRadius: FileRule = (file, raw) => {
  const src = stripComments(raw);
  return re('token-inline-radius', file, src, /\bborder(?:Top|Bottom)?(?:Left|Right)?Radius\s*:|border-radius\s*:/g,
    () => 'inline style border-radius (radius comes from Tailwind rounded-* tokens)');
};

/* --------------------------- touch targets (44px) --------------------------- */

/**
 * In src/components/ui: a sizing class below h-11/min-h-11 (44px) on a control (a string that also
 * sets padding or p-0, excluding decorative spinners). Breakpoint-prefixed values (sm:min-h-10) are a
 * desktop refinement of a 44px mobile floor and are not flagged.
 */
export const touchTargetUi: FileRule = (file, raw) => {
  if (!file.startsWith('src/components/ui/')) return [];
  const src = stripComments(raw);
  const out: Offender[] = [];
  for (const m of src.matchAll(/(?<![\w:-])(min-h|h)-(\d+)(?![\w./-])/g)) {
    const n = Number(m[2]);
    if (n >= 11) continue;
    const ctx = classContext(src, m.index ?? 0);
    const str = ctx.length < 400 ? ctx : ctx.slice(0, 400);
    if (/animate-spin|aria-hidden|rounded-full border-2/.test(str)) continue;
    if (!/(?<![\w-])(?:px|py|p)-\d/.test(str)) continue; // not a padded control
    out.push(offender('touch-target', file, src, m.index ?? 0,
      `${m[0]} is ${n * 4}px (< 44px default); use min-h-11 or document an exception`));
  }
  return out;
};

/* ------------------------------ accessibility ------------------------------ */

export const a11yImgAlt: FileRule = (file, raw) => {
  const src = stripComments(raw);
  const out: Offender[] = [];
  for (const t of findTags(src, ['img', 'Image'])) {
    if (hasAttr(t.attrs, 'alt') || /\{\s*\.\.\./.test(t.attrs)) continue;
    out.push(offender('a11y-img-alt', file, src, t.start, `<${t.name}> without alt (use alt="" for decorative images)`));
  }
  return out;
};

const closeFor = (name: string) => `</${name}>`;

export const a11yIconButton: FileRule = (file, raw) => {
  const src = stripComments(raw);
  const out: Offender[] = [];
  for (const t of findTags(src, ['button', 'Button'])) {
    if (t.selfClosing) continue;
    const endIdx = src.indexOf(closeFor(t.name), t.end);
    if (endIdx === -1) continue;
    const inner = src.slice(t.end, endIdx).trim();
    const tagCount = (inner.match(/<[A-Za-z]/g) ?? []).length;
    const iconOnly = tagCount === 1 && /^<[A-Z][\w.]*(\s[\s\S]*)?\/>$/.test(inner);
    if (!iconOnly) continue;
    if (hasAttr(t.attrs, 'aria-label') || hasAttr(t.attrs, 'aria-labelledby') || /\{\s*\.\.\./.test(t.attrs)) continue;
    out.push(offender('a11y-icon-button-label', file, src, t.start, `icon-only <${t.name}> without aria-label`));
  }
  return out;
};

export const a11yFormLabel: FileRule = (file, raw) => {
  const src = stripComments(raw);
  const out: Offender[] = [];
  const labelRanges: Array<[number, number]> = [];
  for (const l of findTags(src, ['label', 'Label'])) {
    const e = src.indexOf(closeFor(l.name), l.end);
    if (e !== -1) labelRanges.push([l.start, e]);
  }
  const htmlFors = [...src.matchAll(/htmlFor\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g)].map((m) => (m[1] ?? m[2] ?? m[3] ?? '').trim());
  for (const t of findTags(src, ['input', 'select', 'textarea'])) {
    const type = (attrValue(t.attrs, 'type') ?? '').replace(/^['"`]|['"`]$/g, '');
    if (t.name === 'input' && ['hidden', 'submit', 'button', 'reset', 'image'].includes(type)) continue;
    if (/\{\s*\.\.\./.test(t.attrs)) continue; // wrapper forwards props
    if (hasAttr(t.attrs, 'aria-label') || hasAttr(t.attrs, 'aria-labelledby')) continue;
    if (labelRanges.some(([a, b]) => t.start > a && t.start < b)) continue;
    const id = attrValue(t.attrs, 'id');
    if (id !== null) {
      const lit = id.replace(/^['"`]|['"`]$/g, '');
      const dynamic = /(?:^|\s)id\s*=\s*\{/.test(t.attrs);
      if (htmlFors.some((h) => h === lit || (dynamic && h !== ''))) continue;
    }
    out.push(offender('a11y-form-label', file, src, t.start, `<${t.name}> without label (aria-label, <label htmlFor>, or wrapping <label>)`));
  }
  return out;
};

export const a11yTabIndex: FileRule = (file, raw) => {
  const src = stripComments(raw);
  return re('a11y-tabindex', file, src, /tabIndex\s*=\s*\{?\s*["'`]?(\d+)/g,
    (m) => `tabIndex=${m[1]} (positive tabindex breaks natural focus order)`, (m) => Number(m[1]) <= 0);
};

export const a11yOutlineNone: FileRule = (file, raw) => {
  const src = stripComments(raw);
  const out: Offender[] = [];
  for (const m of src.matchAll(/(?<![\w-])((?:[a-z0-9-]+:)*)outline-none(?![\w-])/g)) {
    const ctx = classContext(src, m.index ?? 0);
    // Programmatic focus targets (tabIndex -1: dialogs, <main>, headings) are not keyboard tab stops.
    if (/tabIndex\s*=\s*\{\s*-1\s*\}|tabIndex\s*=\s*["']-1["']/.test(ctx)) continue;
    // focus-visible:outline-none is fine when a focus-visible ring/outline/border replaces it.
    if (/focus-visible:(?:ring|outline(?!-none)|border|shadow|bg|underline)/.test(ctx)) continue;
    if (/focus:(?:ring|outline(?!-none)|border|shadow)/.test(ctx)) continue;
    out.push(offender('a11y-outline-none', file, src, m.index ?? 0, `${m[0]} without a focus-visible ring/outline replacement on the same element`));
  }
  return out;
};

export const FILE_RULES: Record<string, FileRule> = {
  'token-hex': tokenHex,
  'token-black-zinc': tokenBlackZinc,
  'token-arbitrary-font': tokenArbitraryFont,
  'token-italic': tokenItalic,
  'token-uppercase-eyebrow': tokenUppercase,
  'token-inline-radius': tokenInlineRadius,
  'touch-target': touchTargetUi,
  'a11y-img-alt': a11yImgAlt,
  'a11y-icon-button-label': a11yIconButton,
  'a11y-form-label': a11yFormLabel,
  'a11y-tabindex': a11yTabIndex,
  'a11y-outline-none': a11yOutlineNone,
};

export function scanFileRule(rule: string): Offender[] {
  const fn = FILE_RULES[rule];
  const out: Offender[] = [];
  for (const abs of uiSourceFiles()) out.push(...fn(rel(abs), read(abs)));
  return applyAllowlist(out);
}

/* ----------------------------- routes and pages ----------------------------- */

export interface Page { file: string; abs: string; route: string; segments: string[] }

export function listPages(): Page[] {
  const base = join(ROOT, 'src/app');
  return walk(base, /^page\.tsx$/).map((abs) => {
    const segs = rel(dirname(abs)).replace(/^src\/app\/?/, '').split('/').filter(Boolean).filter((s) => !/^\(.*\)$/.test(s));
    return { file: rel(abs), abs, route: '/' + segs.join('/'), segments: segs };
  });
}

/** Does `href` resolve to an existing page.tsx (dynamic [x] segments match any single segment)? */
export function routeExists(href: string, pages: Page[] = listPages()): boolean {
  const path = href.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  const parts = path.split('/').filter(Boolean);
  return pages.some((p) => p.segments.length === parts.length && p.segments.every((s, i) => /^\[.+\]$/.test(s) || s === parts[i]));
}

/* ---------------------------------- navigation --------------------------------- */

const NAV_FILE = 'src/config/ui-content.ts';

function navLine(href: string): number {
  const src = read(join(ROOT, NAV_FILE));
  const idx = src.indexOf(`'${href}'`);
  return idx === -1 ? 1 : lineOf(src, idx);
}

interface NavLike { href: string; label: string; icon: unknown }

export async function loadNav(): Promise<{ groups: Array<{ group: string; items: NavLike[] }>; dock: NavLike[]; dockMax: number }> {
  const mod = await import('../../config/ui-content');
  return {
    groups: mod.NAV_GROUPS.map((g: { group: string; items: ReadonlyArray<NavLike> }) => ({ group: g.group, items: [...g.items] })),
    dock: [...mod.MOBILE_DOCK_ITEMS],
    dockMax: mod.MOBILE_DOCK_MAX,
  };
}

export const isIcon = (v: unknown): boolean =>
  typeof v === 'function' || (typeof v === 'object' && v !== null && '$$typeof' in (v as object));

export function navHrefOffenders(nav: Awaited<ReturnType<typeof loadNav>>): Offender[] {
  const pages = listPages();
  const items = [...nav.groups.flatMap((g) => g.items.map((i) => ({ i, where: `NAV_GROUPS/${g.group}` }))), ...nav.dock.map((i) => ({ i, where: 'MOBILE_DOCK_ITEMS' }))];
  return items
    .filter(({ i }) => !routeExists(i.href, pages))
    .map(({ i, where }) => ({ rule: 'nav-href-resolves', file: NAV_FILE, line: navLine(i.href), message: `${where}: "${i.label}" href ${i.href} has no matching src/app/**/page.tsx` }));
}

export function navDockOffenders(nav: Awaited<ReturnType<typeof loadNav>>): Offender[] {
  const out: Offender[] = [];
  if (nav.dock.length + 1 > 5) out.push({ rule: 'nav-dock-limit', file: NAV_FILE, line: 1, message: `bottom dock has ${nav.dock.length} items + More = ${nav.dock.length + 1} (max 5)` });
  if (nav.dockMax + 1 > 5) out.push({ rule: 'nav-dock-limit', file: NAV_FILE, line: 1, message: `MOBILE_DOCK_MAX=${nav.dockMax} allows more than 5 tabs with More` });
  return out;
}

export function navCompleteOffenders(nav: Awaited<ReturnType<typeof loadNav>>): Offender[] {
  const all = [...nav.groups.flatMap((g) => g.items), ...nav.dock];
  const out: Offender[] = [];
  for (const i of all) {
    if (typeof i.label !== 'string' || i.label.trim() === '') out.push({ rule: 'nav-item-complete', file: NAV_FILE, line: navLine(i.href), message: `${i.href} has no label` });
    if (!isIcon(i.icon)) out.push({ rule: 'nav-item-complete', file: NAV_FILE, line: navLine(i.href), message: `"${i.label}" (${i.href}) has no icon component` });
  }
  return out;
}

export function navDuplicateOffenders(nav: Awaited<ReturnType<typeof loadNav>>): Offender[] {
  const out: Offender[] = [];
  const seen = new Map<string, string>();
  for (const g of nav.groups) for (const i of g.items) {
    if (seen.has(i.href)) out.push({ rule: 'nav-no-duplicate-hrefs', file: NAV_FILE, line: navLine(i.href), message: `duplicate href ${i.href} ("${i.label}" in ${g.group}, also ${seen.get(i.href)})` });
    else seen.set(i.href, `"${i.label}" in ${g.group}`);
  }
  const dockSeen = new Set<string>();
  for (const i of nav.dock) {
    if (dockSeen.has(i.href)) out.push({ rule: 'nav-no-duplicate-hrefs', file: NAV_FILE, line: navLine(i.href), message: `duplicate dock href ${i.href}` });
    dockSeen.add(i.href);
  }
  return out;
}

/* ------------------------- page titles and h1 (static) ------------------------- */

/** Pages that intentionally have no own title/h1 (documented exceptions). */
export const TITLE_EXCEPTIONS: Record<string, string> = {
  'src/app/page.tsx': 'redirects to the public profile; never renders',
};
export const H1_EXCEPTIONS: Record<string, string> = {
  'src/app/page.tsx': 'redirects to the public profile; never renders',
};

function metaTitle(src: string): { has: boolean; dynamic: boolean; value: string | null } {
  const code = stripComments(src);
  if (/export\s+(?:async\s+)?function\s+generateMetadata/.test(code) || /export\s+const\s+generateMetadata/.test(code)) return { has: true, dynamic: true, value: null };
  const m = /export\s+const\s+metadata\b[^=]*=\s*\{([\s\S]*?)\n\}/.exec(code) ?? /export\s+const\s+metadata\b[^=]*=\s*\{([^;]*)\}\s*;?/.exec(code);
  if (!m) return { has: false, dynamic: false, value: null };
  const t = /title\s*:\s*(?:\{[^}]*?(?:absolute|default)\s*:\s*)?(['"`])((?:(?!\1).)*)\1/.exec(m[1]);
  if (!t) return { has: /title\s*:/.test(m[1]), dynamic: /title\s*:/.test(m[1]), value: null };
  return { has: true, dynamic: t[2].includes('${'), value: t[2] };
}

export interface ResolvedTitle { page: Page; source: string | null; value: string | null; dynamic: boolean }

export function resolveTitles(): ResolvedTitle[] {
  return listPages().map((page) => {
    const own = metaTitle(read(page.abs));
    if (own.has) return { page, source: page.file, value: own.value, dynamic: own.dynamic };
    // Nearest ancestor layout below the root (root only supplies the generic site default).
    for (let d = page.segments.length; d >= 1; d--) {
      const lay = join(ROOT, 'src/app', ...page.segments.slice(0, d), 'layout.tsx');
      if (existsSync(lay)) {
        const t = metaTitle(readFileSync(lay, 'utf8'));
        if (t.has) return { page, source: rel(lay), value: t.value, dynamic: t.dynamic };
      }
    }
    return { page, source: null, value: null, dynamic: false };
  });
}

export function titleMissingOffenders(): Offender[] {
  return resolveTitles()
    .filter((r) => !r.source && !(r.page.file in TITLE_EXCEPTIONS))
    .map((r) => ({ rule: 'page-title', file: r.page.file, line: 1, message: `${r.page.route} sets no document title (export metadata here or in a layout)` }));
}

export function titleDuplicateOffenders(): Offender[] {
  const byTitle = new Map<string, ResolvedTitle[]>();
  for (const r of resolveTitles()) {
    if (!r.value || r.dynamic) continue;
    byTitle.set(r.value, [...(byTitle.get(r.value) ?? []), r]);
  }
  const out: Offender[] = [];
  for (const [title, list] of byTitle) {
    if (list.length < 2) continue;
    for (const r of list) out.push({ rule: 'page-title-unique', file: r.page.file, line: 1, message: `title "${title}" is shared by ${list.map((x) => x.page.route).join(', ')}` });
  }
  return out;
}

/** Top-level declarations of a module: name -> source slice (exported or not). */
function segments(src: string): Array<{ name: string; text: string }> {
  const rx = /^(?:export\s+)?(?:default\s+)?(?:async\s+)?(?:function\*?|const|class)\s+([A-Za-z_$][\w$]*)/gm;
  const starts = [...src.matchAll(rx)].map((m) => ({ name: m[1], at: m.index ?? 0 }));
  return starts.map((s0, i) => ({ name: s0.name, text: src.slice(s0.at, starts[i + 1]?.at ?? src.length) }));
}

function resolveImport(from: string, spec: string): string | null {
  let base: string | null = null;
  if (spec.startsWith('.')) base = join(dirname(from), spec);
  else if (spec.startsWith('@/')) base = join(ROOT, 'src', spec.slice(2));
  if (!base || /\/(api|lib|config|hooks|utils|generated)(\/|$)/.test(rel(base))) return null;
  for (const e of ['.tsx', '/index.tsx']) if (existsSync(base + e)) return base + e;
  return null;
}

/**
 * <h1> elements a page can render: its own file plus, transitively, only the imported components it
 * actually uses as JSX (`<Name`). An unused export that happens to contain an h1 (e.g. a PageHeader the
 * page does not mount) is not counted. Mutually exclusive branches (loading/empty/loaded) still each count.
 */
export function h1Sites(entry: string): Array<{ file: string; count: number }> {
  const result = new Map<string, number>();
  const seen = new Set<string>();
  const visit = (file: string, only: Set<string> | null) => {
    const key = `${file}|${only ? [...only].sort().join(',') : '*'}`;
    if (seen.has(key)) return;
    seen.add(key);
    const src = stripComments(read(file));
    const segs = segments(src);
    // Included text: the whole module for the page itself; otherwise the used components plus same-module helpers they use.
    let included: Array<{ name: string; text: string }>;
    if (!only) included = segs.length ? segs : [{ name: '*', text: src }];
    else {
      const names = new Set(only);
      let grew = true;
      while (grew) {
        grew = false;
        for (const sg of segs) if (names.has(sg.name)) for (const o of segs) if (!names.has(o.name) && new RegExp(`<${o.name}[\\s/>.]`).test(sg.text)) { names.add(o.name); grew = true; }
      }
      included = segs.filter((sg) => names.has(sg.name));
    }
    const text = included.map((x) => x.text).join('\n');
    const n = findTags(text, ['h1']).length;
    if (n) result.set(file, (result.get(file) ?? 0) + n);
    for (const m of src.matchAll(/import\s+(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g)) {
      const target = resolveImport(file, m[3]);
      if (!target) continue;
      const used = new Set<string>();
      const locals: Array<[string, string]> = [];
      if (m[1]) locals.push([m[1], m[1]]);
      for (const part of (m[2] ?? '').split(',')) {
        const mm = /^\s*(?:type\s+)?(\w+)(?:\s+as\s+(\w+))?\s*$/.exec(part);
        if (mm) locals.push([mm[2] ?? mm[1], mm[1]]);
      }
      for (const [local, exported] of locals) if (new RegExp(`<${local}[\\s/>.]`).test(text)) used.add(m[1] === local ? '*default*' : exported);
      if (used.size) visit(target, used.has('*default*') ? null : used);
    }
    for (const m of text.matchAll(/dynamic\(\s*\(\)\s*=>\s*import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const target = resolveImport(file, m[1]);
      if (target) visit(target, null);
    }
  };
  visit(entry, null);
  return [...result].map(([file, count]) => ({ file, count }));
}

export function h1Offenders(): Offender[] {
  const out: Offender[] = [];
  for (const page of listPages()) {
    if (page.file in H1_EXCEPTIONS) continue;
    const sites = h1Sites(page.abs);
    const total = sites.reduce((n, s) => n + s.count, 0);
    if (total !== 1) {
      const where = sites.map((s) => `${rel(s.file)} x${s.count}`).join(', ');
      out.push({ rule: 'page-h1', file: page.file, line: 1, message: `${page.route} renders ${total} <h1> in its component tree (expected exactly 1; sr-only counts)${where ? ': ' + where : ''}` });
    }
  }
  return out;
}

/* ----------------------------------- PWA ------------------------------------ */

export function pwaOffenders(): Offender[] {
  const out: Offender[] = [];
  const add = (rule: string, file: string, message: string, line = 1) => out.push({ rule, file, line, message });
  const mfPath = join(ROOT, 'public/manifest.json');
  const mf = JSON.parse(read(mfPath)) as {
    start_url?: string; scope?: string; icons?: Array<{ src: string }>; screenshots?: Array<{ src: string }>;
    shortcuts?: Array<{ url: string; icons?: Array<{ src: string }> }>;
  };
  const F = 'public/manifest.json';
  const pages = listPages();
  const scope = mf.scope ?? '/';
  if (!mf.start_url) add('pwa-manifest', F, 'start_url missing');
  else {
    if (!routeExists(mf.start_url, pages)) add('pwa-manifest', F, `start_url ${mf.start_url} does not resolve to a page`);
    if (!mf.start_url.startsWith(scope)) add('pwa-manifest', F, `start_url ${mf.start_url} is outside scope ${scope}`);
  }
  if (!mf.scope) add('pwa-manifest', F, 'scope missing');
  if (!mf.icons || mf.icons.length === 0) add('pwa-manifest', F, 'no icons declared');
  const assets = [...(mf.icons ?? []), ...(mf.screenshots ?? []), ...(mf.shortcuts ?? []).flatMap((s) => s.icons ?? [])];
  for (const a of assets) if (!existsSync(join(ROOT, 'public', a.src))) add('pwa-manifest', F, `${a.src} does not exist in public/`);
  for (const s of mf.shortcuts ?? []) if (!routeExists(s.url, pages)) add('pwa-manifest', F, `shortcut ${s.url} does not resolve to a page`);

  const swPath = join(ROOT, 'public/sw.js');
  if (!existsSync(swPath)) add('pwa-sw-version', 'public/sw.js', 'service worker file missing');
  else if (!/^\s*const\s+VERSION\s*=\s*['"`][^'"`]+['"`]/m.test(read(swPath))) add('pwa-sw-version', 'public/sw.js', 'no `const VERSION = "..."` constant (cache busting on release)');

  const layoutPath = join(ROOT, 'src/app/layout.tsx');
  const layout = stripComments(read(layoutPath));
  for (const m of layout.matchAll(/user-?scalable\s*[:=]\s*['"]?(no|false|0)\b|maximum-?scale\s*[:=]\s*['"]?([0-4](?:\.\d+)?)\b/gi)) {
    add('pwa-viewport-zoom', 'src/app/layout.tsx', `viewport disables or limits zoom: "${m[0]}" (WCAG 1.4.4)`, lineOf(layout, m.index ?? 0));
  }
  if (!/export\s+const\s+viewport/.test(layout) && !/name=["']viewport["']/.test(layout)) add('pwa-viewport-zoom', 'src/app/layout.tsx', 'no viewport export found');
  return out;
}

/* ---------------------------------- registry ---------------------------------- */

export const RULE_IDS = [
  'nav-href-resolves', 'nav-dock-limit', 'nav-item-complete', 'nav-no-duplicate-hrefs',
  'page-title', 'page-title-unique', 'page-h1',
  'token-hex', 'token-black-zinc', 'token-arbitrary-font', 'token-italic', 'token-uppercase-eyebrow', 'token-inline-radius',
  'touch-target',
  'a11y-img-alt', 'a11y-icon-button-label', 'a11y-form-label', 'a11y-tabindex', 'a11y-outline-none',
  'pwa-manifest', 'pwa-sw-version', 'pwa-viewport-zoom',
] as const;
export type RuleId = (typeof RULE_IDS)[number];

export async function collect(rule: RuleId): Promise<Offender[]> {
  if (rule in FILE_RULES) return scanFileRule(rule);
  switch (rule) {
    case 'nav-href-resolves': return applyAllowlist(navHrefOffenders(await loadNav()));
    case 'nav-dock-limit': return applyAllowlist(navDockOffenders(await loadNav()));
    case 'nav-item-complete': return applyAllowlist(navCompleteOffenders(await loadNav()));
    case 'nav-no-duplicate-hrefs': return applyAllowlist(navDuplicateOffenders(await loadNav()));
    case 'page-title': return applyAllowlist(titleMissingOffenders());
    case 'page-title-unique': return applyAllowlist(titleDuplicateOffenders());
    case 'page-h1': return applyAllowlist(h1Offenders());
    default: return applyAllowlist(pwaOffenders().filter((o) => o.rule === rule));
  }
}
