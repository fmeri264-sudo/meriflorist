import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  distDir: process.env.MERIFLORIST_BUILD_DIR || '.next',
  images: {
    remotePatterns: [{ protocol: 'https', hostname: '**' }],
    localPatterns: [{ pathname: '/uploads/**' }],
    minimumCacheTTL: 2592000, // 30 дней
    formats: ['image/avif', 'image/webp'],
  },
};

export default nextConfig;
