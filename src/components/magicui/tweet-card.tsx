/* eslint-disable-next-line simple-import-sort/imports */
import { Suspense } from 'react';

import dayjs from 'dayjs';
import isToday from 'dayjs/plugin/isToday';
import { ArrowDownIcon, ArrowUpIcon } from 'lucide-react';

import { enrichTweet, type EnrichedTweet, type TweetProps, type TwitterComponents } from 'react-tweet';
import { getTweet, type Tweet } from 'react-tweet/api';

import { cn } from '~/lib/utils';

import XLogo from './x.svg';

dayjs.extend(isToday);

interface TwitterIconProps {
  className?: string;
  [key: string]: unknown;
}

// TODO: now there are more types of verified icons

const Verified = ({ className, ...props }: TwitterIconProps) => (
  <svg aria-label="Verified Account" className={className} viewBox="0 0 24 24" {...props}>
    <g fill="currentColor">
      <path d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.6.154-.435.238-.905.238-1.4 0-2.21-1.71-3.998-3.818-3.998-.47 0-.92.084-1.336.25C14.818 2.415 13.51 1.5 12 1.5s-2.816.917-3.437 2.25c-.415-.165-.866-.25-1.336-.25-2.11 0-3.818 1.79-3.818 4 0 .494.083.964.237 1.4-1.272.65-2.147 2.018-2.147 3.6 0 1.495.782 2.798 1.942 3.486-.02.17-.032.34-.032.514 0 2.21 1.708 4 3.818 4 .47 0 .92-.086 1.335-.25.62 1.334 1.926 2.25 3.437 2.25 1.512 0 2.818-.916 3.437-2.25.415.163.865.248 1.336.248 2.11 0 3.818-1.79 3.818-4 0-.174-.012-.344-.033-.513 1.158-.687 1.943-1.99 1.943-3.484zm-6.616-3.334l-4.334 6.5c-.145.217-.382.334-.625.334-.143 0-.288-.04-.416-.126l-.115-.094-2.415-2.415c-.293-.293-.293-.768 0-1.06s.768-.294 1.06 0l1.77 1.767 3.825-5.74c.23-.345.696-.436 1.04-.207.346.23.44.696.21 1.04z" />
    </g>
  </svg>
);

const ReactionButton = ({ id, action }: { id: string; action: 'like' | 'dislike' }) => {
  if (!id) return null;
  switch (action) {
    case 'like': {
      return (
        <button
          className="relative w-1/2 h-[40px] bg-[#17B830] mask-like-reaction rounded-l-lg"
          data-action="like"
          data-id={id}
        >
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white font-bold">
            <ArrowUpIcon className="w-4 h-4" />
            Positive
          </span>
          <style>
            {`
          .mask-like-reaction {
            -webkit-mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 158 40" fill="none"><path d="M0 8C0 3.58172 3.58172 0 8 0H149.505C155.801 0 159.63 6.93699 156.273 12.2643L141.153 36.2643C139.689 38.5895 137.133 40 134.385 40H8.00001C3.58173 40 0 36.4183 0 32V8Z" fill="white"/></svg>') no-repeat center / cover;
            mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 158 40" fill="none"><path d="M0 8C0 3.58172 3.58172 0 8 0H149.505C155.801 0 159.63 6.93699 156.273 12.2643L141.153 36.2643C139.689 38.5895 137.133 40 134.385 40H8.00001C3.58173 40 0 36.4183 0 32V8Z" fill="white"/></svg>') no-repeat center / cover;
          }
        `}
          </style>
        </button>
      );
    }
    case 'dislike': {
      return (
        <button
          className="relative w-1/2 h-[40px] bg-[#FF2929] mask-dislike-reaction rounded-r-lg"
          data-action="dislike"
          data-id={id}
        >
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white font-bold">
            <ArrowDownIcon className="w-4 h-4" />
            Negative
          </span>
          <style>
            {`
          .mask-dislike-reaction {
            -webkit-mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 158 40" fill="none"><path d="M158 32C158 36.4183 154.418 40 150 40H8.12952C1.91116 40 -1.92973 33.2162 1.26958 27.884L15.6696 3.88404C17.1154 1.47439 19.7194 0 22.5295 0H150C154.418 0 158 3.58172 158 8V32Z" fill="white"/></svg>') no-repeat center / cover;
            mask: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 158 40" fill="none"><path d="M158 32C158 36.4183 154.418 40 150 40H8.12952C1.91116 40 -1.92973 33.2162 1.26958 27.884L15.6696 3.88404C17.1154 1.47439 19.7194 0 22.5295 0H150C154.418 0 158 3.58172 158 8V32Z" fill="white"/></svg>') no-repeat center / cover;
          }
        `}
          </style>
        </button>
      );
    }
    default: {
      return null;
    }
  }
};

