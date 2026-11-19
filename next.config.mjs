/** @type {import('next').NextConfig} */

// Deterministic build id per deploy (Vercel provides the commit SHA). Exposing
// it as NEXT_PUBLIC_BUILD_ID lets the client tag telemetry to a version, and a
// stable generateBuildId keeps chunk hashes consistent within a deploy.
const buildId = process.env.VERCEL_GIT_COMMIT_SHA || undefined;

const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pdf-parse'],
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId || 'dev',
  },
  ...(buildId ? { generateBuildId: async () => buildId } : {}),
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'Content-Security-Policy', value: "frame-ancestors 'none'" },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=(), payment=()' },
        ],
      },
    ];
  },
};

export default nextConfig;
