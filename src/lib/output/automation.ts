import { postgres } from '../db/postgres';
import { publishContentToProfile } from '@/lib/profile/store';
import { IDENTITY_CONFIG } from '@/config/identity';
import { createGeneratedOutput } from '@/lib/cms/queries';
import { routeDistribution } from '@/lib/distribution/router';
import { publishNow } from '@/lib/publishing/publisher';

export type PublishMode = 'published' | 'skipped' | 'duplicate';

export type PublishResult = {
  mode: PublishMode;
  outputId: string;
  platform: string;
  /** Platform-formatted distribution payload (from the platform adapter). */
  payload: unknown;
  platformResult?: { platform: string; status: string; externalId: string };
  profilePublished: boolean;
  profileUsername?: string;
  sanitySynced: boolean;
};

/**
 * Publishes a generated artifact directly — no external automation hop.
 *
 * Flow: outputLog → distribution routing (platform adapter formatting) →
 * platform publish record → public profile → Sanity `generatedOutput` mirror.
 */
export async function publishOutput(
  outputId: string,
  options?: { profileUsername?: string },
): Promise<PublishResult> {
  const profileUsername = options?.profileUsername ?? IDENTITY_CONFIG.HANDLE;

  const output = await postgres.outputLog.findUnique({
    where: { id: outputId },
  });

  if (!output) {
    throw new Error('Output not found: ' + outputId);
  }

  const content = String(output.content ?? '');

  // Idempotency: if this output already has a published record, don't publish
  // it again (prevents duplicate profile sections from queue retries).
  const already = await (postgres as any).publishedOutput.findFirst({
    where: { outputId },
    select: { id: true },
  });
  if (already) {
    return {
      mode: 'duplicate',
      outputId,
      platform: output.platform,
      payload: null,
      profilePublished: false,
      sanitySynced: false,
    };
  }

  // Distribution: apply platform-specific formatting via the platform adapters.
  // A bad/unsupported platform is logged but does not abort the publish.
  let payload: unknown = null;
  let platformResult: PublishResult['platformResult'];
  try {
    payload = routeDistribution({ platform: output.platform, content });
    platformResult = await publishNow({ platform: output.platform, content });
  } catch (err) {
    console.error('[Publish] Distribution routing failed:', err);
  }

  // Direct publish to the public profile (the functional publish target today).
  let profilePublished = false;
  try {
    await publishContentToProfile({
      username: profileUsername,
      userId: output.userId,
      outputId,
    });
    profilePublished = true;
  } catch (err) {
    console.error('[Publish] Profile publish failed:', err);
  }

  const mode: PublishMode = profilePublished ? 'published' : 'skipped';

  await postgres.outputLog.update({
    where: { id: outputId },
    data: { status: mode === 'published' ? 'pushed' : 'ready' },
  });

  // Mirror the artifact into Sanity as a generatedOutput doc (best-effort;
  // no-op when Sanity isn't configured — never blocks publishing).
  let sanitySynced = false;
  if (mode === 'published') {
    try {
      const doc = await createGeneratedOutput({
        title: `${output.platform} — ${output.id.slice(0, 8)}`,
        platform: output.platform,
        content,
        status: 'published',
        sourceDecisionId: output.decisionId ?? undefined,
      });
      sanitySynced = Boolean(doc);
    } catch (err) {
      console.error('[Publish] Sanity sync failed:', err);
    }
  }

  return {
    mode,
    outputId,
    platform: output.platform,
    payload,
    platformResult,
    profilePublished,
    profileUsername: profilePublished ? profileUsername : undefined,
    sanitySynced,
  };
}