export const truncate = (str: string | null, length: number) => {
  if (!str || str.length <= length) return str;
  return `${str.slice(0, length - 3)}...`;
};

const Skeleton = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => {
  return <div className={cn('rounded-md bg-primary/10', className)} {...props} />;
};

export const TweetSkeleton = ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
  <div className={cn('flex size-full max-h-max min-w-72 flex-col gap-2 rounded-lg border p-4', className)} {...props}>
    <div className="flex flex-row gap-2">
      <Skeleton className="size-10 shrink-0 rounded-full" />
      <Skeleton className="h-10 w-full" />
    </div>
    <Skeleton className="h-20 w-full" />
  </div>
);

export const TweetNotFound = ({ className, ...props }: { className?: string; [key: string]: unknown }) => (
  <div
    className={cn('flex size-full flex-col items-center justify-center gap-2 rounded-lg border p-4', className)}
    {...props}
  >
    <h3>Tweet not found</h3>
  </div>
);

export const TweetHeader = ({ tweet }: { tweet: EnrichedTweet }) => {
  const time = dayjs(tweet.created_at);

  return (
    <div className="flex flex-row justify-between tracking-tight text-sm">
      <div className="flex items-center space-x-2">
        <a href={tweet.user.url} rel="noreferrer" target="_blank">
          <img
            alt={tweet.user.screen_name}
            className="overflow-hidden rounded-full border border-transparent"
            height={20}
            src={tweet.user.profile_image_url_https}
            title={`Profile picture of ${tweet.user.name}`}
            width={20}
          />
        </a>
        <div>
          <a
            className="flex items-center whitespace-nowrap font-semibold gap-1"
            href={tweet.user.url}
            rel="noreferrer"
            target="_blank"
          >
            {truncate(tweet.user.name, 20)}
            {tweet.user.verified ||
              (tweet.user.is_blue_verified && <Verified className="ml-1 inline size-4 text-blue-500" />)}
            <span className="font-light text-[#999]">@{truncate(tweet.user.screen_name, 16)}</span>
          </a>
        </div>
        <span className="font-light text-[#999]">·</span>
        <time className="font-light text-[#999]" dateTime={tweet.created_at}>
          {time.isToday() ? time.fromNow() : time.format('YYYY/MM/DD')}
        </time>
      </div>

      <a href={tweet.url} rel="noreferrer" target="_blank">
        <span className="sr-only">Link to X</span>
        <XLogo height={20} width={20} />
      </a>
    </div>
  );
};

export const TweetBody = ({ tweet }: { tweet: EnrichedTweet }) => (
  <div className="break-words leading-normal tracking-tighter text-xs">
    {tweet.entities.map((entity, idx) => {
      switch (entity.type) {
        case 'url':
        case 'symbol':
        case 'hashtag':
        case 'mention':
          return (
            <a
              className="text-sm font-normal text-gray-500"
              href={entity.href}
              key={idx}
              rel="noopener noreferrer"
              target="_blank"
            >
              <span>{entity.text}</span>
            </a>
          );
        case 'text':
          return <span className="text-sm font-normal" dangerouslySetInnerHTML={{ __html: entity.text }} key={idx} />;
      }
    })}
  </div>
);

