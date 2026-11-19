/**
 * Source-level scanning helpers for the UX/accessibility regression guards
 * (test/hardening/ux-*.test.ts). Pure, dependency-free, no browser needed.
 *
 * Violations are compared against test/ux-baseline.json by (rule, file) COUNT,
 * so line numbers may drift during a redesign without breaking the guards;
 * only a file gaining MORE offenders of a rule than its baseline fails.
 */
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export interface Offender {
  rule: string;
  file: string; // repo-relative, posix separators
  line: number;
  message: string;
}

export const ROOT = resolve(process.cwd());

export function rel(abs: string): string {
  return relative(ROOT, abs).split('\\').join('/');
}

/** Recursively list files under `dir` whose name matches `pattern`. */
export function walk(dir: string, pattern: RegExp, acc: string[] = []): string[] {
  if (!existsSync(dir)) return acc;
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (entry === 'node_modules' || entry === '.next') continue;
      walk(full, pattern, acc);
    } else if (pattern.test(entry)) {
      acc.push(full);
    }
  }
  return acc;
}

/** UI source files: every .tsx under src/app (excluding API routes) and src/components. */
export function uiSourceFiles(): string[] {
  const app = walk(join(ROOT, 'src/app'), /\.tsx$/).filter((f) => !rel(f).startsWith('src/app/api/'));
  const comps = walk(join(ROOT, 'src/components'), /\.tsx$/);
  return [...app, ...comps];
}

export function read(abs: string): string {
  return readFileSync(abs, 'utf8');
}

