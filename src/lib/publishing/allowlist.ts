import { OUTPUT_PLATFORMS } from '@/config/ui-content';
import { MANUAL_PLATFORMS } from '@/lib/platforms/manual';

/** Internal / non-UI targets that are valid for scheduling (not offered as Content-page choices). */
const INTERNAL_TARGETS = ['cms', 'email-digest', 'export-api'] as const;

/**
 * Every platform the schedule endpoint accepts: what the Content page offers
 * (OUTPUT_PLATFORMS) + the manual platforms + the internal targets. Derived,
 * so a platform added to the UI list can never be rejected by the API.
 */
export const SCHEDULABLE_PLATFORMS: ReadonlySet<string> = new Set<string>([
  ...OUTPUT_PLATFORMS.map((p) => p.value),
  ...Object.keys(MANUAL_PLATFORMS),
  ...INTERNAL_TARGETS,
]);

export function isSchedulablePlatform(platform: unknown): platform is string {
  return typeof platform === 'string' && SCHEDULABLE_PLATFORMS.has(platform);
}
