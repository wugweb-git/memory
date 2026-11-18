/**
 * Per-platform credential env vars. A platform listed here publishes to an
 * EXTERNAL service and needs its token configured before anything is sent.
 * Platforms NOT listed (portfolio, cms) are the internal public-profile path
 * and never require an external credential.
 */
const PLATFORM_CREDENTIAL_ENV: Record<string, string> = {
  linkedin: "LINKEDIN_ACCESS_TOKEN",
  medium: "MEDIUM_INTEGRATION_TOKEN",
};

/** Platforms served by the internal profile/CMS path — no external send here. */
const INTERNAL_PLATFORMS = new Set(["portfolio", "cms"]);

export type PlatformPublishStatus =
  | "published" // real external send succeeded (token-gated branch only)
  | "internal" // handled by the internal profile/CMS path, no external send
  | "not_configured" // external platform, but no credential set — nothing sent
  | "error"; // external send was attempted but failed

export type PlatformPublishResult = {
  platform: string;
  status: PlatformPublishStatus;
  /** The external post id — only ever non-null for a real, delivered send. */
  externalId: string | null;
  /** True only when content actually reached an external platform. */
  delivered: boolean;
  /** The platform-formatted payload we were handed (echoed back, not invented). */
  payload: unknown;
  error?: string;
};

/**
 * Honest, env-gated platform dispatch.
 *
 * `payload` is the platform-formatted body built by `routeDistribution`, NOT
 * raw content. We never fabricate a `published` status or an external id: a
 * platform with no credential configured reports `not_configured` so dashboards
 * can tell nothing was actually delivered.
 */
export async function publishToPlatform(
  platform: string,
  payload: unknown,
): Promise<PlatformPublishResult> {
  // Internal profile/CMS path: the real delivery happens in publishOutput via
  // publishContentToProfile — there is no external API to hit from here.
  if (INTERNAL_PLATFORMS.has(platform)) {
    return { platform, status: "internal", externalId: null, delivered: false, payload };
  }

  const envName = PLATFORM_CREDENTIAL_ENV[platform];
  const token = envName ? process.env[envName] : undefined;

  // No credential configured → be honest. Nothing was sent anywhere, so we
  // return a non-fabricated status with a null external id (NOT a fake
  // `published`/`${platform}_${Date.now()}`).
  if (!token) {
    return { platform, status: "not_configured", externalId: null, delivered: false, payload };
  }

  // ── Real external send (token-gated) ──────────────────────────────────────
  // A credential IS configured for this platform, so a live POST to the
  // platform API belongs here, using `payload` as the request body. This branch
  // only runs when the token env var is present, so the free-tier default path
  // (no tokens set) NEVER makes an external network call. Until a real client
  // is wired up we fail honestly rather than fabricate a success.
  //
  // INTEGRATION POINT — wire the platform's real API call in here, e.g.:
  //   const res = await fetch(PLATFORM_ENDPOINT[platform], {
  //     method: "POST",
  //     headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  //     body: JSON.stringify(payload),
  //   });
  //   if (!res.ok) throw new Error(`${platform} ${res.status}`);
  //   const json = await res.json();
  //   return { platform, status: "published", externalId: String(json.id), delivered: true, payload };
  try {
    throw new Error(`NO_CLIENT: external send for ${platform} is not implemented`);
  } catch (err) {
    return {
      platform,
      status: "error",
      externalId: null,
      delivered: false,
      payload,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
