'use client';

/* eslint-disable-next-line simple-import-sort/imports */
import React, { useEffect, useState } from 'react';
import { Montserrat } from 'next/font/google';

import { cn } from '~/lib/utils';
import { ClientTweetCard } from '~/components/magicui/client-tweet-card';
import { dislikeTweet, likeTweet, type Tweet, subscribe } from '~/utils/third-api/news';

const montserrat = Montserrat({ subsets: ['cyrillic'], display: 'swap' });

const News: React.FC = () => {
  const [news, setNews] = useState<Array<Tweet> | null>(null);
  const [order, setOrder] = useState<string>('hot');

  useEffect(() => {
    const unsubscribe = subscribe((tweets) => setNews(tweets));

    return () => unsubscribe?.();
  }, []);

  const handleClick = async (e: React.SyntheticEvent) => {
    const elm = e.target;

    if (!(elm instanceof HTMLButtonElement)) {
      // ignore
      return;
    }

    const { id, action, order } = elm.dataset;

    try {
      switch (action) {
        case 'like':
          if (!id) return;
          e.stopPropagation();
          e.preventDefault();
          await likeTweet(id);
          setNews((prev) => prev?.map((t) => (t.id === id ? { ...t, like: t.like + 1 } : t)) ?? []);
          return;
        case 'dislike':
          if (!id) return;
          e.stopPropagation();
          e.preventDefault();
          await dislikeTweet(id);
          setNews((prev) => prev?.map((t) => (t.id === id ? { ...t, dislike: t.dislike + 1 } : t)) ?? []);
          return;
        case 'sort': {
          if (!order) return;
          e.stopPropagation();
          e.preventDefault();
          setOrder(order);
        }
        default:
          // ignore
          return;
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (!news) return <p>Loading</p>;

  return (
    <div
      className={cn(
        'w-min',
        'flex flex-col',
        'text-base font-semibold',
        'bg-[#101214]',
        'rounded-2xl border border-[#222]',
        montserrat.className,
      )}
      onClick={handleClick}
    >
      <div className={cn('pt-4 px-4 pb-2', 'flex flex-col gap-2', 'text-[#fafafa]')}>
        News
        <div className={cn('flex', 'w-full h-10 p-1', 'bg-[#171A1F]', 'text-sm font-medium', 'rounded-lg')}>
          {['hot', 'latest'].map((label) => {
            return (
              <button
                className={cn('flex-1', 'rounded-lg', 'capitalize', label === order ? 'bg-[#23272C]' : 'text-[#666]')}
                data-action="sort"
                data-order={label}
                key={label}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="flex flex-col bg-[#101214] px-4 py-2 gap-3">
        {news
          .sort((a, b) => {
            if (order === 'hot') {
              return b.like - b.dislike - (a.like - a.dislike);
            }
            if (order === 'latest') {
              return +b.timestamp - +a.timestamp;
            }
            return 0;
          })
          .map(({ id, like, dislike }) => {
            return <ClientTweetCard id={id} key={id} reaction={{ like, dislike }} />;
          })}
      </div>
    </div>
  );
};

export default News;