/** Blank out comments (keeping offsets and newlines) so commented-out code never counts. */
export function stripComments(src: string): string {
  const blank = (m: string) => m.replace(/[^\n]/g, ' ');
  return src
    .replace(/\/\*[\s\S]*?\*\//g, blank)
    .replace(/(^|[^:\\'"`])\/\/[^\n]*/g, (m, p: string) => p + blank(m.slice(p.length)));
}

export function lineOf(src: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < src.length; i++) if (src.charCodeAt(i) === 10) line++;
  return line;
}

export interface Tag {
  name: string;
  attrs: string; // raw text between the tag name and the closing '>'
  start: number; // index of '<'
  end: number; // index just after '>'
  selfClosing: boolean;
}

/** Parse the JSX opening tag starting at `i` (src[i] === '<'). Returns null when it is not one. */
function parseTagAt(src: string, i: number): Tag | null {
  const nm = /^[A-Za-z][\w.:-]*/.exec(src.slice(i + 1, i + 80));
  if (!nm) return null;
  let j = i + 1 + nm[0].length;
  const attrStart = j;
  let depth = 0;
  let quote: string | null = null;
  for (; j < src.length; j++) {
    const ch = src[j];
    if (quote) {
      if (ch === '\\') j++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === '{') depth++;
    else if (ch === '}') depth--;
    else if (ch === '>' && depth <= 0) {
      const selfClosing = src[j - 1] === '/';
      return {
        name: nm[0],
        attrs: src.slice(attrStart, selfClosing ? j - 1 : j),
        start: i,
        end: j + 1,
        selfClosing,
      };
    }
    // An opening tag never spans another '<' at depth 0 outside strings.
    if (depth <= 0 && ch === '<') return null;
  }
  return null;
}

/** All JSX opening tags whose name matches `names` (exact, case-sensitive). */
export function findTags(src: string, names: ReadonlyArray<string>): Tag[] {
  const wanted = new Set(names);
  const out: Tag[] = [];
  for (let i = src.indexOf('<'); i !== -1; i = src.indexOf('<', i + 1)) {
    const peek = /^[A-Za-z][\w.:-]*/.exec(src.slice(i + 1, i + 80));
    if (!peek || !wanted.has(peek[0])) continue;
    const t = parseTagAt(src, i);
    if (t) out.push(t);
  }
  return out;
}

/** Any opening tag that contains `index` inside its attribute text, if one does. */
export function enclosingTag(src: string, index: number): Tag | null {
  const from = Math.max(0, index - 1500);
  for (let i = src.lastIndexOf('<', index); i !== -1 && i >= from; i = src.lastIndexOf('<', i - 1)) {
    const t = parseTagAt(src, i);
    if (t && t.end > index) return t;
    if (i === 0) break;
  }
  return null;
}

/** The text of the nearest quoted string literal around `index` (same line), else the line itself. */
export function enclosingString(src: string, index: number): string {
  const ls = src.lastIndexOf('\n', index) + 1;
  let le = src.indexOf('\n', index);
  if (le === -1) le = src.length;
  const line = src.slice(ls, le);
  const pos = index - ls;
  for (const q of ['"', "'", '`']) {
    const a = line.lastIndexOf(q, pos);
    const b = line.indexOf(q, pos);
    if (a !== -1 && b !== -1 && b > a) return line.slice(a, b + 1);
  }
  return line;
}

/** Context used by class-token rules: the whole opening tag if inside one, else the string literal. */
export function classContext(src: string, index: number): string {
  const tag = enclosingTag(src, index);
  return tag ? tag.attrs : enclosingString(src, index);
}

export function hasAttr(attrs: string, name: string): boolean {
  return new RegExp(`(^|[\\s{])${name}\\s*(=|(?=[\\s/>]|$))`).test(attrs);
}

export function attrValue(attrs: string, name: string): string | null {
  const m = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|\\{([^}]*)\\})`).exec(attrs);
  if (!m) return null;
  return (m[1] ?? m[2] ?? m[3] ?? '').trim();
}

export function offender(rule: string, file: string, src: string, index: number, message: string): Offender {
  return { rule, file, line: lineOf(src, index), message };
}

/* ------------------------------ baseline ------------------------------ */

export interface BaselineEntry {
  rule: string;
  file: string;
  count: number;
}
export interface AllowEntry {
  rule: string;
  file: string;
  /** Optional substring the offending line/message must contain for the exception to apply. */
  match?: string;
  reason: string;
}

export const BASELINE_PATH = join(ROOT, 'test/ux-baseline.json');
export const ALLOWLIST_PATH = join(ROOT, 'test/ux-allowlist.json');

export function loadBaseline(): BaselineEntry[] {
  if (!existsSync(BASELINE_PATH)) return [];
  return (JSON.parse(readFileSync(BASELINE_PATH, 'utf8')) as { offenders: BaselineEntry[] }).offenders;
}

export function loadAllowlist(): AllowEntry[] {
  if (!existsSync(ALLOWLIST_PATH)) return [];
  return (JSON.parse(readFileSync(ALLOWLIST_PATH, 'utf8')) as { allow: AllowEntry[] }).allow;
}

export function applyAllowlist(list: Offender[], allow: AllowEntry[] = loadAllowlist()): Offender[] {
  return list.filter(
    (o) => !allow.some((a) => a.rule === o.rule && a.file === o.file && (!a.match || o.message.includes(a.match))),
  );
}

/** Offenders in files that exceed their baseline count for the rule (i.e. NEW violations). */
export function newViolations(rule: string, found: Offender[], baseline: BaselineEntry[] = loadBaseline()): Offender[] {
  const byFile = new Map<string, Offender[]>();
  for (const o of found) byFile.set(o.file, [...(byFile.get(o.file) ?? []), o]);
  const out: Offender[] = [];
  for (const [file, list] of byFile) {
    const allowed = baseline.find((b) => b.rule === rule && b.file === file)?.count ?? 0;
    if (list.length > allowed) out.push(...list);
  }
  return out;
}

export function formatFailure(rule: string, hint: string, found: Offender[], baseline: BaselineEntry[] = loadBaseline()): string {
  const bad = newViolations(rule, found, baseline);
  const counts = new Map<string, number>();
  for (const o of bad) counts.set(o.file, (counts.get(o.file) ?? 0) + 1);
  const lines = bad.map((o) => `  ${o.file}:${o.line}  ${o.message}`);
  const summary = [...counts].map(([f, n]) => {
    const b = baseline.find((e) => e.rule === rule && e.file === f)?.count ?? 0;
    return `  ${f}: ${n} found, ${b} allowed by test/ux-baseline.json`;
  });
  return `[${rule}] ${hint}\nNew violations (${bad.length}):\n${lines.join('\n')}\nPer file:\n${summary.join('\n')}\n` +
    `Fix the code, or if intentional add a documented exception to test/ux-allowlist.json.`;
}
