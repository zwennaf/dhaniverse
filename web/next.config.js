/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'export',
  eslint: {
    // Disable running ESLint during `next build` / `next export`.
    // This prevents linting from blocking production builds.
    ignoreDuringBuilds: true,
  },
}

module.exports = nextConfig;
