import BigNumber from 'bignumber.js';
import { and, eq } from 'drizzle-orm';
import * as R from 'remeda';

import { type MarketService } from '~/aggregator/services/types';
import { chunkSql } from '~/aggregator/utils';
import { NATIVE_ASSETS } from '~/constants';
import { addressTx } from '~/server/db/schema';
import { isValidBTCAddress } from '~/utils/bitcoin';

import { type ResolvedVin, type ResolvedVout } from '../api';
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

  const calculateBTCChanges = ({ vins, vouts }: { vins: ResolvedVin[]; vouts: ResolvedVout[] }) => {
    const changeMaps: Record<string, bigint> = {};

    vins.forEach((i) => {
      changeMaps[i.address] = (changeMaps[i.address] ?? 0n) - BigInt(i.value);
    });

    vouts.forEach((o) => {
      changeMaps[o.address] = (changeMaps[o.address] ?? 0n) + BigInt(o.value);
    });

    return changeMaps;
  };

  const calculateChanges = ({ vins, vouts }: { vins: ResolvedVin[]; vouts: ResolvedVout[] }) =>
    R.pipe(
      R.entries(calculateBTCChanges({ vins, vouts })),
      R.flatMap(([address, changes]) => ({
        address,
        value: changes,
        volume: getBTCVolume(changes),
      })),
      R.filter((i) => i.value !== 0n),
      R.mapToObj(({ address, value, volume }) => [
        address,
        [
          {
            assetId: NATIVE_ASSETS.BTC,
            value: value.toString(),
            volume,
          },
        ],
      ]),
    );

  const addressTxInsertValue: {
    items: { address: string; io: number }[];
    commInfo: {
      txHash: string;
      txIndex: number;
      blockNumber: number;
      time: Date;
      network: 'BTC';
      changes: Record<string, { assetId: string; value: string; volume: string }[]>;
      changeVolumes: Record<string, string>;
    };
  }[] = block.transactions.flatMap((transaction, index) => {
    const inputAddresses = R.unique(transaction.vins.map((i) => i.address)).filter((address) =>
      isValidBTCAddress(address),
    );
    const outputAddresses = R.unique(transaction.vouts.map((o) => o.address)).filter((address) =>
      isValidBTCAddress(address),
    );

    const intersectAddresses = R.intersection(inputAddresses, outputAddresses);
    const onlyInputAddress = R.difference(inputAddresses, intersectAddresses);
    const onlyOutputAddress = R.difference(outputAddresses, intersectAddresses);

    const changes = calculateChanges(transaction);
    const changeVolumes = R.pipe(
      R.entries(changes),
      R.mapToObj(([address, changes]) => [
        address,
        R.reduce(changes, (acc, cur) => acc.plus(BigNumber(cur.volume)), BigNumber(0)).toString(),
      ]),
    );

    return {
      items: R.pipe(
        intersectAddresses.map((address) => ({ address, io: 2 })),
        R.concat(onlyInputAddress.map((address) => ({ address, io: 0 }))),
        R.concat(onlyOutputAddress.map((address) => ({ address, io: 1 }))),
      ),
      commInfo: {
        txHash: transaction.hash,
        txIndex: index + 1,
        blockNumber: Number(block.height),
        time: new Date(+block.time),
        network: 'BTC',
        changes,
        changeVolumes,
      },
    };
  });

  return addressTxInsertValue;
};

const addressTxHandler = createBTCSubHandler({
  name: 'btcAddressTx',
  prepare,
  save: async ({ tx, preparedData }) => {
    if (preparedData.length === 0) return;

    const insertData = preparedData.flatMap(({ items, commInfo }) => {
      const { txHash, txIndex, blockNumber, time, network, changes, changeVolumes } = commInfo;
      return items.map((item) => ({
        ...item,
        txHash,
        txIndex,
        blockNumber,
        time,
        network,
        changeVolume: changeVolumes[item.address] ?? '0',
        assets: (changes[item.address] ?? []).map((i) => i.assetId),
        assetsCount: (changes[item.address] ?? []).map((i) => i.assetId).length,
      }));
    });
    await chunkSql((chunk) => tx.insert(addressTx).values(chunk).onConflictDoNothing(), insertData, 500);
  },
  rollback: async (ctx) => {
    await ctx.tx
      .delete(addressTx)
      .where(and(eq(addressTx.network, 'BTC'), eq(addressTx.blockNumber, ctx.resolvedBlock.height)));
  },
});

export default addressTxHandler;
