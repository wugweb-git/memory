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
  /** Extra format check. Return an error message, or null when the value is fine. */
  validate?: (value: string) => string | null;
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

const GOOGLE_ID_RE = /^[A-Za-z0-9._-]+\.apps\.googleusercontent\.com$/;
const HEX32_RE = /^[a-f0-9]{32}$/i;

/** Integration credentials (read connectors). Same store and resolution order as publishing. */
export const INTEGRATION_ACCOUNTS: PublishAccount[] = [
  {
    platform: 'notion',
    label: 'Notion',
    note: 'Reads pages shared with your internal integration. Create it at notion.so/my-integrations and share your pages with it.',
    fields: [
      {
        key: 'NOTION_TOKEN',
        label: 'Integration token',
        secret: true,
        required: true,
        help: 'The internal integration secret, starting with ntn_ or secret_.',
        validate: (v) => (v.length < 20 ? 'That token looks too short.' : null),
      },
    ],
  },
  {
    platform: 'google',
    label: 'Google (Drive, Calendar, Gmail, Tasks)',
    note: 'One OAuth client covers every Google source, Gmail included. After saving, use Connect on the Integrations page to grant access.',
    fields: [
      {
        key: 'GOOGLE_CLIENT_ID',
        label: 'OAuth client ID',
        secret: false,
        required: true,
        help: 'Ends with .apps.googleusercontent.com.',
        validate: (v) => (GOOGLE_ID_RE.test(v) ? null : 'Enter the client ID that ends with .apps.googleusercontent.com.'),
      },
      {
        key: 'GOOGLE_CLIENT_SECRET',
        label: 'OAuth client secret',
        secret: true,
        required: true,
        help: 'From the same OAuth client in Google Cloud.',
        validate: (v) => (v.length < 10 ? 'That secret looks too short.' : null),
      },
    ],
  },
  {
    platform: 'spotify',
    label: 'Spotify',
    note: 'Reads recently played tracks. Needs a refresh token with the user-read-recently-played scope.',
    fields: [
      {
        key: 'SPOTIFY_CLIENT_ID',
        label: 'Client ID',
        secret: false,
        required: true,
        help: 'The 32 character client id of your Spotify app.',
        validate: (v) => (HEX32_RE.test(v) ? null : 'Enter the 32 character client id.'),
      },
      {
        key: 'SPOTIFY_CLIENT_SECRET',
        label: 'Client secret',
        secret: true,
        required: true,
        help: 'The 32 character client secret of the same app.',
        validate: (v) => (HEX32_RE.test(v) ? null : 'Enter the 32 character client secret.'),
      },
      {
        key: 'SPOTIFY_REFRESH_TOKEN',
        label: 'Refresh token',
        secret: true,
        required: true,
        help: 'Obtained once through the Spotify authorization code flow.',
        validate: (v) => (v.length < 20 ? 'That token looks too short.' : null),
      },
    ],
  },
];

/** Credentials for read-only connectors (not publishers). Stored the same way, listed separately. */
export const CONNECTOR_CREDENTIALS: CredentialField[] = [
  { key: 'ICLOUD_APPLE_ID', label: 'Apple ID', secret: false, required: true, help: 'The email address of your Apple ID.' },
  { key: 'ICLOUD_APP_PASSWORD', label: 'App-specific password', secret: true, required: true, help: 'Created at account.apple.com under Sign-In and Security. Not your Apple ID password.' },
];

