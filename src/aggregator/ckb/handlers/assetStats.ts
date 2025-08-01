import { bytes } from '@ckb-lumos/lumos/codec';
import { eq, sql } from 'drizzle-orm';
import * as R from 'remeda';

import { chunkSql } from '~/aggregator/utils';
import { db } from '~/server/db';
import { actionAddress, assetInfo, assetStats, txAction } from '~/server/db/schema';

import { createCkbSubHandler } from '.';
import activityHandler from './activity';

const assetStatsHandler = createCkbSubHandler({
  name: 'assetStats',
  prepare: async (ctx) => {
    const activities = await activityHandler.prepare!(ctx);

    return R.pipe(
      activities,
      R.groupBy(({ action }) => action.assetId ?? undefined),
      R.mapValues((actionGroups) => {
        const txHashes = actionGroups.map(({ action }) => action.txHash);
        // the new holder can only appear in the outputs
        const holderAddresses = R.pipe(
          actionGroups,
          R.flatMap(({ actionAddresses }) => actionAddresses),
          R.filter(({ fromOrTo }) => fromOrTo === 'to'),
          R.map(({ address }) => address),
          R.uniqueWith(bytes.equal),
        );

        return { transactionCount: txHashes.length, holderAddresses };
      }),
      R.entries(),
      R.map(([assetId, { transactionCount, holderAddresses }]) => ({ assetId, transactionCount, holderAddresses })),
    );
  },

  save: async ({ preparedData, tx, resolvedBlock, logger }) => {
    for (const { assetId, holderAddresses, transactionCount } of preparedData) {
      const assetInfoData = await tx.query.assetInfo.findFirst({ where: eq(assetInfo.id, assetId) });
      if (!assetInfoData) {
        logger.warn(
          `Cannot find the asset ${assetId}, this could be caused by the first mint tx has been accidently skipped, skip saving the stats`,
        );
        return;
      }

      const queryResults = await chunkSql((v) => {
        const subQueries = v.map(
          (addr) =>
            sql`SELECT EXISTS
           (
                  SELECT 1
                  FROM   ${actionAddress}
                  JOIN   ${txAction}
                  ON     ${actionAddress.actionId} = ${txAction.id}
                  WHERE  ${actionAddress.address} = ${bytes.bytify(addr)}
                       AND  ${txAction.assetId}=${bytes.bytify(assetId)}
                       AND  ${txAction.blockNumber} < ${Number(resolvedBlock.header.number)})`,
        );
        return db.execute<{ exists: boolean }>(sql.join(subQueries, sql` union all `));
      }, holderAddresses);

      const newHolderCount = queryResults.filter(({ exists }) => !exists).length;

      await tx
        .insert(assetStats)
        .values({ assetId, holderCount: newHolderCount, transactionCount })
        .onConflictDoUpdate({
          target: [assetStats.assetId],
          set: {
            holderCount: sql`${assetStats.holderCount} + ${newHolderCount}`,
            transactionCount: sql`${assetStats.transactionCount} + ${transactionCount}`,
          },
        });
    }
  },
});

export default assetStatsHandler;
