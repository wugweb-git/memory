/**
 * Apple Health export import. Apple has no public API for Health data, so the
 * owner exports it from the Health app (profile > Export all health data) and
 * uploads export.zip or export.xml here.
 *
 * The XML can be enormous, so it is never parsed into a DOM: it is scanned in
 * 1 MB chunks with a regex for <Record> and <Workout> opening tags and folded
 * into per-week aggregates. One memory item per week (steps, workouts, sleep,
 * resting heart rate), never one item per record. Input is capped at 50 MB.
 *
 * Steps and sleep are summed per source device and the busiest source wins, so
 * an iPhone and a Watch recording the same walk are not double counted.
 * Sleep counts only "asleep" stages, not in-bed or awake time.
 */

import { StringDecoder } from 'node:string_decoder';
import type { Connector, SyncResult } from '@/lib/ingestion/connectors/types';
import { ingestItems, recordError, type PendingItem } from './sync-items';
import { isZip, readZip } from './zip';

export const APPLE_HEALTH_MAX_BYTES = 50 * 1024 * 1024;
export const APPLE_HEALTH_MAX_WEEKS = 52;
const CHUNK = 1024 * 1024;

const STEPS = 'HKQuantityTypeIdentifierStepCount';
const SLEEP = 'HKCategoryTypeIdentifierSleepAnalysis';
const RESTING_HR = 'HKQuantityTypeIdentifierRestingHeartRate';

export interface WeekSummary {
  weekStart: string; // Monday, YYYY-MM-DD
  weekEnd: string; // Sunday, YYYY-MM-DD
  steps: number | null;
  workouts: { count: number; minutes: number; types: string[] } | null;
  sleep: { hours: number; nights: number } | null;
  restingHeartRate: { avg: number; samples: number; unit: string } | null;
}

function attrs(tag: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /([A-Za-z]+)="([^"]*)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(tag))) out[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  return out;
}

/** "2024-03-04 08:15:00 +0100" to epoch ms, or NaN. */
function ts(s: string | undefined): number {
  if (!s) return NaN;
  const m = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-])(\d{2})(\d{2})$/.exec(s);
  return Date.parse(m ? `${m[1]}T${m[2]}${m[3]}${m[4]}:${m[5]}` : s);
}

/** Monday of the local calendar week for a "YYYY-MM-DD..." date string. */
function weekOf(date: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(date);
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  const dow = (d.getUTCDay() + 6) % 7; // Monday = 0
  d.setUTCDate(d.getUTCDate() - dow);
  return d.toISOString().slice(0, 10);
}

function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

interface Acc {
  steps: Map<string, number>; // source -> sum
  sleepMs: Map<string, number>;
  sleepDays: Map<string, Set<string>>;
  hrSum: number;
  hrN: number;
  hrUnit: string;
  wCount: number;
  wMin: number;
  wTypes: Map<string, number>;
}

const newAcc = (): Acc => ({ steps: new Map(), sleepMs: new Map(), sleepDays: new Map(), hrSum: 0, hrN: 0, hrUnit: 'count/min', wCount: 0, wMin: 0, wTypes: new Map() });

