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
};

export default nextConfig;
