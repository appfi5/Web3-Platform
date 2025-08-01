import { computeScriptHash } from '@ckb-lumos/lumos/utils';
import BigNumber from 'bignumber.js';
import { and, eq } from 'drizzle-orm';
import * as R from 'remeda';

import { createCkbSubHandler } from '~/aggregator/ckb/handlers/index';
import { type PriceService, type ResolvedBlock, type ResolvedInput, type ResolvedOutput } from '~/aggregator/ckb/types';
import { calculateAssetChanges } from '~/aggregator/services/assets';
import { chunkSql } from '~/aggregator/utils';
import { NATIVE_ASSETS } from '~/constants';
import { addressTx } from '~/server/db/schema';
import { isUdt } from '~/utils/ckb';
import { getRgbppCellAddress, isRGBPP } from '~/utils/rgbpp';
import { hexifyScript } from '~/utils/utility';

export const addressTransactionHandler = createCkbSubHandler({
  name: 'addressTx',
  prepare: async (ctx) => {
    return prepareAddressTx(ctx.resolvedBlock, ctx.marketService);
  },
  save: async ({ tx, preparedData }) => {
    if (preparedData.length === 0) return;
    await chunkSql(
      (chunk) => tx.insert(addressTx).values(chunk).onConflictDoNothing(),
      exchangePrepareDataToInsert(preparedData),
      500,
    );
  },
  rollback: async (ctx) => {
    await ctx.tx
      .delete(addressTx)
      .where(and(eq(addressTx.network, 'CKB'), eq(addressTx.blockNumber, Number(ctx.resolvedBlock.header.number))));
  },
});

export const prepareAddressTx = async (block: ResolvedBlock, priceService: PriceService) => {
  const [cellBaseTx, ...transactions] = block.transactions;
  const minter = cellBaseTx.outputs[0]?.cellOutput.lock;

  const assetIds = transactions
    .flatMap((tx) => tx.outputs.concat(tx.inputs))
    .filter(({ cellOutput }) => !!cellOutput.type && isUdt(cellOutput.type))
    .map(({ cellOutput }) => computeScriptHash(cellOutput.type!));

  const rgbppScripts = R.pipe(
    transactions.flatMap((tx) => tx.inputs.map((i) => i.cellOutput.lock)),
    R.concat(transactions.flatMap((tx) => tx.outputs.map((o) => o.cellOutput.lock))),
    R.filter((script) => isRGBPP(script)),
    R.unique(),
  );

  const rgbppAddresses = await Promise.all(
    rgbppScripts.map(async (s) => ({
      script: hexifyScript(s),
      address: await getRgbppCellAddress(s).catch(() => undefined),
    })),
  );

  const rgbppMaps = R.pipe(
    rgbppAddresses,
    R.filter(({ address }) => !!address),
    R.mapToObj(({ script, address }) => [script, address]),
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

  const calculateChanges = ({ inputs, outputs }: { inputs: ResolvedInput[]; outputs: ResolvedOutput[] }) =>
    R.pipe(
      R.entries(calculateAssetChanges({ inputs, outputs })),
      R.flatMap(([assetId, changes]) =>
        Object.entries(changes).map(([address, value]) => ({
          address,
          assetId,
          value,
          volume: BigNumber(getVolume({ assetId, value })).toFixed(2),
        })),
      ),
      R.filter((i) => i.value !== 0n),
      R.groupBy((i) => i.address),
      R.entries(),
      R.mapToObj(([address, changes]) => [
        address,
        changes.map(({ assetId, value, volume }) => ({
          assetId,
          value: value.toString(),
          volume,
        })),
      ]),
    );

  const addressTxInsertValue: {
    items: { address: string; io: number }[];
    commInfo: {
      txHash: string;
      txIndex: number;
      blockNumber: number;
      time: Date;
      network: 'CKB';
      changes: Record<string, { assetId: string; value: string; volume: string }[]>;
      changeVolumes: Record<string, string>;
    };
  }[] = transactions.flatMap((transaction, index) => {
    const inputAddresses = R.unique(
      transaction.inputs.map((cell) => hexifyScript(cell.cellOutput.lock)).map((addr) => rgbppMaps[addr] ?? addr),
    );
    const outputAddresses = R.unique(
      transaction.outputs.map((cell) => hexifyScript(cell.cellOutput.lock)).map((addr) => rgbppMaps[addr] ?? addr),
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
        blockNumber: Number(block.header.number),
        time: new Date(Number(block.header.timestamp)),
        network: 'CKB',
        changes,
        changeVolumes,
      },
    };
  });

  if (minter) {
    const changes = calculateChanges({ inputs: [], outputs: cellBaseTx.outputs });

    const changeVolumes = R.pipe(
      R.entries(changes),
      R.mapToObj(([address, changes]) => [
        address,
        R.reduce(changes, (acc, cur) => acc.plus(BigNumber(cur.volume)), BigNumber(0)).toFixed(2),
      ]),
    );

    addressTxInsertValue.push({
      items: [{ address: hexifyScript(minter), io: 1 }],
      commInfo: {
        txHash: cellBaseTx.hash!,
        txIndex: 0,
        blockNumber: Number(block.header.number),
        time: new Date(Number(block.header.timestamp)),
        network: 'CKB',
        changes,
        changeVolumes,
      },
    });
  }

  return addressTxInsertValue;
};

export function exchangePrepareDataToInsert(
  preparedData: Awaited<ReturnType<typeof prepareAddressTx>>,
): (typeof addressTx.$inferInsert)[] {
  return preparedData.flatMap(({ items, commInfo }) => {
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
}