/** Streaming-safe: scans the XML in chunks, holding only the aggregates in memory. */
export function summariseAppleHealthXml(xml: Buffer): WeekSummary[] {
  if (xml.length > APPLE_HEALTH_MAX_BYTES) throw new Error(tooBig());
  const weeks = new Map<string, Acc>();
  const acc = (w: string) => weeks.get(w) ?? (weeks.set(w, newAcc()), weeks.get(w)!);
  const decoder = new StringDecoder('utf8');
  const tagRe = /<(Record|Workout)\s[^>]*>/g;
  let carry = '';

  const handle = (kind: string, tag: string) => {
    const a = attrs(tag);
    if (kind === 'Workout') {
      const w = weekOf(a.startDate ?? '');
      if (!w) return;
      const x = acc(w);
      let mins = parseFloat(a.duration ?? '');
      if (Number.isFinite(mins)) {
        const unit = (a.durationUnit ?? 'min').toLowerCase();
        if (unit === 'sec' || unit === 's') mins /= 60;
        else if (unit === 'hr' || unit === 'h') mins *= 60;
        x.wMin += mins;
      }
      x.wCount++;
      const t = (a.workoutActivityType ?? 'Workout').replace(/^HKWorkoutActivityType/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase();
      x.wTypes.set(t, (x.wTypes.get(t) ?? 0) + 1);
      return;
    }
    const type = a.type;
    const source = a.sourceName ?? 'unknown';
    if (type === STEPS) {
      const w = weekOf(a.startDate ?? '');
      const v = parseFloat(a.value ?? '');
      if (w && Number.isFinite(v)) acc(w).steps.set(source, (acc(w).steps.get(source) ?? 0) + v);
    } else if (type === SLEEP) {
      if (!/Asleep/.test(a.value ?? '')) return;
      const ms = ts(a.endDate) - ts(a.startDate);
      const day = (a.endDate ?? '').slice(0, 10); // wake-up date
      const w = weekOf(day);
      if (!w || !Number.isFinite(ms) || ms <= 0) return;
      const x = acc(w);
      x.sleepMs.set(source, (x.sleepMs.get(source) ?? 0) + ms);
      (x.sleepDays.get(source) ?? x.sleepDays.set(source, new Set()).get(source)!).add(day);
    } else if (type === RESTING_HR) {
      const w = weekOf(a.startDate ?? '');
      const v = parseFloat(a.value ?? '');
      if (w && Number.isFinite(v)) {
        const x = acc(w);
        x.hrSum += v;
        x.hrN++;
        if (a.unit) x.hrUnit = a.unit;
      }
    }
  };

  const scan = (text: string, final: boolean) => {
    const s = carry + text;
    let last = 0;
    tagRe.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = tagRe.exec(s))) {
      handle(m[1], m[0]);
      last = tagRe.lastIndex;
    }
    // Keep an unfinished trailing tag for the next chunk.
    const open = s.lastIndexOf('<', s.length);
    carry = final ? '' : open >= last ? s.slice(open) : '';
    if (carry.length > 64 * 1024) carry = '';
  };

  for (let i = 0; i < xml.length; i += CHUNK) scan(decoder.write(xml.subarray(i, i + CHUNK)), false);
  scan(decoder.end(), true);

  const best = (m: Map<string, number>) => (m.size ? Math.max(...m.values()) : 0);
  const out: WeekSummary[] = [];
  for (const [weekStart, x] of weeks) {
    const steps = Math.round(best(x.steps));
    let sleep: WeekSummary['sleep'] = null;
    if (x.sleepMs.size) {
      const src = [...x.sleepMs.entries()].sort((p, q) => q[1] - p[1])[0][0];
      sleep = { hours: Math.round((x.sleepMs.get(src)! / 3_600_000) * 10) / 10, nights: x.sleepDays.get(src)!.size };
    }
    out.push({
      weekStart,
      weekEnd: addDays(weekStart, 6),
      steps: steps > 0 ? steps : null,
      workouts: x.wCount ? { count: x.wCount, minutes: Math.round(x.wMin), types: [...x.wTypes.entries()].sort((p, q) => q[1] - p[1]).slice(0, 3).map(([t]) => t) } : null,
      sleep,
      restingHeartRate: x.hrN ? { avg: Math.round((x.hrSum / x.hrN) * 10) / 10, samples: x.hrN, unit: x.hrUnit } : null,
    });
  }
  return out.filter((w) => w.steps || w.workouts || w.sleep || w.restingHeartRate).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}

const tooBig = () => `This Apple Health export is over ${APPLE_HEALTH_MAX_BYTES / 1024 / 1024} MB, which is the most that can be imported here. Export a smaller range or upload only export.xml.`;

