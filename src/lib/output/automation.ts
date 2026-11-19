import { postgres } from '../db/postgres';
import { publishContentToProfile } from '@/lib/profile/store';
import { IDENTITY_CONFIG } from '@/config/identity';
import { createGeneratedOutput } from '@/lib/cms/queries';
import { routeDistribution } from '@/lib/distribution/router';
import { publishNow } from '@/lib/publishing/publisher';
import type { PlatformPublishResult } from '@/lib/publishing/platforms';
import { buildDeliveryRecord } from '@/lib/publishing/delivery';

export type PublishMode = 'published' | 'skipped' | 'duplicate';

export type PublishResult = {
  mode: PublishMode;
  outputId: string;
  platform: string;
  /** Platform-formatted distribution payload (from the platform adapter). */
  payload: unknown;
  /**
   * Result of the platform dispatch. `status` is no longer always 'published'
   * — an unconfigured external platform reports 'not_configured' with a null
   * externalId and delivered:false, rather than a fabricated success.
   */
  platformResult?: PlatformPublishResult;
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

  // Distribution: apply platform-specific formatting, then send externally.
  // This runs AFTER the profile publish: publishContentToProfile writes the
  // published_outputs row that the idempotency check above relies on, so a
  // queue retry can never re-send to an external platform that already accepted
  // the post. A bad/unsupported platform is logged but does not abort the publish.
  let payload: unknown = null;
  let platformResult: PublishResult['platformResult'];
  try {
    payload = routeDistribution({ platform: output.platform, content });
    if (profilePublished) {
      // Thread the BUILT payload through to the platform dispatch (not raw content).
      platformResult = await publishNow({ platform: output.platform, content, payload });
      if (platformResult?.status === 'error') {
        console.error(`[Publish] External send to ${output.platform} failed for ${outputId}: ${platformResult.error}`);
      }
    }
  } catch (err) {
    console.error('[Publish] Distribution routing failed:', err);
    // A throw from the external send must still be visible to the owner (no retry).
    if (profilePublished && !platformResult) {
      platformResult = {
        platform: output.platform,
        status: 'error',
        externalId: null,
        delivered: false,
        payload,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }

  // Persist the external delivery outcome so the owner can see a failed or
  // unconfigured send. Stored under `delivery` in the existing Json column
  // published_outputs.published_content. Never retried automatically (a retry
  // could create a duplicate public post).
  if (platformResult) {
    try {
      const row = await (postgres as any).publishedOutput.findFirst({
        where: { outputId },
        select: { id: true, publishedContent: true },
      });
      if (row) {
        const prev =
          row.publishedContent && typeof row.publishedContent === 'object' && !Array.isArray(row.publishedContent)
            ? row.publishedContent
            : {};
        await (postgres as any).publishedOutput.update({
          where: { id: row.id },
          data: { publishedContent: { ...prev, delivery: buildDeliveryRecord(platformResult) } },
        });
      }
    } catch (err) {
      console.error('[Publish] Could not record delivery outcome:', err);
    }
  }


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

  // Automation rules: best-effort; failures never fail a publish and waiting is capped at 8s.
  if (mode === 'published') {
    try {
      const { evaluateRules } = await import('@/lib/automation/rules');
      // Bounded so a slow workflow cannot stall the publishing queue past its function budget.
      await Promise.race([
        evaluateRules(output.userId, { type: 'output_published', platform: output.platform, content, outputId }),
        new Promise((resolve) => setTimeout(resolve, 8_000)),
      ]);
    } catch (err) {
      console.error('[Publish] Automation rules failed:', err);
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
