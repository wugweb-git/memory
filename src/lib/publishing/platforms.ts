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
  // Only reached when the platform's credential env var is set.
  try {
    const sent =
      platform === "medium"
        ? await sendMedium(token, payload)
        : platform === "linkedin"
          ? await sendLinkedIn(token, payload)
          : null;
    if (!sent) throw new Error(`NO_CLIENT: external send for ${platform} is not implemented`);
    return { platform, status: "published", externalId: sent.id, delivered: true, payload };
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

const SEND_TIMEOUT_MS = 15_000;

/** The router wraps platform bodies as `{ platform, payload }`; unwrap to the body. */
function innerPayload(payload: unknown): unknown {
  return payload && typeof payload === "object" && "payload" in payload
    ? (payload as { payload: unknown }).payload
    : payload;
}

async function httpJson(url: string, init: RequestInit): Promise<{ res: Response; json: any }> {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(SEND_TIMEOUT_MS) });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail = json?.errors?.[0]?.message ?? json?.message ?? "";
    throw new Error(`HTTP_${res.status}${detail ? `: ${String(detail).slice(0, 160)}` : ""}`);
  }
  return { res, json };
}

/** Medium: creates a post as a draft unless MEDIUM_PUBLISH_STATUS=public. */
async function sendMedium(token: string, payload: unknown): Promise<{ id: string }> {
  const body = innerPayload(payload) as { title?: string; content?: string; tags?: string[] };
  if (!body || typeof body.content !== "string" || !body.content.trim()) throw new Error("EMPTY_CONTENT");
  const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" };
  const me = await httpJson("https://api.medium.com/v1/me", { headers });
  const userId = me.json?.data?.id;
  if (!userId) throw new Error("MEDIUM_NO_USER");
  const status = process.env.MEDIUM_PUBLISH_STATUS === "public" ? "public" : "draft";
  const { json } = await httpJson(`https://api.medium.com/v1/users/${userId}/posts`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      title: body.title || "Untitled",
      contentFormat: "markdown",
      content: body.content,
      tags: (body.tags ?? []).slice(0, 5),
      publishStatus: status,
    }),
  });
  const id = json?.data?.id;
  if (!id) throw new Error("MEDIUM_NO_ID");
  return { id: String(id) };
}

/** Default LinkedIn versioned-API month (YYYYMM); override with LINKEDIN_API_VERSION. */
const LINKEDIN_DEFAULT_VERSION = "202511";

/** LinkedIn: text post via the versioned Posts API. Author = LINKEDIN_AUTHOR_URN or the token's own member id. */
async function sendLinkedIn(token: string, payload: unknown): Promise<{ id: string }> {
  const text = innerPayload(payload);
  if (typeof text !== "string" || !text.trim()) throw new Error("EMPTY_CONTENT");
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "X-Restli-Protocol-Version": "2.0.0",
    "LinkedIn-Version": process.env.LINKEDIN_API_VERSION || LINKEDIN_DEFAULT_VERSION,
  };
  let author = process.env.LINKEDIN_AUTHOR_URN;
  if (!author) {
    const me = await httpJson("https://api.linkedin.com/v2/userinfo", { headers });
    if (!me.json?.sub) throw new Error("LINKEDIN_NO_USER");
    author = `urn:li:person:${me.json.sub}`;
  }
  const { res } = await httpJson("https://api.linkedin.com/rest/posts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      author,
      commentary: text.slice(0, 3000),
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      lifecycleState: "PUBLISHED",
      isReclosedByOwner: false,
    }),
  });
  // The Posts API returns 201 with an empty body; the id is only in the header.
  const id = res.headers.get("x-restli-id");
  if (!id) throw new Error("LINKEDIN_NO_ID");
  return { id: String(id) };
}
