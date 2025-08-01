import { type Script } from '@ckb-lumos/lumos';
import BigNumber from 'bignumber.js';
import { eq } from 'drizzle-orm';

import type { CellbaseTransaction, ResolvedBlock, ResolvedInput, ResolvedOutput } from '~/aggregator/ckb/types';
import { type Logger } from '~/aggregator/types';
import { NATIVE_ASSETS } from '~/constants';
import { getHistoryPrice } from '~/server/api/comm';
import { db } from '~/server/db';
import { assetInfo, assetToTag, tx as txTable } from '~/server/db/schema';

import { getAssetInfo } from '../utils';
import { createCkbSubHandler } from '.';

const reduceCKB = (cells: ResolvedInput[] | ResolvedOutput[]) =>
  cells.reduce((pre, cur) => pre + BigInt(cur.cellOutput.capacity), BigInt(0));

type PrepareResult = (typeof txTable.$inferInsert & { tags?: string[] })[];

function transformCellBaseTx(
  cellbaseTx: CellbaseTransaction,
  block: ResolvedBlock,
  ckbPrice?: string | null,
): PrepareResult[number] {
  const value = reduceCKB(cellbaseTx.outputs);
  return {
    hash: cellbaseTx.hash!,
    index: 0,
    blockHash: block.header.hash,
    assetId: NATIVE_ASSETS.CKB,
    committedTime: new Date(+block.header.timestamp),
    submittedTime: new Date(+block.header.timestamp),
    to: cellbaseTx.outputs[0]?.cellOutput.lock,
    value,
    volume: ckbPrice
      ? BigNumber(value.toString()).div(Math.pow(10, 8)).multipliedBy(BigNumber(ckbPrice)).toString()
      : undefined,
    inputCount: 0,
    outputCount: cellbaseTx.outputs.length,
  };
}

function findTheMaxAssetCell(
  cells: ResolvedInput[] | ResolvedOutput[],
  getVolume = (cell: ResolvedInput | ResolvedOutput) => BigInt(cell.cellOutput.capacity),
) {
  let maxValue: bigint | undefined = undefined;
  let script: Script | undefined;
  cells.forEach((cell) => {
    const currentCellValue = getVolume(cell);
    if (maxValue === undefined) {
      maxValue = currentCellValue;
      script = cell.cellOutput.lock;
    } else if (maxValue < currentCellValue) {
      maxValue = currentCellValue;
      script = cell.cellOutput.lock;
    }
  });
  return script;
}

function getAllTypesAmount(cells: ResolvedInput[] | ResolvedOutput[]) {
  const res: Record<string, { assetId: string; amount: bigint; tags: string[] }> = {};
  for (const cell of cells) {
    const { id, tags, value } = getAssetInfo(cell) ?? {};
    if (!id || !tags || id === NATIVE_ASSETS.CKB) continue;
    res[id] = {
      assetId: id,
      amount: (res[id]?.amount ?? BigInt(0)) + (value ?? BigInt(0)),
      tags,
    };
  }
  return Object.values(res);
}

export async function generateInsertTxs({
  priceMap,
  block,
  existAssets,
}: {
  priceMap: Record<string, string | null>;
  block: ResolvedBlock;
  existAssets: Map<string, number | null>;
}) {
  const txs: PrepareResult = [];
  const [cellbaseTx, ...otherTxs] = block.transactions;
  const ckbPrice = priceMap[NATIVE_ASSETS.CKB];
  txs.push(transformCellBaseTx(cellbaseTx, block, ckbPrice));
  otherTxs.forEach((v, idx) => {
    const typeAssets = [...getAllTypesAmount(v.inputs), ...getAllTypesAmount(v.outputs)].filter((v) =>
      existAssets.has(v.assetId),
    );
    if (typeAssets.length) {
      // handle as asset
      const assetsWithVolume = typeAssets.map((v) => ({
        ...v,
        volume: BigNumber(v.amount.toString())
          .div(Math.pow(10, existAssets.get(v.assetId) ?? 8))
          .multipliedBy(priceMap[v.assetId] ?? 0),
      }));
      const max: (typeof assetsWithVolume)[number] | undefined = assetsWithVolume.reduce(
        (pre, cur) => (pre === undefined || cur.volume.gt(pre.volume) ? cur : pre),
        assetsWithVolume[0],
      );
      if (!max) return;
      const findMaxAmount = (i: ResolvedInput | ResolvedOutput) => {
        const asset = getAssetInfo(i);
        return asset?.id === max.assetId ? (asset.value ?? BigInt(0)) : BigInt(0);
      };

      txs.push({
        hash: v.hash,
        index: idx + 1,
        blockHash: block.header.hash,
        assetId: NATIVE_ASSETS.CKB,
        tokenId: max.assetId,
        committedTime: new Date(+block.header.timestamp),
        submittedTime: new Date(+block.header.timestamp),
        from: findTheMaxAssetCell(v.inputs, findMaxAmount),
        to: findTheMaxAssetCell(v.outputs, findMaxAmount),
        value: max.amount,
        volume: max.volume.toString(),
        inputCount: v.inputs.length,
        outputCount: v.outputs.length,
        tags: max.tags,
      });
    } else {
      const inputCKB = reduceCKB(v.inputs);
      const outputCKB = reduceCKB(v.outputs);
      const value = inputCKB > outputCKB ? inputCKB : outputCKB;
      txs.push({
        hash: v.hash,
        index: idx + 1,
        blockHash: block.header.hash,
        assetId: NATIVE_ASSETS.CKB,
        committedTime: new Date(+block.header.timestamp),
        submittedTime: new Date(+block.header.timestamp),
        from: findTheMaxAssetCell(v.inputs),
        to: findTheMaxAssetCell(v.outputs),
        value,
        volume: ckbPrice
          ? BigNumber(value.toString()).div(Math.pow(10, 8)).multipliedBy(BigNumber(ckbPrice)).toString()
          : undefined,
        inputCount: v.inputs.length,
        outputCount: v.outputs.length,
      });
    }
  });
  return txs;
}

export async function prepare(block: ResolvedBlock, logger: Logger) {
  let now = Date.now();
  const priceMap = await getHistoryPrice(+block.header.timestamp);
  logger.debug(`get current block ckb price success: ${+block.header.number} cost: ${Date.now() - now}ms`);
  now = Date.now();
  const assetIds = await db
    .select({
      id: assetInfo.id,
      decimals: assetInfo.decimals,
    })
    .from(assetInfo);
  logger.debug(`get asset ids success: ${+block.header.number} cost: ${Date.now() - now}ms`);
  return generateInsertTxs({
    priceMap,
    block,
    existAssets: new Map(assetIds.map((v) => [v.id, v.decimals])),
  });
}

const transactionHandler = createCkbSubHandler<PrepareResult>({
  name: 'transaction',
  prepare: ({ resolvedBlock, logger }) => prepare(resolvedBlock, logger),
  save: async ({ tx, preparedData }) => {
    await tx.insert(txTable).values(preparedData).onConflictDoNothing();
    const tags = preparedData.flatMap((v) =>
      (v.tags ?? []).map((assetTagLabel) => ({ assetTagLabel, assetId: v.assetId })),
    );
    if (tags.length) await tx.insert(assetToTag).values(tags).onConflictDoNothing();
  },
  rollback: async ({ tx, resolvedBlock }) => {
    await tx.delete(txTable).where(eq(txTable.blockHash, resolvedBlock.header.hash));
  },
});

export default transactionHandler;
