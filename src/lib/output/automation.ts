import { postgres } from '../db/postgres';
import { publishContentToProfile } from '@/lib/profile/store';
import { IDENTITY_CONFIG } from '@/config/identity';

export type AutomationMode = 'webhook' | 'profile_only' | 'skipped';

export type AutomationPushResult = {
  mode: AutomationMode;
  outputId: string;
  payload: {
    event: string;
    system: string;
    data: {
      id: string;
      platform: string;
      content: string;
      user_id: string;
      timestamp: string;
    };
  };
  webhookOk?: boolean;
  profilePublished?: boolean;
  profileUsername?: string;
};

/**
 * Pushes a generated artifact to n8n when configured; otherwise syncs to the public profile.
 */
export async function pushToAutomation(
  outputId: string,
  options?: { profileUsername?: string },
): Promise<AutomationPushResult> {
  const webhookUrl = process.env.N8N_WEBHOOK_URL;
  const profileUsername = options?.profileUsername ?? IDENTITY_CONFIG.HANDLE;

  const output = await postgres.outputLog.findUnique({
    where: { id: outputId },
  });

  if (!output) {
    throw new Error('Output not found: ' + outputId);
  }

  const payload: AutomationPushResult['payload'] = {
    event: 'artifact_ready',
    system: 'Identity Prism OS',
    data: {
      id: output.id,
      platform: output.platform,
      content: String(output.content ?? ''),
      user_id: output.userId,
      timestamp: new Date().toISOString(),
    },
  };

  let mode: AutomationMode = 'skipped';
  let webhookOk: boolean | undefined;
  let profilePublished = false;

  if (webhookUrl) {
    mode = 'webhook';
    try {
      const res = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      webhookOk = res.ok;
      if (!res.ok) {
        console.error('[Automation] Webhook failed:', res.status, res.statusText);
      }
    } catch (err) {
      webhookOk = false;
      console.error('[Automation] Network error:', err);
    }
  } else {
    console.warn('[Automation] N8N_WEBHOOK_URL not set — publishing to profile instead.');
    try {
      await publishContentToProfile({
        username: profileUsername,
        userId: output.userId,
        outputId,
      });
      profilePublished = true;
      mode = 'profile_only';
    } catch (err) {
      console.error('[Automation] Profile publish fallback failed:', err);
      mode = 'skipped';
    }
  }

  await postgres.outputLog.update({
    where: { id: outputId },
    data: { status: mode === 'skipped' ? 'ready' : 'pushed' },
  });

  return {
    mode,
    outputId,
    payload,
    webhookOk,
    profilePublished,
    profileUsername: profilePublished ? profileUsername : undefined,
  };
}
