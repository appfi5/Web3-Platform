import { env } from '~/env';

export function getBaseUrl() {
  if (env.NEXT_PUBLIC_TRPC_API) return env.NEXT_PUBLIC_TRPC_API.replace(/\/+$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return `http://localhost:${process.env.PORT ?? 3000}`;
}
