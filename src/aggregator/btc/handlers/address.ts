import { and, eq, or } from 'drizzle-orm';

import { chunkSql, decrement, increment } from '~/aggregator/utils';
import { NATIVE_ASSETS } from '~/constants';
import { addressAsset } from '~/server/db/schema';
import { isValidBTCAddress } from '~/utils/bitcoin';

import { type ResolvedBlock } from '../types';
import { createBTCSubHandler } from '.';

type ChangeAsset = {
  address: string;
  assetId: string;
  amount: bigint;
  deleted?: boolean;
};

export const addressAssetHandler = createBTCSubHandler({
  name: 'btcAddressAsset',
  prepare: async (ctx): Promise<ChangeAsset[]> => {
    return [...prepareBTCChanges(ctx.resolvedBlock)];
  },
  save: async ({ tx, preparedData }) => {
    if (preparedData.length === 0) return;

    const deleteData = preparedData.filter((data) => data.deleted);
    await chunkSql(
      (data) =>
        tx
          .delete(addressAsset)
          .where(or(...data.map((d) => and(eq(addressAsset.address, d.address), eq(addressAsset.assetId, d.assetId))))),
      deleteData,
    );
    const insertData = preparedData
      .filter((data) => !data.deleted)
      .map((data) => ({ ...data, assetAmount: data.amount.toString() }));
    await chunkSql(
      (data) =>
        tx
          .insert(addressAsset)
          .values(data)
          .onConflictDoUpdate({
            target: [addressAsset.address, addressAsset.assetId],
            set: {
              assetAmount: increment(addressAsset.assetAmount),
            },
          }),
      insertData,
    );
  },
  rollback: async (ctx) => {
    const { preparedData } = ctx;

    await Promise.all(
      preparedData.map((data) =>
        data.deleted
          ? ctx.tx
              .delete(addressAsset)
              .where(and(eq(addressAsset.address, data.address), eq(addressAsset.assetId, data.assetId)))
          : ctx.tx
              .insert(addressAsset)
              .values({
                address: data.address,
                assetAmount: data.amount.toString(),
                assetId: data.assetId,
              })
              .onConflictDoUpdate({
                target: [addressAsset.address, addressAsset.assetId],
                set: {
                  assetAmount: decrement(addressAsset.assetAmount),
                },
              }),
      ),
    );
  },
});

export const prepareBTCChanges = (block: ResolvedBlock) => {
  const changeMaps: Record<string, bigint> = {};

  block.transactions.forEach(({ vins, vouts, hash }) => {
    vins.forEach((i) => {
      changeMaps[i.address] = (changeMaps[i.address] ?? 0n) - BigInt(i.value);
    });

    vouts.forEach((o) => {
      changeMaps[o.address] = (changeMaps[o.address] ?? 0n) + BigInt(o.value);
    });
  });

  const changes = Object.entries(changeMaps).map(([address, amount]) => ({
    assetId: NATIVE_ASSETS.BTC,
    address,
    amount,
  }));

  return changes.filter((c) => c.amount !== 0n).filter((c) => isValidBTCAddress(c.address));
};

export default addressAssetHandler;
