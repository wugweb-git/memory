import { IDENTITY_CONFIG } from '@/config/identity';

type IntegrationStatus = 'Synced' | 'Indexing' | 'Idle' | 'Error';

export type IntegrationHealth = {
  status: IntegrationStatus;
  last_sync: string;
  metric: string;
};

const PLATFORM_DEFAULTS: Record<string, { url: string; label: string }> = {
  github: { url: IDENTITY_CONFIG.GITHUB_URL, label: 'GitHub' },
  linkedin: { url: IDENTITY_CONFIG.LINKEDIN_URL, label: 'LinkedIn' },
  youtube: { url: IDENTITY_CONFIG.YOUTUBE_URL, label: 'YouTube' },
  behance: { url: IDENTITY_CONFIG.BEHANCE_URL, label: 'Behance' },
  dribbble: { url: IDENTITY_CONFIG.DRIBBBLE_URL, label: 'Dribbble' },
  twitter: { url: IDENTITY_CONFIG.TWITTER_URL, label: 'Twitter' },
  portfolio: { url: IDENTITY_CONFIG.PORTFOLIO_URL, label: 'Portfolio' },
};

function mapAuthStatus(authStatus: string): IntegrationStatus {
  const s = authStatus.toLowerCase();
  if (s === 'connected') return 'Synced';
  if (s === 'failed') return 'Error';
  if (s === 'indexing') return 'Indexing';
  return 'Idle';
}

function formatLastSync(date: Date | null | undefined): string {
  if (!date) return '—';
  const mins = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function integrationsFromSources(
  sources: Array<{
    name: string;
    auth_status: string;
    last_sync: Date | null;
    trust_score: number;
  }>,
): Record<string, IntegrationHealth> {
  const out: Record<string, IntegrationHealth> = {};

  for (const source of sources) {
    const key = source.name.toLowerCase().replace(/\s+/g, '_');
    out[key] = {
      status: mapAuthStatus(source.auth_status),
      last_sync: formatLastSync(source.last_sync),
      metric: `trust ${Math.round(source.trust_score * 100)}%`,
    };
  }

  for (const [key, meta] of Object.entries(PLATFORM_DEFAULTS)) {
    if (!out[key]) {
      out[key] = { status: 'Idle', last_sync: '—', metric: meta.label };
    }
  }

  return out;
}

export { PLATFORM_DEFAULTS };
