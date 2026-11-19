import { postgres } from '@/lib/db/postgres';
import { PUSH_SUB_PREFIX, parseSubscription, subscriptionKey, type PushSubscriptionJSON } from './keys';

/** Push subscriptions live in Neon `scheduler_state` under `push-sub:<hash of endpoint>`. */
export async function saveSubscription(sub: PushSubscriptionJSON): Promise<void> {
  const key = subscriptionKey(sub.endpoint);
  const value = { ...sub, savedAt: new Date().toISOString() } as any;
  await postgres.schedulerState.upsert({ where: { key }, create: { key, value }, update: { value } });
}

export async function removeSubscription(endpoint: string): Promise<void> {
  await postgres.schedulerState.deleteMany({ where: { key: subscriptionKey(endpoint) } });
}

export async function listSubscriptions(): Promise<PushSubscriptionJSON[]> {
  const rows = await postgres.schedulerState.findMany({ where: { key: { startsWith: PUSH_SUB_PREFIX } } });
  const out: PushSubscriptionJSON[] = [];
  for (const r of rows) {
    const parsed = parseSubscription(r.value);
    if (parsed.ok) out.push(parsed.subscription);
  }
  return out;
}
