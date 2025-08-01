import { eq } from 'drizzle-orm';
import * as R from 'remeda';

import { type MarketService } from '~/aggregator/services/types';
import { NATIVE_ASSETS } from '~/constants';
import { tx as txTable } from '~/server/db/schema';

import { type ResolvedVout } from '../api';
import { type ResolvedBlock } from '../types';
import { createBTCSubHandler } from '.';

function findTheMaxBTCAddress(cells: ResolvedVout[]) {
  let maxValue: bigint | undefined = undefined;
  let address: string | undefined;
  cells.forEach((cell) => {
    const currentCellValue = BigInt(cell.value);
    if (maxValue === undefined) {
      maxValue = currentCellValue;
      address = cell.address;
    } else if (maxValue < currentCellValue) {
      maxValue = currentCellValue;
      address = cell.address;
    }
  });
  return address;
}

export async function prepare({
  marketService,
  resolvedBlock: block,
}: {
  marketService: MarketService;
  resolvedBlock: ResolvedBlock;
}) {
  const btcPrice = await marketService.createCalculator([{ assetId: NATIVE_ASSETS.BTC, timestamp: block.time }]);
  return block.transactions.map((v, index) => {
    const vinValues = R.sumBy(v.vins, (v) => BigInt(v.value));
    const voutValues = R.sumBy(v.vouts, (v) => BigInt(v.value));
    const value = voutValues > vinValues ? voutValues : vinValues;
    return {
      hash: v.hash,
      index: index,
      blockHash: block.hash,
      assetId: NATIVE_ASSETS.BTC,
      committedTime: new Date(+block.time),
      submittedTime: new Date(+block.time),
      from: findTheMaxBTCAddress(v.vins),
      to: findTheMaxBTCAddress(v.vouts),
      value: BigInt(value),
      volume: btcPrice.getVolume({ assetId: NATIVE_ASSETS.BTC, timestamp: block.time, value }),
      inputCount: v.vins.length,
      outputCount: v.vouts.length,
    };
  });
}

const transactionHandler = createBTCSubHandler({
  name: 'transaction',
  prepare,
  save: async ({ tx, preparedData: txs }) => {
    if (!txs.length) return;
    await Promise.all(
      R.pipe(
        txs,
        R.chunk(100),
        R.map((v) => tx.insert(txTable).values(v).onConflictDoNothing()),
      ),
    );
  },
  rollback: async ({ tx, resolvedBlock }) => {
    await tx.delete(txTable).where(eq(txTable.blockHash, resolvedBlock.hash));
  },
});

export default transactionHandler;