export const TweetMedia = ({
  tweet,
}: {
  tweet: EnrichedTweet & {
    card?: {
      binding_values: {
        thumbnail_image_large: {
          image_value: {
            url: string;
          };
        };
      };
    };
  };
}) => (
  <div className="flex flex-1 items-center justify-center">
    {tweet.video && (
      <video autoPlay className="rounded-xl border shadow-sm" loop muted playsInline poster={tweet.video.poster}>
        <source src={tweet.video.variants[0]?.src} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
    )}
    {tweet.photos &&
      (tweet.photos.length > 1 ? (
        <div className="relative flex transform-gpu snap-x snap-mandatory gap-4 overflow-x-auto">
          <div className="shrink-0 snap-center sm:w-2" />
          {tweet.photos.map((photo) => (
            <img
              alt={tweet.text}
              className="h-64 w-5/6 shrink-0 snap-center snap-always rounded-xl border object-cover shadow-sm"
              key={photo.url}
              src={photo.url}
              title={'Photo by ' + tweet.user.name}
            />
          ))}
          <div className="shrink-0 snap-center sm:w-2" />
        </div>
      ) : (
        <div className="relative flex">
          {tweet.photos.map((photo) => (
            <img
              alt={tweet.text}
              className="h-64  shrink-0  rounded-xl border object-cover shadow-sm"
              key={photo.url}
              src={photo.url}
              title={'Photo by ' + tweet.user.name}
            />
          ))}
        </div>
      ))}
    {!tweet.video && !tweet.photos && tweet?.card?.binding_values?.thumbnail_image_large?.image_value.url && (
      <img
        alt={tweet.text}
        className="h-64 rounded-xl border object-cover shadow-sm"
        src={tweet.card.binding_values.thumbnail_image_large.image_value.url}
      />
    )}
  </div>
);

const TweetReaction = ({ id, reaction }: { id: string; reaction: Record<'like' | 'dislike', number> }) => {
  const total = reaction.like + reaction.dislike;
  return (
    <div>
      <div className="hidden group-hover:flex">
        <ReactionButton action="like" id={id} />
        <ReactionButton action="dislike" id={id} />
      </div>
      <div className="flex items-center gap-2 w-full group-hover:hidden">
        <button className="flex items-center text-reaction-like text-xs" data-action="like" data-id={id}>
          <ArrowUpIcon className="w-4 h-4" />
          {reaction.like}
        </button>
        <progress
          className={cn(
            'flex-1',
            'h-4 rounded-full overflow-hidden',
            '[&::-webkit-progress-bar]:bg-reaction-dislike [&::-webkit-progress-value]:bg-reaction-like [&::-moz-progress-bar]:bg-reaction-like',
          )}
          max={total ? total : 2}
          value={total ? reaction.like : 1}
        ></progress>
        <button className="flex items-center text-reaction-dislike text-xs" data-action="dislike" data-id={id}>
          <ArrowDownIcon className="w-4 h-4" />
          {reaction.dislike}
        </button>
      </div>
    </div>
  );
};

export const MagicTweet = ({
  tweet,
  components,
  className,
  reaction,
  ...props
}: {
  tweet: Tweet;
  components?: TwitterComponents;
  className?: string;
  reaction: Record<'like' | 'dislike', number>;
}) => {
  const enrichedTweet = enrichTweet(tweet);
  return (
    <div className="bg-[#171A1F] p-1 flex rounded-md">
      <div
        className={cn(
          'relative flex size-full max-w-lg flex-col gap-2 overflow-hidden rounded-md bg-[#101214]  p-4 backdrop-blur-md group',
          className,
        )}
        {...props}
      >
        <TweetHeader tweet={enrichedTweet} />
        <TweetBody tweet={enrichedTweet} />
        <TweetMedia tweet={enrichedTweet} />
        <TweetReaction id={enrichedTweet.id_str} reaction={reaction} />
      </div>
    </div>
  );
};

/**
 * TweetCard (Server Side Only)
 */
export const TweetCard = async ({
  id,
  components,
  fallback = <TweetSkeleton />,
  onError,
  ...props
}: TweetProps & {
  className?: string;
  reaction: Record<'like' | 'dislike', number>;
}) => {
  const tweet = id
    ? await getTweet(id).catch((err: Error) => {
        if (onError) {
          onError(err);
        } else {
          console.error(err);
        }
      })
    : undefined;

  if (!tweet) {
    const NotFound = components?.TweetNotFound || TweetNotFound;
    return <NotFound {...props} />;
  }

  return (
    <Suspense fallback={fallback}>
      <MagicTweet tweet={tweet} {...props} />
    </Suspense>
  );
};