export function weekToItem(w: WeekSummary): PendingItem {
  const lines: string[] = [];
  if (w.steps != null) lines.push(`Steps: ${w.steps.toLocaleString('en-US')} steps`);
  if (w.workouts) lines.push(`Workouts: ${w.workouts.count} (${w.workouts.minutes} min${w.workouts.types.length ? `, mostly ${w.workouts.types.join(', ')}` : ''})`);
  if (w.sleep) lines.push(`Sleep: ${w.sleep.hours} hours asleep across ${w.sleep.nights} night${w.sleep.nights === 1 ? '' : 's'}`);
  if (w.restingHeartRate) lines.push(`Resting heart rate: ${w.restingHeartRate.avg} ${w.restingHeartRate.unit} average`);
  const title = `Health, week of ${w.weekStart}`;
  return {
    sourceId: `apple_health:week:${w.weekStart}`,
    type: 'apple_health_week',
    payload: {
      title,
      text: `${title} to ${w.weekEnd}\n${lines.join('\n')}`,
      week_start: w.weekStart,
      week_end: w.weekEnd,
      published_at: `${w.weekEnd}T00:00:00Z`,
      metrics: {
        steps: w.steps != null ? { value: w.steps, unit: 'steps' } : null,
        workouts: w.workouts ? { count: w.workouts.count, minutes: w.workouts.minutes, unit: 'min', types: w.workouts.types } : null,
        sleep: w.sleep ? { hours: w.sleep.hours, nights: w.sleep.nights, unit: 'hours' } : null,
        resting_heart_rate: w.restingHeartRate ? { value: w.restingHeartRate.avg, unit: w.restingHeartRate.unit, samples: w.restingHeartRate.samples } : null,
      },
    },
  };
}

/** Accepts export.zip (finds export.xml, not the ECG or route files) or a bare export.xml. */
export function parseAppleHealthExport(filename: string, data: Buffer): PendingItem[] {
  if (data.length > APPLE_HEALTH_MAX_BYTES) throw new Error(tooBig());
  let xml: Buffer | undefined;
  if (isZip(data)) {
    const files = readZip(data, (n) => /(^|\/)export\.xml$/i.test(n));
    xml = [...files.values()][0];
    if (!xml) throw new Error(`No export.xml found in the zip, or it is larger than ${APPLE_HEALTH_MAX_BYTES / 1024 / 1024} MB. Upload the zip from Health > profile > Export all health data.`);
  } else {
    xml = data;
  }
  const weeks = summariseAppleHealthXml(xml).slice(-APPLE_HEALTH_MAX_WEEKS);
  return weeks.map(weekToItem);
}

export async function importAppleHealth(
  filename: string,
  data: Buffer,
  opts: { autoPromote?: boolean; deps?: Parameters<typeof ingestItems>[0]['deps'] } = {},
): Promise<SyncResult> {
  const id = 'apple-health';
  try {
    const items = parseAppleHealthExport(filename, data);
    if (items.length === 0) return recordError(id, 'No steps, workouts, sleep or resting heart rate found. Check this is the Apple Health export (export.zip or export.xml).');
    return await ingestItems({ connectorId: id, source: 'apple_health', items, inputMode: 'upload', max: APPLE_HEALTH_MAX_WEEKS, autoPromote: opts.autoPromote, deps: opts.deps });
  } catch (err: any) {
    return recordError(id, err?.message ?? String(err));
  }
}

export const appleHealthConnector: Connector = {
  id: 'apple-health',
  label: 'Apple Health',
  category: 'device',
  kind: 'manual', // Apple offers no API; import is by file only
  requires: 'none',
  cadenceMins: 0,
  setupHint: 'Apple has no Health API. In the Health app, tap your profile, choose Export all health data, then import export.zip here (up to 50 MB).',
  configured: () => true,
  async sync(): Promise<SyncResult> {
    return { ingested: 0, skipped: 0, error: 'NOT_CONFIGURED: no API access; import your Apple Health export file (POST /api/connectors/import)' };
  },
};
