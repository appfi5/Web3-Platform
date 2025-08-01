import * as R from 'remeda';

import { type MarketService } from '~/aggregator/services/types';
import { chunkSql } from '~/aggregator/utils';
import { actionAddress, txAction } from '~/server/db/schema';

import { type ResolvedBlock } from '../types';
import { createBTCSubHandler } from '.';
import { prepareBtcActivities } from './activity/btc';
import { type ActionGroup } from './activity/types';

export async function prepare({
  resolvedBlock,
  marketService,
}: {
  resolvedBlock: ResolvedBlock;
  marketService: MarketService;
}): Promise<Array<ActionGroup>> {
  const actionGroups = await prepareBtcActivities({ resolvedBlock: resolvedBlock, marketService });

  const txHashes = resolvedBlock.transactions.map((tx) => tx.hash);
  return R.pipe(
    actionGroups,
    R.sortBy((actionGroup) => txHashes.indexOf(actionGroup.action.txHash)),
  );
}

export default createBTCSubHandler({
  name: 'activity',
  prepare,
  save: async ({ preparedData, tx }) => {
    const actionGroups = preparedData;

    if (actionGroups.length === 0) {
      return;
    }

    const actionAddresses = actionGroups.map(({ actionAddresses }) => actionAddresses);
    const actions = actionGroups.map(({ action }) => action);
    const actionIds = await chunkSql(
      (v) => tx.insert(txAction).values(v).returning({ id: txAction.id }),
      actions,
      1000,
    );
    const actionAddressInserts = R.pipe(
      R.zip(actionIds, actionAddresses),
      R.flatMap(([{ id }, actionsItem]) =>
        actionsItem.map<typeof actionAddress.$inferInsert>((item) => ({ ...item, actionId: id })),
      ),
    );
    if (actionAddressInserts.length > 0) {
      await chunkSql((v) => tx.insert(actionAddress).values(v), actionAddressInserts, 1000);
    }
  },
});
