/**
 * An abstract async storage interface which is used to be a bridge
 *  to work with presistence layer, such as Redis, or even a SQL database
 */

import { type BasicBlockInfo } from '../types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type KVStorage<T = Record<string, any>> = {
  keys: () => Promise<(keyof T)[]>;
  getItem: <K extends keyof T & string>(key: K) => Promise<T[K] | null>;
  setItem: <K extends keyof T & string>(key: K, value: T[K]) => Promise<void>;
  removeItem: <K extends keyof T & string>(key: K) => Promise<void>;
  clear: () => Promise<void>;
};

type PreapreKey = `prepare/${number}/${string}`;

/**
 * An async storage for prepare data. Prepare data is used to save and rollback.
 * @param param0
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createPrepareDataStorage<T>({ storage }: { storage: KVStorage<any> }) {
  const prepareStore = {
    set: (blockHeight: number, blockHash: string, data: T) =>
      storage.setItem(`prepare/${blockHeight}/${blockHash}`, data),

    delete: (blockHeight: number, blockHash: string) => storage.removeItem(`prepare/${blockHeight}/${blockHash}`),

    deleteByHeight: (blockHeight: number) =>
      storage
        .keys()
        .then((keys) => keys.filter((key) => String(key).startsWith(`prepare/${blockHeight}/`)))
        .then((keys) => Promise.all(keys.map((key) => storage.removeItem(String(key))))),

    deleteByHash: (blockHash: string) =>
      storage
        .keys()
        .then((keys) => keys.filter((key) => String(key).endsWith(`/${blockHash}`)))
        .then((keys) => Promise.all(keys.map((key) => storage.removeItem(String(key))))),

    getSize: () => prepareStore.getKeys().then((keys) => keys.length),

    get: (blockHeight: number, blockHash: string): Promise<T> => storage.getItem(`prepare/${blockHeight}/${blockHash}`),

    getByHash: (blockHash: string): Promise<T> =>
      prepareStore
        .getKeys()
        .then((keys) => keys.find((key) => key.blockHash === blockHash)?.raw)
        .then((key) => (key ? storage.getItem(key) : null)),

    getByHeight: (blockNumber: number) =>
      prepareStore
        .getKeys()
        .then((keys) => keys.find((key) => key.blockNumber === blockNumber)?.raw)
        .then((key) => (key ? storage.getItem(key) : null)),

    getKeys: () =>
      storage.keys().then((keys) =>
        keys
          .filter((key) => String(key).startsWith('prepare'))
          .map((key) => String(key).split('/') as ['prepare', string, string])
          .map(([namespace, blockNumber, blockHash]) => ({
            blockNumber: Number(blockNumber),
            blockHash,
            raw: `${namespace}/${Number(blockNumber)}/${blockHash}` satisfies PreapreKey,
          })),
      ),

    getBlockInfo: (blockNumber: number): Promise<BasicBlockInfo | undefined> =>
      prepareStore
        .getKeys()
        .then((keys) => keys.find((key) => key.blockNumber === blockNumber)?.blockHash)
        .then((blockHash) => (blockHash ? { blockHash, blockNumber } : undefined)),

    clear: async () => storage.clear(),
  };

  return prepareStore;
}
