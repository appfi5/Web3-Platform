import 'server-only';

import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createServerSideHelpers } from '@trpc/react-query/server';
import superjson from 'superjson';

import { type AppRouter } from '~/server/api/root';

import { getBaseUrl } from './base-url';

const proxyClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${getBaseUrl()}/api/trpc`,
      transformer: superjson,
      maxItems: 10,
    }),
  ],
});
const api = createServerSideHelpers({
  client: proxyClient,
});

export { api };
