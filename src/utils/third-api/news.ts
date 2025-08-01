// firebase app to subscribe tweets

import { initializeApp } from 'firebase/app';
import { getDatabase, onValue, ref } from 'firebase/database';

import { env } from '~/env';

const config = env.NEXT_PUBLIC_NEWS_CONFIG ? (JSON.parse(env.NEXT_PUBLIC_NEWS_CONFIG) as Record<string, string>) : null;

const app = config ? initializeApp(config) : null;
const database = app ? getDatabase(app) : null;

export type Tweet = {
  id: string;
  timestamp: string;
  url: string;
  like: number;
  dislike: number;
};

interface FirebaseSnapshot {
  tweets: Record<string /* id */, Omit<Tweet, 'id'>>;
}

export const subscribe = (cb: (p: Array<Tweet>) => void) => {
  const unsubscribe = database
    ? onValue(ref(database), (snapshot) => {
        if (snapshot.exists()) {
          const data: FirebaseSnapshot = snapshot.val() as FirebaseSnapshot;
          try {
            const tweets = Object.entries(data.tweets)
              .map(([id, tweet]) => {
                if (!tweet || typeof tweet !== 'object') return null;

                return {
                  id,
                  ...tweet,
                };
              })
              .filter((tweet): tweet is Exclude<Tweet | null, null> => tweet !== null);
            cb(tweets);
          } catch {
            //ignore
          }
        }
      })
    : null;
  return unsubscribe;
};

// x feeds service to like/dislike tweets

const ENDPOINT = 'https://ckb-feeds.random-walk.co.jp/api';

const reactTweet = async (id: string, action: 'like' | 'dislike') => {
  return fetch(`${ENDPOINT}/tweets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id, method: action }),
  }).then((res) => res.text());
};

export const likeTweet = (id: string) => reactTweet(id, 'like');
export const dislikeTweet = (id: string) => reactTweet(id, 'dislike');