const ALL_FIELDS = new Map<string, CredentialField>([
  ...[...PUBLISH_ACCOUNTS, ...INTEGRATION_ACCOUNTS].flatMap((a) => a.fields.map((f) => [f.key, f] as const)),
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

export type FieldStatus = Omit<CredentialField, 'validate'> & { source: 'app' | 'env' | null; hint: string | null };
export type AccountStatus = Omit<PublishAccount, 'fields'> & { fields: FieldStatus[]; ready: boolean };

/** Last 4 characters, and only for values long enough that this reveals nothing useful. */
export function lastFour(value: string | null | undefined): string | null {
  return value && value.length >= 12 ? value.slice(-4) : null;
}

async function statusFor(groups: PublishAccount[]): Promise<{ accounts: AccountStatus[]; encryptionReady: boolean }> {
  let rows: Array<{ key: string; value: unknown }> = [];
  try {
    rows = await withTimeout(postgres.schedulerState.findMany({ where: { key: { startsWith: 'publish-credential:' } } }));
  } catch {
    /* env-only view */
  }
  const saved = new Map(rows.map((r) => [r.key.slice('publish-credential:'.length), open((r.value ?? null) as Stored | null)] as const));
  const accounts = groups.map((a) => {
    const fields: FieldStatus[] = a.fields.map(({ validate: _v, ...f }) => {
      const source = saved.has(f.key) ? 'app' : process.env[f.key] ? 'env' : null;
      const value = source === 'app' ? saved.get(f.key) : source === 'env' ? process.env[f.key] : null;
      return { ...f, source, hint: lastFour(value) };
    });
    return { ...a, fields, ready: fields.filter((f) => f.required).every((f) => f.source !== null) };
  });
  return { accounts, encryptionReady: isEncryptionConfigured() };
}

/** Publishing accounts: which fields are set and where from. Never returns values. */
export function listAccountStatus() {
  return statusFor(PUBLISH_ACCOUNTS);
}

/** Integration credentials (Notion, Google, Spotify). Never returns values. */
export function listIntegrationStatus() {
  return statusFor(INTEGRATION_ACCOUNTS);
}

// ── Sync cache ───────────────────────────────────────────────────────────────
// Connector `configured()` checks are synchronous, so saved values are loaded into a
// small cache by `primeCredentials()` at the start of a request (same pattern as
// connectors/config.ts). Resolution is stored value first, then the env var.

const cache = new Map<string, string>();
let primedAt = 0;
const CACHE_TTL_MS = 15_000;

export async function primeCredentials(force = false): Promise<void> {
  if (!force && Date.now() - primedAt < CACHE_TTL_MS) return;
  try {
    const rows = await withTimeout(postgres.schedulerState.findMany({ where: { key: { startsWith: 'publish-credential:' } } }));
    cache.clear();
    for (const r of rows) {
      const key = r.key.slice('publish-credential:'.length);
      const v = ALL_FIELDS.has(key) ? open((r.value ?? null) as Stored | null) : null;
      if (v) cache.set(key, v);
    }
    primedAt = Date.now();
  } catch {
    /* keep the previous cache; env fallback still applies */
  }
}

/** Stored value first, env var second. Call primeCredentials() earlier in the request. */
export function getCredentialSync(key: string): string | undefined {
  return cache.get(key) || process.env[key] || undefined;
}

/** Test helper: reset the cache. */
export function resetCredentialCache(): void {
  cache.clear();
  primedAt = 0;
}

export async function setCredential(key: string, value: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const field = ALL_FIELDS.get(key);
  if (!field) return { ok: false, error: 'Unknown credential.' };
  const v = value.trim();
  if (!v) return { ok: false, error: 'Enter a value, or use Remove.' };
  if (v.length > 4000) return { ok: false, error: 'That value is too long.' };
  if (/[\s\u0000-\u001f]/.test(v)) return { ok: false, error: 'Remove spaces and line breaks from the value.' };
  const invalid = field.validate?.(v);
  if (invalid) return { ok: false, error: invalid };
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
  cache.set(key, v);
  return { ok: true };
}

export async function clearCredential(key: string): Promise<boolean> {
  if (!ALL_FIELDS.has(key)) return false;
  await postgres.schedulerState.deleteMany({ where: { key: dbKey(key) } });
  cache.delete(key);
  return true;
}
