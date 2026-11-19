/**
 * Regenerate test/ux-baseline.json from the current code:
 *   npx tsx test/ux-baseline-update.ts
 * Only run this to ACCEPT existing offenders (e.g. after an audit). Prefer fixing the code,
 * then re-run: counts shrink; the guards fail only when a file gains offenders.
 */
import { writeFileSync } from 'node:fs';
import { BASELINE_PATH, type BaselineEntry } from '../src/lib/ui-guards/scan.ts';
import { RULE_IDS, collect } from '../src/lib/ui-guards/rules.ts';

const entries: BaselineEntry[] = [];
const totals: Record<string, number> = {};
for (const rule of RULE_IDS) {
  const found = await collect(rule);
  totals[rule] = found.length;
  const byFile = new Map<string, number>();
  for (const o of found) byFile.set(o.file, (byFile.get(o.file) ?? 0) + 1);
  for (const [file, count] of [...byFile].sort()) entries.push({ rule, file, count });
}
writeFileSync(BASELINE_PATH, JSON.stringify({
  note: 'Known pre-existing UX/a11y offenders, counted per (rule, file). Guards in test/hardening/ux-*.test.ts fail only when a file gains MORE offenders than listed. Regenerate with: npx tsx test/ux-baseline-update.ts',
  offenders: entries,
}, null, 2) + '\n');
console.table(totals);
if (process.env.UX_VERBOSE) {
  for (const rule of RULE_IDS) for (const o of await collect(rule)) console.log(`${o.rule} ${o.file}:${o.line} ${o.message}`);
}
