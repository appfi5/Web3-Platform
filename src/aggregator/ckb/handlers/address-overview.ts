import BigNumber from 'bignumber.js';
import { type AnyColumn, sql } from 'drizzle-orm';
import * as R from 'remeda';

import { createCkbSubHandler } from '~/aggregator/ckb/handlers/index';
import { type PriceService, type ResolvedBlock } from '~/aggregator/ckb/types';
import { NATIVE_ASSETS } from '~/constants';
import { addressOverview } from '~/server/db/schema';

import { hexifyScript } from '../utils';
import { createXudtGroup } from './activity/xudt';

const increment = (column: AnyColumn, value: number | string = 1) => {
  return sql`${column} + ${value}`;
};

const decrement = (column: AnyColumn, value: number | string = 1) => {
  return sql`${column} - ${value}`;
};

export const addressOverviewHandler = createCkbSubHandler({
  name: 'addressOverview',
  prepare: async (ctx) => {
    return prepare(ctx.resolvedBlock, ctx.marketService);
  },
  save: async ({ tx, preparedData }) => {
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
              received: increment(addressOverview.received, data.received.toString()),
              sent: increment(addressOverview.sent, data.sent.toString()),
              volume: increment(addressOverview.volume, data.volume.toString()),
              txCount: increment(addressOverview.txCount, data.txCount),
            },
          }),
      ),
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
              received: decrement(addressOverview.received, data.received.toString()),
              sent: decrement(addressOverview.sent, data.sent.toString()),
              volume: decrement(addressOverview.volume, data.volume.toString()),
              txCount: decrement(addressOverview.txCount, data.txCount),
            },
          }),
      ),
    );
  },
});

export const prepare = async (block: ResolvedBlock, priceService: PriceService) => {
  const [cellBaseTx, ...txs] = block.transactions;
  const minter = cellBaseTx.outputs[0]?.cellOutput.lock;

  const addressTxCountMap = R.pipe(
    txs,
    R.flatMap((tx) => [
      ...tx.inputs.map((cell) => ({ address: hexifyScript(cell.cellOutput.lock), txHash: tx.hash })),
      ...tx.outputs.map((cell) => ({ address: hexifyScript(cell.cellOutput.lock), txHash: tx.hash })),
    ]),
    R.map((item) => ({ ...item, key: item.address + item.txHash })),
    R.uniqueBy((item) => item.key),
    R.groupBy((item) => item.address),
    R.entries(),
    R.mapToObj((entry) => [entry[0], entry[1].length]),
  );

  if (minter) {
    addressTxCountMap[hexifyScript(minter)] = (addressTxCountMap[hexifyScript(minter)] ?? 0) + 1;
  }

  const ckbVolumes = prepareCKBVolume(block);
  const xudtVolumes = prepareXudtVolume(block);

  const assetIds = R.pipe(
    xudtVolumes,
    R.map((change) => change.assetId),
    R.unique(),
  );

  const calculator = await priceService.createCalculator([
    { assetId: NATIVE_ASSETS.CKB, timestamp: Number(block.header.timestamp) },
    ...assetIds.map((assetId) => ({ assetId, timestamp: Number(block.header.timestamp) })),
  ]);

  const getVolume = ({ assetId, value }: { assetId: string; value: bigint | string | number }) =>
    calculator.getVolume({
      assetId,
      value,
      timestamp: Number(block.header.timestamp),
    });

  return R.pipe(
    R.concat(ckbVolumes, xudtVolumes),
    R.map((volume) => ({
      address: volume.address,
      received: getVolume({ assetId: volume.assetId, value: volume.received }),
      sent: getVolume({ assetId: volume.assetId, value: volume.sent }),
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

export const prepareCKBVolume = (block: ResolvedBlock) => {
  const [cellBaseTx, ...txs] = block.transactions;

  const CKBVolumeMaps: Record<
    string,
    {
      received: bigint;
      sent: bigint;
    }
  > = {};

  txs.forEach(({ inputs, outputs }) => {
    inputs.forEach((cell) => {
      CKBVolumeMaps[hexifyScript(cell.cellOutput.lock)] = {
        received: CKBVolumeMaps[hexifyScript(cell.cellOutput.lock)]?.received ?? 0n,
        sent: (CKBVolumeMaps[hexifyScript(cell.cellOutput.lock)]?.sent ?? 0n) + BigInt(cell.cellOutput.capacity),
      };
    });

    outputs.forEach((cell) => {
      CKBVolumeMaps[hexifyScript(cell.cellOutput.lock)] = {
        received:
          (CKBVolumeMaps[hexifyScript(cell.cellOutput.lock)]?.received ?? 0n) + BigInt(cell.cellOutput.capacity),
        sent: CKBVolumeMaps[hexifyScript(cell.cellOutput.lock)]?.sent ?? 0n,
      };
    });
  });

  cellBaseTx.outputs.forEach((cell) => {
    CKBVolumeMaps[hexifyScript(cell.cellOutput.lock)] = {
      received: (CKBVolumeMaps[hexifyScript(cell.cellOutput.lock)]?.received ?? 0n) + BigInt(cell.cellOutput.capacity),
      sent: CKBVolumeMaps[hexifyScript(cell.cellOutput.lock)]?.sent ?? 0n,
    };
  });

  return Object.entries(CKBVolumeMaps).map(([address, { received, sent }]) => ({
    assetId: NATIVE_ASSETS.CKB,
    address,
    received,
    sent,
  }));
};

export const prepareXudtVolume = (block: ResolvedBlock) => {
  const [, ...txs] = block.transactions;

  const volumeMaps: Record<
    string,
    Record<
      string,
      {
        received: bigint;
        sent: bigint;
      }
    >
  > = {};
  txs.forEach(({ inputs, outputs }) => {
    const inputXudtGroup = createXudtGroup(inputs);
    const outputXudtGroup = createXudtGroup(outputs);

    const involvedXudts = R.pipe(R.keys(inputXudtGroup.byXudt).concat(R.keys(outputXudtGroup.byXudt)), R.unique());

    involvedXudts.forEach((typeHash) => {
      const inputAddressAmountMap = inputXudtGroup.byXudtAndAddress[typeHash];
      const outputAddressAmountMap = outputXudtGroup.byXudtAndAddress[typeHash];

      const addressMap: Record<
        string,
        {
          received: bigint;
          sent: bigint;
        }
      > = volumeMaps[typeHash] ?? {};

      Object.entries(inputAddressAmountMap ?? {}).forEach(([address, amount]) => {
        addressMap[address] = {
          received: addressMap[address]?.received ?? 0n,
          sent: (addressMap[address]?.sent ?? 0n) + amount,
        };
      });

      Object.entries(outputAddressAmountMap ?? {}).forEach(([address, amount]) => {
        addressMap[address] = {
          received: (addressMap[address]?.received ?? 0n) + amount,
          sent: addressMap[address]?.sent ?? 0n,
        };
      });

      volumeMaps[typeHash] = addressMap;
    });
  });

  return Object.entries(volumeMaps).flatMap(([assetId, addressMap]) =>
    Object.entries(addressMap).map(([address, { received, sent }]) => ({
      assetId,
      address,
      received,
      sent,
    })),
  );
};
