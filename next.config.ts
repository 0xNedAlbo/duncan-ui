import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    domains: [
      'static.alchemyapi.io',
      'assets.coingecko.com',
      'cdn.jsdelivr.net',
      'raw.githubusercontent.com',
      'tokens.1inch.io'
    ],
  },
  webpack: (config, { isServer }) => {
    // Fix for RainbowKit and wagmi ESM issues with Next.js 15
    config.externals.push('pino-pretty', 'lokijs', 'encoding');

    // Exclude server-only packages from client bundle
    if (!isServer) {
      config.externals.push('@node-rs/argon2');
    }

    // Handle ESM modules properly
    config.resolve.extensionAlias = {
      '.js': ['.js', '.ts', '.tsx'],
    };

    // Fix for RainbowKit vendor chunk issues
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
      };
    }

    return config;
  },
};

export default nextConfig;
