/**
 * Spotify recently-played connector. No OAuth UI: the owner creates a Spotify app and
 * obtains a refresh token once (scope user-read-recently-played), then sets
 * SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN. Each sync swaps the
 * refresh token for a short-lived access token. Honest states: NOT_CONFIGURED until set.
 */

import type { Connector, SyncResult } from '@/lib/ingestion/connectors/types';
import { ingestItems, recordError, type PendingItem } from './sync-items';

const TOKEN_URL = 'https://accounts.spotify.com/api/token';
const RECENT_URL = 'https://api.spotify.com/v1/me/player/recently-played?limit=50';

type Deps = { fetchFn?: typeof fetch; env?: NodeJS.ProcessEnv };

function creds(env: NodeJS.ProcessEnv) {
  const id = env.SPOTIFY_CLIENT_ID;
  const secret = env.SPOTIFY_CLIENT_SECRET;
  const refresh = env.SPOTIFY_REFRESH_TOKEN;
  return id && secret && refresh ? { id, secret, refresh } : null;
}

export function mapPlay(p: any): PendingItem | null {
  const t = p?.track;
  if (!t?.id || !p.played_at) return null;
  const artists = Array.isArray(t.artists) ? t.artists.map((a: any) => a?.name).filter(Boolean) : [];
  return {
    sourceId: `spotify:${t.id}:${p.played_at}`,
    type: 'spotify_play',
    payload: {
      title: `${t.name} — ${artists.join(', ')}`,
      text: `Listened to ${t.name} by ${artists.join(', ')}${t.album?.name ? ` (${t.album.name})` : ''}`,
      track: t.name,
      artists,
      album: t.album?.name ?? null,
      played_at: p.played_at,
      url: t.external_urls?.spotify ?? null,
    },
  };
}

export function makeSpotifyConnector(deps: Deps = {}): Connector {
  const env = () => deps.env ?? process.env;
  return {
    id: 'spotify',
    label: 'Spotify',
    category: 'media',
    kind: 'api',
    requires: 'env',
    cadenceMins: 360,
    setupHint: 'Create a Spotify app, get a refresh token for user-read-recently-played, and set SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET and SPOTIFY_REFRESH_TOKEN.',
    configured: () => Boolean(creds(env())),
    async sync(): Promise<SyncResult> {
      const c = creds(env());
      if (!c) return { ingested: 0, skipped: 0, error: 'NOT_CONFIGURED: set the Spotify env vars' };
      const f = deps.fetchFn ?? fetch;
      try {
        const tokenRes = await f(TOKEN_URL, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${c.id}:${c.secret}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: c.refresh }),
          signal: AbortSignal.timeout(15_000),
        });
        const token = await tokenRes.json().catch(() => ({}));
        if (!tokenRes.ok || !token?.access_token) throw new Error(`spotify token HTTP_${tokenRes.status}`);
        const res = await f(RECENT_URL, { headers: { Authorization: `Bearer ${token.access_token}` }, signal: AbortSignal.timeout(15_000) });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(`spotify recently-played HTTP_${res.status}`);
        const items = (json.items ?? []).map(mapPlay).filter(Boolean) as PendingItem[];
        return await ingestItems({ connectorId: 'spotify', source: 'spotify', items, max: 50 });
      } catch (err: any) {
        return recordError('spotify', err?.message ?? String(err));
      }
    },
  };
}

export const spotifyConnector = makeSpotifyConnector();
