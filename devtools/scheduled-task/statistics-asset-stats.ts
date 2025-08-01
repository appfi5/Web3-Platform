import { countDistinct, sql } from 'drizzle-orm';
import pino from 'pino';
import pretty from 'pino-pretty';
import * as R from 'remeda';

import { env } from '~/env';
import { db } from '~/server/db';
import { actionAddress, assetStats, txAction } from '~/server/db/schema';

const logger = pino(pretty({ colorize: true }));
logger.level = env.AGGREGATOR_LOG_LEVEL;

async function statistics() {
  const holderCounts = await db
    .select({ holderCount: countDistinct(actionAddress.address), assetId: actionAddress.assetId })
    .from(actionAddress)
    .groupBy(actionAddress.assetId);
  const holderCountMap = R.pipe(
    holderCounts,
    R.filter((v) => !!v.assetId),
    R.mapToObj((v) => [v.assetId!, v.holderCount]),
  );

  const transactionCounts = await db
    .select({ transactionCount: countDistinct(txAction.txHash), assetId: txAction.assetId })
    .from(txAction)
    .groupBy(txAction.assetId);
  const transactionCountMap = R.pipe(
    transactionCounts,
    R.filter((v) => !!v.assetId),
    R.mapToObj((v) => [v.assetId, v.transactionCount]),
  );

  const insertData = R.pipe(
    holderCountMap,
    R.keys(),
    R.concat(R.keys(transactionCountMap)),
    R.unique(),
    R.map((assetId) => ({
      assetId,
      holderCount: holderCountMap[assetId] ?? 0,
      transactionCount: transactionCountMap[assetId] ?? 0,
    })),
  );
  logger.info({ message: `assetStats: insertData is`, data: insertData });
  await db
    .insert(assetStats)
    .values(insertData)
    .onConflictDoUpdate({
      target: [assetStats.assetId],
      set: {
        holderCount: sql.raw(`EXCLUDED.${assetStats.holderCount.name}`),
        transactionCount: sql.raw(`EXCLUDED.${assetStats.transactionCount.name}`),
      },
    });
}

void (async function run() {
  logger.info(`assetStats: start statistics...`);
  await statistics();
  logger.info(`assetStats: end statistics...`);
  process.exit(0);
})();
