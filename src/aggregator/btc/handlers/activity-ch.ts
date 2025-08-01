import { type ClickHouseClient, type Logger } from '@clickhouse/client';
import dayjs from 'dayjs';
import * as R from 'remeda';

import { createActivityHelper } from '~/aggregator/clickhouse/activity-helper';
import { type BatchSubHandler } from '~/aggregator/core/handler';
import { type MarketService } from '~/aggregator/services/types';
import { type TxAssetDetailInsert } from '~/server/clickhouse';
import { asserts } from '~/utils/asserts';
import { toHexNo0x } from '~/utils/bytes';

import { type BTCSourceService, type ResolvedBlock } from '../types';
import { prepareBtcActivities } from './activity/btc';
import { type ActionGroup } from './activity/types';

export async function prepare({
  resolvedBlock,
  marketService,
}: {
  resolvedBlock: ResolvedBlock;
  marketService: MarketService;
}): Promise<Array<ActionGroup>> {
  const actionGroups = await prepareBtcActivities({
    resolvedBlock: resolvedBlock,
    marketService,
    skipHandleAddress: true,
  });

  const txHashes = resolvedBlock.transactions.map((tx) => tx.hash);
  return R.pipe(
    actionGroups,
    R.sortBy((actionGroup) => txHashes.indexOf(actionGroup.action.txHash)),
  );
}

export type ClickHouseHandlerCtx = {
  logger: Logger;
  marketService: MarketService;
  clickhouse: ClickHouseClient;
  sourceService: BTCSourceService;

  blockNumber?: number;
  blockHash?: string;
};

const helper = createActivityHelper({ network: 'btc' });

const handler: BatchSubHandler<
  ClickHouseHandlerCtx,
  ClickHouseHandlerCtx,
  ClickHouseHandlerCtx,
  TxAssetDetailInsert[]
> = {
  name: 'activity',
  prepare: async (ctx) => {
    let resolvedBlock: ResolvedBlock | null = null;
    if (ctx.blockHash != null) {
      resolvedBlock = await ctx.sourceService.getResolvedBlock(ctx.blockHash);
    } else if (ctx.blockNumber != null) {
      resolvedBlock = await ctx.sourceService.getResolvedBlockByNumber(ctx.blockNumber);
    }
    asserts(resolvedBlock != null);

    const actionGroups = await prepare({ marketService: ctx.marketService, resolvedBlock });
    return actionGroups
      .flatMap((item) => item.actionAddresses)
      .map<TxAssetDetailInsert>((item) => ({
        network: 'btc',
        block_hash: toHexNo0x(resolvedBlock.hash),
        block_number: item.blockNumber,
        tx_index: item.txIndex,
        tx_hash: toHexNo0x(item.txHash),
        address: toHexNo0x(item.address),
        timestamp: dayjs(Number(resolvedBlock.timestamp * 1000)).unix(),
        from_or_to: item.fromOrTo,
        asset_id: toHexNo0x(item.assetId),
        value: String(item.value),
        volume: item.volume ?? '0',
      }));
  },
  save: async ({ preparedData }) => {
    await helper.save(preparedData);
  },

  saveBatch: async ({ preparedDatum }) => {
    await helper.saveBatch(preparedDatum.flat());
  },

  rollback: async ({ blockNumber }) => {
    asserts(blockNumber != null);
    await helper.rollback(blockNumber);
  },
};

export default handler;
