import BigNumber from 'bignumber.js';
import * as R from 'remeda';

import { type MarketService } from '~/aggregator/services/types';
import { chunkSql, decrement, increment } from '~/aggregator/utils';
import { NATIVE_ASSETS } from '~/constants';
import { addressOverview } from '~/server/db/schema';
import { isValidBTCAddress } from '~/utils/bitcoin';

import { type ResolvedBlock } from '../types';
import { createBTCSubHandler } from '.';

export const prepare = async ({
  resolvedBlock: block,
  marketService,
}: {
  resolvedBlock: ResolvedBlock;
  marketService: MarketService;
}) => {
  const btcPriceCalculator = await marketService.createCalculator([
    { assetId: NATIVE_ASSETS.BTC, timestamp: block.time },
  ]);

  const getBTCVolume = (value: Parameters<typeof btcPriceCalculator.getVolume>[0]['value']) =>
    btcPriceCalculator.getVolume({ assetId: NATIVE_ASSETS.BTC, timestamp: block.time, value });

  const addressTxCountMap = R.pipe(
    block.transactions,
    R.flatMap((tx) => [
      ...tx.vins.map(({ address }) => ({ address, txHash: tx.hash })),
      ...tx.vouts.map(({ address }) => ({ address, txHash: tx.hash })),
    ]),
    R.map((item) => ({ ...item, key: item.address + item.txHash })),
    R.uniqueBy((item) => item.key),
    R.groupBy((item) => item.address),
    R.entries(),
    R.mapToObj((entry) => [entry[0], entry[1].length]),
  );

  const btcIOVolumes = prepareBTCIOVolume(block);

  return R.pipe(
    btcIOVolumes,
    R.map((volume) => ({
      address: volume.address,
      received: getBTCVolume(volume.received.toString()),
      sent: getBTCVolume(volume.sent.toString()),
    })),
    R.groupBy((item) => item.address),
    R.entries(),
    R.map((item) => ({
      address: item[0],
      received: R.reduce(item[1], (acc, x) => acc.plus(x.received), BigNumber(0)),
      sent: R.reduce(item[1], (acc, x) => acc.plus(x.sent), BigNumber(0)),
      txCount: addressTxCountMap[item[0]] ?? 0,
    })),
    R.map((item) => ({
      address: item.address,
      received: item.received.toString(),
      sent: item.sent.toString(),
      volume: item.received.plus(item.sent).toString(),
      txCount: item.txCount,
    })),
  );
};

export const addressOverviewHandler = createBTCSubHandler({
  name: 'btcAddressOverview',
  prepare,
  save: async ({ tx, preparedData }) => {
    if (preparedData.length === 0) return;

    const insertData = preparedData.map((data) => ({
      ...data,
      received: data.received.toString(),
      sent: data.sent.toString(),
      volume: data.volume.toString(),
    }));
    await chunkSql(
      (v) =>
        tx
          .insert(addressOverview)
          .values(v)
          .onConflictDoUpdate({
            target: [addressOverview.address],
            set: {
              received: increment(addressOverview.received),
              sent: increment(addressOverview.sent),
              volume: increment(addressOverview.volume),
              txCount: increment(addressOverview.txCount),
            },
          }),
      insertData,
      500,
    );
  },
  rollback: async ({ tx, preparedData }) => {
    await Promise.all(
      preparedData.map((data) =>
        tx
          .insert(addressOverview)
          .values({
            address: data.address,
            received: data.received.toString(),
            sent: data.sent.toString(),
            volume: data.volume.toString(),
            txCount: data.txCount,
          })
          .onConflictDoUpdate({
            target: [addressOverview.address],
            set: {
              received: decrement(addressOverview.received),
              sent: decrement(addressOverview.sent),
              volume: decrement(addressOverview.volume),
              txCount: decrement(addressOverview.txCount),
            },
          }),
      ),
    );
  },
});

export const prepareBTCIOVolume = (block: ResolvedBlock) => {
  const BTCVolumeMaps: Record<
    string,
    {
      received: bigint;
      sent: bigint;
    }
  > = {};

  block.transactions.forEach(({ vins, vouts }) => {
    vins.forEach(({ address, value }) => {
      BTCVolumeMaps[address] = {
        received: BTCVolumeMaps[address]?.received ?? 0n,
        sent: (BTCVolumeMaps[address]?.sent ?? 0n) + BigInt(value),
      };
    });

    vouts.forEach(({ address, value }) => {
      BTCVolumeMaps[address] = {
        received: (BTCVolumeMaps[address]?.received ?? 0n) + BigInt(value),
        sent: BTCVolumeMaps[address]?.sent ?? 0n,
      };
    });
  });

  return Object.entries(BTCVolumeMaps)
    .map(([address, { received, sent }]) => ({
      assetId: NATIVE_ASSETS.BTC,
      address,
      received,
      sent,
    }))
    .filter((o) => isValidBTCAddress(o.address));
};

export default addressOverviewHandler;
