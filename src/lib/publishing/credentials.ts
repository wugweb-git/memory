/**
 * Publishing credentials entered in the app. Secrets are AES-256-GCM encrypted
 * (MEMORY_ENCRYPTION_KEY) in Neon `scheduler_state`; ids are stored as plain text.
 * A value saved here wins over the Vercel env var of the same name, so the owner
 * can add or rotate a token without a redeploy. Values are never returned to the
 * browser: the status view only says whether a field is set and where it came from.
 */

import { postgres } from '@/lib/db/postgres';
import { encrypt, decrypt, isEncryptionConfigured } from '@/lib/memory/encryption';

export interface CredentialField {
  /** Also the env var name, so env and app values are interchangeable. */
  key: string;
  label: string;
  secret: boolean;
  required: boolean;
  help: string;
}

export interface PublishAccount {
  platform: string;
  label: string;
  note: string;
  fields: CredentialField[];
}

export const PUBLISH_ACCOUNTS: PublishAccount[] = [
  {
    platform: 'linkedin',
    label: 'LinkedIn',
    note: 'Posts as you. Needs an app with the w_member_social scope; tokens expire after about 60 days.',
    fields: [
      { key: 'LINKEDIN_ACCESS_TOKEN', label: 'Access token', secret: true, required: true, help: 'From your LinkedIn app OAuth flow.' },
      { key: 'LINKEDIN_AUTHOR_URN', label: 'Author URN', secret: false, required: false, help: 'Optional, like urn:li:person:abc123. Looked up from the token when empty.' },
    ],
  },
  {
    platform: 'x',
    label: 'X',
    note: 'Long posts become a reply thread. Needs a user-context token with tweet.write.',
    fields: [{ key: 'X_ACCESS_TOKEN', label: 'Access token', secret: true, required: true, help: 'OAuth 2.0 user access token.' }],
  },
  {
    platform: 'facebook',
    label: 'Facebook Page',
    note: 'Posts to a Page you manage.',
    fields: [
      { key: 'FACEBOOK_PAGE_TOKEN', label: 'Page access token', secret: true, required: true, help: 'A long-lived Page token.' },
      { key: 'FACEBOOK_PAGE_ID', label: 'Page ID', secret: false, required: true, help: 'The numeric Page id.' },
    ],
  },
  {
    platform: 'instagram',
    label: 'Instagram',
    note: 'Uses the Facebook Page token above. Every post needs an image.',
    fields: [{ key: 'INSTAGRAM_USER_ID', label: 'Instagram business account ID', secret: false, required: true, help: 'The numeric id linked to your Page.' }],
  },
  {
    platform: 'medium',
    label: 'Medium',
    note: 'Medium no longer issues new tokens; this only works with an existing one. Posts are drafts.',
    fields: [{ key: 'MEDIUM_INTEGRATION_TOKEN', label: 'Integration token', secret: true, required: true, help: 'Your existing Medium integration token.' }],
  },
];

/** Credentials for read-only connectors (not publishers). Stored the same way, listed separately. */
export const CONNECTOR_CREDENTIALS: CredentialField[] = [
  { key: 'ICLOUD_APPLE_ID', label: 'Apple ID', secret: false, required: true, help: 'The email address of your Apple ID.' },
  { key: 'ICLOUD_APP_PASSWORD', label: 'App-specific password', secret: true, required: true, help: 'Created at account.apple.com under Sign-In and Security. Not your Apple ID password.' },
];

const ALL_FIELDS = new Map<string, CredentialField>([
  ...PUBLISH_ACCOUNTS.flatMap((a) => a.fields.map((f) => [f.key, f] as const)),
  ...CONNECTOR_CREDENTIALS.map((f) => [f.key, f] as const),
]);
const dbKey = (key: string) => `publish-credential:${key}`;

export function isCredentialKey(key: string): boolean {
  return ALL_FIELDS.has(key);
}

type Stored = { value?: string; enc?: { content: string; iv: string; tag: string } };

function withTimeout<T>(p: Promise<T>, ms = 2000): Promise<T> {
  return Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error('TIMEOUT')), ms))]);
}

function open(row: Stored | null): string | null {
  if (!row) return null;
  if (row.enc) {
    try {
      return decrypt(row.enc);
    } catch {
      return null;
    }
  }
  return typeof row.value === 'string' && row.value ? row.value : null;
}

/** App value first, then the env var. Fails open to env if the database is unreachable. */
export async function getCredential(key: string): Promise<string | undefined> {
  if (!ALL_FIELDS.has(key)) return process.env[key];
  try {
    const row = await withTimeout(postgres.schedulerState.findUnique({ where: { key: dbKey(key) } }));
    const v = open((row?.value ?? null) as Stored | null);
    if (v) return v;
  } catch {
    /* fall back to env */
  }
  return process.env[key] || undefined;
}

export type FieldStatus = CredentialField & { source: 'app' | 'env' | null };
export type AccountStatus = Omit<PublishAccount, 'fields'> & { fields: FieldStatus[]; ready: boolean };

export async function listAccountStatus(): Promise<{ accounts: AccountStatus[]; encryptionReady: boolean }> {
  let rows: Array<{ key: string }> = [];
  try {
    rows = await withTimeout(postgres.schedulerState.findMany({ where: { key: { startsWith: 'publish-credential:' } }, select: { key: true } }));
  } catch {
    /* env-only view */
  }
  const saved = new Set(rows.map((r) => r.key.slice('publish-credential:'.length)));
  const accounts = PUBLISH_ACCOUNTS.map((a) => {
    const fields = a.fields.map((f) => ({ ...f, source: (saved.has(f.key) ? 'app' : process.env[f.key] ? 'env' : null) as 'app' | 'env' | null }));
    return { ...a, fields, ready: fields.filter((f) => f.required).every((f) => f.source !== null) };
  });
  return { accounts, encryptionReady: isEncryptionConfigured() };
}

export async function setCredential(key: string, value: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const field = ALL_FIELDS.get(key);
  if (!field) return { ok: false, error: 'Unknown credential.' };
  const v = value.trim();
  if (!v) return { ok: false, error: 'Enter a value, or use Remove.' };
  if (v.length > 4000) return { ok: false, error: 'That value is too long.' };
  let stored: Stored;
  if (field.secret) {
    if (!isEncryptionConfigured()) {
      return { ok: false, error: 'Set MEMORY_ENCRYPTION_KEY (64 hex characters) in Vercel first, so tokens can be stored encrypted.' };
    }
    stored = { enc: encrypt(v) };
  } else {
    stored = { value: v };
  }
  await postgres.schedulerState.upsert({
    where: { key: dbKey(key) },
    create: { key: dbKey(key), value: stored as any },
    update: { value: stored as any },
  });
  return { ok: true };
}

export async function clearCredential(key: string): Promise<boolean> {
  if (!ALL_FIELDS.has(key)) return false;
  await postgres.schedulerState.deleteMany({ where: { key: dbKey(key) } });
  return true;
}
