import { type ClickHouseClient } from '@clickhouse/client';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import * as R from 'remeda';

import { createActivityHelper } from '~/aggregator/clickhouse/activity-helper';
import { type BatchSubHandler } from '~/aggregator/core/handler';
import { type MarketService } from '~/aggregator/services/types';
import { type Logger } from '~/aggregator/types';
import { type TxAssetDetailInsert } from '~/server/clickhouse';
import { asserts } from '~/utils/asserts';
import { toHexNo0x } from '~/utils/bytes';

import { type CkbSourceService, type ResolvedBlock } from '../types';
import { setMaxForOverflow } from '../utils';
import { prepareCkbActivities } from './activity/ckb';
import prepareSporeActivities from './activity/spore';
import { type ActionGroup } from './activity/types';
import prepareXudtActivities from './activity/xudt';

const maxVolume = BigNumber(10).pow(20).minus(1);

export async function prepare({
  resolvedBlock,
  marketService,
}: {
  resolvedBlock: ResolvedBlock;
  marketService: MarketService;
}): Promise<Array<ActionGroup>> {
  const xudtActionGroups = await prepareXudtActivities({ resolvedBlock, marketService });
  const ckbActionGroups = await prepareCkbActivities({ resolvedBlock: resolvedBlock, marketService });

  const txHashes = resolvedBlock.transactions.map((tx) => tx.hash);
  // concat xudt and ckb action groups and order by tx hash
  const actionGroups = R.pipe(
    ckbActionGroups.concat(xudtActionGroups),
    R.sortBy((actionGroup) => txHashes.indexOf(actionGroup.action.txHash)),
  );

  return actionGroups;
}

export type ClickHouseHandlerCtx = {
  logger: Logger;
  marketService: MarketService;
  clickhouse: ClickHouseClient;
  sourceService: CkbSourceService;

  blockNumber?: number;
  blockHash?: string;
};

const helper = createActivityHelper({ network: 'ckb' });

const handler: BatchSubHandler<
  ClickHouseHandlerCtx,
  ClickHouseHandlerCtx,
  ClickHouseHandlerCtx,
  TxAssetDetailInsert[]
> = {
  name: 'activity',
  prepare: async (ctx) => {
    const resolvedBlock = ctx.blockHash
      ? await ctx.sourceService.getResolvedBlock(ctx.blockHash)
      : await ctx.sourceService.getResolvedBlockByNumber(ctx.blockNumber!);

    asserts(resolvedBlock != null);

    const xudtActionGroups = await prepareXudtActivities({ marketService: ctx.marketService, resolvedBlock });
    const ckbActionGroups = await prepareCkbActivities({ marketService: ctx.marketService, resolvedBlock });
    const sporeActionGroups = await prepareSporeActivities({ marketService: ctx.marketService, resolvedBlock });

    const txHashes = resolvedBlock.transactions.map((tx) => tx.hash);
    // concat xudt and ckb action groups and order by tx sequence
    const actionGroups = R.pipe(
      [...ckbActionGroups, ...xudtActionGroups, ...sporeActionGroups],
      R.sortBy((actionGroup) => txHashes.indexOf(actionGroup.action.txHash)),
      R.map((actionGroup) => ({
        actionAddresses: actionGroup.actionAddresses.map((actionAddress) => ({
          ...actionAddress,
          volume: setMaxForOverflow(maxVolume, actionAddress.volume)?.toString(),
        })),
      })),
    );

    return actionGroups
      .flatMap((item) => item.actionAddresses)
      .map<TxAssetDetailInsert>((item) => ({
        network: 'ckb',
        block_hash: toHexNo0x(resolvedBlock.header.hash),
        block_number: item.blockNumber,
        tx_index: item.txIndex,
        tx_hash: toHexNo0x(item.txHash),
        address: toHexNo0x(item.address),
        timestamp: dayjs(Number(resolvedBlock.header.timestamp)).unix(),
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
