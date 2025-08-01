/* eslint-disable */

import createNextIntlPlugin from 'next-intl/plugin';
import { env } from './src/env.js';

const withNextIntl = createNextIntlPlugin();

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation. This is especially useful
 * for Docker builds.
 */
await import('./src/env.js');

/** @type {import("next").NextConfig} */
const config = {
  reactStrictMode: true,
  transpilePackages: ['geist'],
  eslint: {
    // skip eslint when docker build
    ignoreDuringBuilds: env.API_BUILD,
  },
  webpack(config, { isServer }) {
    // Grab the existing rule that handles SVG imports
    // @ts-ignore
    const fileLoaderRule = config.module.rules.find((rule) => rule.test?.test?.('.svg'));

    if (!isServer) {
      config.resolve.fallback = {
        fs: false,
      };
    }

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: { not: [...fileLoaderRule.resourceQuery.not, /url/] }, // exclude if *.svg?url
        use: ['@svgr/webpack'],
      },
      // Add support for .md files
      {
        test: /\.md$/,
        use: 'raw-loader',
      },
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.coinmarketcap.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'cryptologos.cc',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'files.magickbase.com',
        port: '',
      },
      {
        protocol: 'https',
        hostname: 'i.postimg.cc',
      },

      {
        protocol: 'https',
        hostname: 'postimg.cc',
      },
    ],
  },
  output: 'standalone',

  ...(env.NEXT_PUBLIC_TRPC_API != null
    ? {
        rewrites: async () => {
          return [
            {
              source: '/api/:path*',
              destination: `${env.NEXT_PUBLIC_TRPC_API}/api/:path*`,
            },
          ];
        },
      }
    : {}),
};

export default withNextIntl(config);
