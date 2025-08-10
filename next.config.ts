import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Next.js 15 moved this option out of experimental
  serverExternalPackages: ['better-sqlite3'],
};

export default nextConfig;
