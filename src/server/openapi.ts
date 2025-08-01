import { generateOpenApiDocument } from 'trpc-to-openapi';

import { env } from '~/env';

import { appRouter } from './api/root';

export const openApiDocument = {
  ...generateOpenApiDocument(appRouter, {
    title: 'Web3 Platform API',
    version: '0.0.1',
    baseUrl: '/api/openapi',
  }),
  servers:
    env.NODE_ENV === 'development'
      ? [
          {
            url: '/api/openapi',
            description: 'Development server for Web3 Platform',
          },
        ]
      : env.NEXT_PUBLIC_IS_MAINNET
        ? [
            {
              url: 'https://p.magickbase.com/api/openapi',
              description: 'Production server for Web3 Platform',
            },
          ]
        : [
            {
              url: 'https://preflight.magickbase.com/api/openapi',
              description: 'Test server for Web3 Platform',
            },
          ],
};
