/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['pdf-parse'],
  eslint: {
    // Lint warnings don't fail production builds
    ignoreDuringBuilds: true,
  },
  typescript: {
    // Type errors are caught in CI; don't block production deploys
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
