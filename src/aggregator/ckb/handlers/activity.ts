import BigNumber from 'bignumber.js';
import * as R from 'remeda';

import { type MarketService } from '~/aggregator/services/types';
import { actionAddress, txAction } from '~/server/db/schema';

import { type ResolvedBlock } from '../types';
import { setMaxForOverflow } from '../utils';
import { createCkbSubHandler } from '.';
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

export default createCkbSubHandler({
  name: 'activity',
  prepare: async (ctx) => {
    const xudtActionGroups = await prepareXudtActivities(ctx);
    const ckbActionGroups = await prepareCkbActivities(ctx);
    const sporeActionGroups = await prepareSporeActivities(ctx);
    const resolvedBlock = ctx.resolvedBlock;

    const txHashes = resolvedBlock.transactions.map((tx) => tx.hash);
    // concat xudt and ckb action groups and order by tx sequence
    const actionGroups = R.pipe(
      [...ckbActionGroups, ...xudtActionGroups, ...sporeActionGroups],
      R.sortBy((actionGroup) => txHashes.indexOf(actionGroup.action.txHash)),
      R.map((actionGroup) => ({
        action: {
          ...actionGroup.action,
          volume: setMaxForOverflow(maxVolume, actionGroup.action.volume)?.toString(),
        },
        actionAddresses: actionGroup.actionAddresses.map((actionAddress) => ({
          ...actionAddress,
          volume: setMaxForOverflow(maxVolume, actionAddress.volume)?.toString(),
        })),
      })),
    );

    return actionGroups;
  },

  save: async ({ preparedData, tx }) => {
    const actionGroups = preparedData;

    if (actionGroups.length === 0) {
      return;
    }

    const actionAddresses = actionGroups.map(({ actionAddresses }) => actionAddresses);
    const actions = actionGroups.map(({ action }) => action);
    const actionIds = await tx.insert(txAction).values(actions).returning({ id: txAction.id });
    const actionAddressInserts = R.pipe(
      R.zip(actionIds, actionAddresses),
      R.flatMap(([{ id }, actionsItem]) =>
        actionsItem.map<typeof actionAddress.$inferInsert>((item) => ({ ...item, actionId: id })),
      ),
    );
    if (actionAddressInserts.length > 0) {
      await tx.insert(actionAddress).values(actionAddressInserts);
    }
  },
});
