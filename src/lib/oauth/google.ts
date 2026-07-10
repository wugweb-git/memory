/**
 * Google OAuth2 (read-only) — authorization-code flow with refresh.
 *
 * Tokens live in the Neon `scheduler_state` KV (key `oauth:google`), same
 * pattern as connector state — no schema migration. Everything here is inert
 * until GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET are set, so it adds zero risk
 * to existing flows.
 */

import { randomUUID } from 'node:crypto';
import { postgres } from '@/lib/db/postgres';

const TOKEN_KEY = 'oauth:google';
const STATE_KEY = 'oauth:google:state';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';

/** Read-only Drive metadata + Calendar. */
export const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/drive.metadata.readonly',
  'https://www.googleapis.com/auth/calendar.readonly',
  'openid',
  'email',
];

export interface GoogleTokens {
  access_token: string;
  refresh_token?: string;
  /** epoch ms when access_token expires */
  expiry: number;
  scope?: string;
  token_type?: string;
}

export function googleClientConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

export function googleRedirectUri(origin: string): string {
  return process.env.GOOGLE_REDIRECT_URI || `${origin}/api/oauth/google/callback`;
}

// ── token store ────────────────────────────────────────────────────────────

async function readTokens(): Promise<GoogleTokens | null> {
  try {
    const row = await postgres.schedulerState.findUnique({ where: { key: TOKEN_KEY } });
    return (row?.value as unknown as GoogleTokens) ?? null;
  } catch {
    return null;
  }
}

async function writeTokens(tokens: GoogleTokens): Promise<void> {
  await postgres.schedulerState.upsert({
    where: { key: TOKEN_KEY },
    create: { key: TOKEN_KEY, value: tokens as any },
    update: { value: tokens as any },
  });
}

export async function googleConnected(): Promise<boolean> {
  const t = await readTokens();
  return Boolean(t?.refresh_token || (t?.access_token && t.expiry > Date.now()));
}

export async function disconnectGoogle(): Promise<void> {
  try {
    await postgres.schedulerState.deleteMany({ where: { key: TOKEN_KEY } });
  } catch {
    /* noop */
  }
}

// ── auth flow ────────────────────────────────────────────────────────────────

/** Build the consent URL and persist a one-time CSRF state. */
export async function buildGoogleAuthUrl(origin: string, returnTo = '/integrations'): Promise<string> {
  const state = randomUUID();
  await postgres.schedulerState.upsert({
    where: { key: STATE_KEY },
    create: { key: STATE_KEY, value: { state, returnTo, at: Date.now() } as any },
    update: { value: { state, returnTo, at: Date.now() } as any },
  });

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: googleRedirectUri(origin),
    response_type: 'code',
    scope: GOOGLE_SCOPES.join(' '),
    access_type: 'offline', // request a refresh_token
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params.toString()}`;
}

/** Validate the returned CSRF state; returns the stored returnTo or null. */
export async function consumeGoogleState(state: string | null): Promise<{ ok: boolean; returnTo: string }> {
  const fallback = '/integrations';
  if (!state) return { ok: false, returnTo: fallback };
  try {
    const row = await postgres.schedulerState.findUnique({ where: { key: STATE_KEY } });
    const stored = row?.value as { state?: string; returnTo?: string; at?: number } | undefined;
    await postgres.schedulerState.deleteMany({ where: { key: STATE_KEY } });
    if (!stored?.state || stored.state !== state) return { ok: false, returnTo: fallback };
    // 10-minute validity window.
    if (!stored.at || Date.now() - stored.at > 600_000) return { ok: false, returnTo: fallback };
    return { ok: true, returnTo: stored.returnTo || fallback };
  } catch {
    return { ok: false, returnTo: fallback };
  }
}

/** Exchange an auth code for tokens and store them. */
export async function exchangeGoogleCode(code: string, origin: string): Promise<void> {
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: googleRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || 'token exchange failed');

  await writeTokens({
    access_token: json.access_token,
    refresh_token: json.refresh_token,
    expiry: Date.now() + (Number(json.expires_in) || 3600) * 1000,
    scope: json.scope,
    token_type: json.token_type,
  });
}

/** Refresh the access token using the stored refresh_token. */
async function refreshAccessToken(tokens: GoogleTokens): Promise<GoogleTokens> {
  if (!tokens.refresh_token) throw new Error('GOOGLE_NOT_CONNECTED: no refresh token');
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: tokens.refresh_token,
      grant_type: 'refresh_token',
    }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error_description || json.error || 'token refresh failed');

  const refreshed: GoogleTokens = {
    access_token: json.access_token,
    refresh_token: tokens.refresh_token, // Google omits it on refresh
    expiry: Date.now() + (Number(json.expires_in) || 3600) * 1000,
    scope: json.scope ?? tokens.scope,
    token_type: json.token_type ?? tokens.token_type,
  };
  await writeTokens(refreshed);
  return refreshed;
}

/** Get a valid access token, refreshing if it is expired or near-expiry. */
async function getAccessToken(): Promise<string> {
  if (!googleClientConfigured()) throw new Error('GOOGLE_NOT_CONFIGURED: set GOOGLE_CLIENT_ID/SECRET');
  let tokens = await readTokens();
  if (!tokens) throw new Error('GOOGLE_NOT_CONNECTED: complete the OAuth flow first');
  // Refresh 60s before expiry.
  if (tokens.expiry - Date.now() < 60_000) {
    tokens = await refreshAccessToken(tokens);
  }
  return tokens.access_token;
}

/** Authenticated GET against a Google API, with one retry after a 401 refresh. */
export async function googleApiGet<T = any>(url: string): Promise<T> {
  const token = await getAccessToken();
  let res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    const tokens = await readTokens();
    if (tokens) {
      const refreshed = await refreshAccessToken(tokens);
      res = await fetch(url, { headers: { Authorization: `Bearer ${refreshed.access_token}` } });
    }
  }
  const json = await res.json();
  if (!res.ok) throw new Error(json.error?.message || json.error || `Google API ${res.status}`);
  return json as T;
}
