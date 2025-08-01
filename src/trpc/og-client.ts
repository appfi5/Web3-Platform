import { createTRPCClient, httpBatchStreamLink, loggerLink } from '@trpc/client';
import SuperJSON from 'superjson';

import { type AppRouter } from '~/server/api/root';

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_TRPC_API) return process.env.NEXT_PUBLIC_TRPC_API.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}

export const api = createTRPCClient<AppRouter>({
  links: [
    loggerLink({
      enabled: (op) =>
        process.env.NODE_ENV === 'development' || (op.direction === 'down' && op.result instanceof Error),
    }),
    httpBatchStreamLink({
      transformer: SuperJSON,
      url: getBaseUrl() + '/api/trpc',
      headers: () => {
        const headers = new Headers();
        headers.set('x-trpc-source', 'nextjs-react');
        return headers;
      },
    }),
  ],
});
