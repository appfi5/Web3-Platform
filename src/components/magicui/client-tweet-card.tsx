'use client';

import { type TweetProps, useTweet } from 'react-tweet';

import { MagicTweet, TweetNotFound, TweetSkeleton } from './tweet-card';

export const ClientTweetCard = ({
  id,
  apiUrl,
  fallback = <TweetSkeleton />,
  components,
  fetchOptions,
  onError,
  ...props
}: TweetProps & { className?: string; reaction: Record<'like' | 'dislike', number> }) => {
  /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
  const { data, error, isLoading } = useTweet(id, apiUrl, fetchOptions);

  if (isLoading) return fallback;
  if (error ?? !data) {
    const NotFound = components?.TweetNotFound ?? TweetNotFound;
    if (error instanceof Error) {
      /* eslint-disable-next-line @typescript-eslint/no-unsafe-assignment */
      return <NotFound error={onError?.(error) ?? error} />;
    }
    return null;
  }

  return <MagicTweet components={components} tweet={data} {...props} />;
};
