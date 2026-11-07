import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MERIFLORIST_BUILD_DIR || '.next',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    localPatterns: [{ pathname: '/uploads/**' }, { pathname: '/brand/**' }],
    minimumCacheTTL: 2592000, // 30 дней
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
