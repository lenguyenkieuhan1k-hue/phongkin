/** @type {import('next').NextConfig} */
const nextConfig = {
  // Standalone output (Docker-friendly, smaller image)
  output: 'standalone',

  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.r2.cloudflarestorage.com',
      },
      {
        protocol: 'https',
        hostname: '**.r2.dev',
      },
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },

  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'prisma'],
  },

  // Skip type checking during build (faster; we check via tsc separately)
  typescript: {
    ignoreBuildErrors: false,
  },
};

module.exports = nextConfig;
