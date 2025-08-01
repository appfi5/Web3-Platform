import { asValue, createContainer } from 'awilix';
import pino from 'pino';
import pretty from 'pino-pretty';
import * as R from 'remeda';
import { scheduler } from 'timers/promises';

import activityHandler, { type ClickHouseHandlerCtx } from '~/aggregator/ckb/handlers/activity-ch';
import { createSourceService } from '~/aggregator/ckb/source-service';
import { type ResolvedBlock } from '~/aggregator/ckb/types';
import { clickhouse, createBlockService, type TxAssetDetailInsert } from '~/aggregator/clickhouse';
import { startBatchSync, startSequntialSync } from '~/aggregator/core';
import { takeReorgBlocks } from '~/aggregator/core/reorg';
import { type BatchHandler } from '~/aggregator/core/sync-batch';
import { createMarketService } from '~/aggregator/services/market-service';
import { createKVStorage, initializeRedisClient } from '~/aggregator/services/storage';
import { type SequenceBlockHandler } from '~/aggregator/types';
import { env } from '~/env';
import { nonNullable } from '~/utils/asserts';
import { decorate } from '~/utils/memoizeAsync';

// settings
const CONFIRMATION = 24;
const PREPARATION_TIMEOUT = 60000;
const PREPARATION_BUFFER_SIZE = Number(env.AGGREGATOR_PREPARATION_BUFFER_SIZE ?? 500);
const PREPARATION_CONCURRENCY = Number(env.AGGREGATOR_PREPARATION_CONCURRENCY ?? 30);
const HANDLER_RETRY_DELAY = 50;
const LOGGER_LEVEL = env.AGGREGATOR_LOG_LEVEL || 'info';
const ROLLBACK_WAIT_TIME = 30_000;
const CKB_RPC_URL = nonNullable(process.env.CKB_RPC_URL);

// initial dependencies
const blockService = createBlockService({ network: 'ckb' });

const logger = pino(pretty({ colorize: true }));
logger.level = LOGGER_LEVEL;

const sourceService = createSourceService({ rpcUrl: CKB_RPC_URL });
const maxCacheSize = PREPARATION_BUFFER_SIZE + PREPARATION_CONCURRENCY;
const memoizedGetResolvedBlock = decorate(sourceService.getResolvedBlock.bind(sourceService), {
  maxCacheSize,
});
const memoizedGetResolvedBlockByNumber = decorate(sourceService.getResolvedBlockByNumber.bind(sourceService), {
  maxCacheSize,
});
Object.assign(sourceService, {
  getResolvedBlock: memoizedGetResolvedBlock,
  getResolvedBlockByNumber: memoizedGetResolvedBlockByNumber,
});

const marketService = createMarketService();

const storageScope = process.env.KV_SCOPE ?? 'ckb-clickhouse';

if (env.REDIS_URL) {
  await initializeRedisClient({ url: env.REDIS_URL, logger, migrateFromPostgreStorageScope: storageScope });
}
const storage = createKVStorage({ scope: storageScope });

const container = createContainer<
  ClickHouseHandlerCtx & { preparedData: TxAssetDetailInsert[]; preparedDatum: TxAssetDetailInsert[][] }
>();
container.register('logger', asValue(logger));
container.register('sourceService', asValue(sourceService));
container.register('marketService', asValue(marketService));
container.register('clickhouse', asValue(clickhouse));
container.register('syncSetting', asValue({ confirmation: CONFIRMATION }));
function createScopedContainer({
  preparedDatum,
  preparedData,
  blockNumber,
  blockHash,
}: {
  preparedDatum?: TxAssetDetailInsert[][];
  preparedData?: TxAssetDetailInsert[];
  resolvedBlock?: ResolvedBlock;
  blockNumber?: number;
  blockHash?: string;
}): ClickHouseHandlerCtx & { preparedData: TxAssetDetailInsert[]; preparedDatum: TxAssetDetailInsert[][] } {
  const scope = container.createScope();

  if (preparedData) {
    scope.register('preparedData', asValue(preparedData));
  }

  if (preparedDatum) {
    scope.register('preparedDatum', asValue(preparedDatum));
  }

  if (blockNumber != null) {
    scope.register('blockNumber', asValue(blockNumber));
  }

  if (blockHash != null) {
    scope.register('blockHash', asValue(blockHash));
  }

  return scope.cradle;
}

async function main() {
  const syncedBlockNumber = (await blockService.getLastBlockInfo())?.blockNumber ?? -1;
  const localLatestBlockNumbers = R.range(syncedBlockNumber - CONFIRMATION, syncedBlockNumber).filter(
    (value) => value >= 0,
  );
  const localBlocks = await blockService.getBlockInfosByHeights(localLatestBlockNumbers);

  const sourceBlocks = await sourceService.getBlockInfosByHeights(localLatestBlockNumbers);
  const reorgedBlocks = takeReorgBlocks(localBlocks.filter(R.isNonNullish), sourceBlocks.filter(R.isNonNullish));

  const startBlockNumber = syncedBlockNumber + 1;
  const sourceLastBlock = await sourceService.getLastBlockInfo();
  const assumedValidBlockNumber = R.clamp((sourceLastBlock?.blockNumber ?? 0) - CONFIRMATION, { min: 0 });

  logger.info(`start from: ${startBlockNumber}, valid target block: ${assumedValidBlockNumber}`);

  if (reorgedBlocks.length > 0 || assumedValidBlockNumber < startBlockNumber) {
    if (reorgedBlocks.length > 0) {
      logger.info(`Reorged blocks: ${reorgedBlocks.map((block) => block.blockNumber).join(', ')}`);
    }
    logger.info(`Run sequential sync`);
    runSequentialSync();
  } else {
    logger.info(`Run batch sync`);
    runBatchSync();
  }

  function runBatchSync() {
    const batchHandler: BatchHandler<TxAssetDetailInsert[]> = {
      prepare: async ({ blockNumber }) => {
        return activityHandler.prepare!({
          blockNumber,
          clickhouse,
          logger,
          marketService,
          sourceService,
        });
      },
      save: async (preparedDatum) => {
        await activityHandler.saveBatch!(
          createScopedContainer({ preparedDatum: preparedDatum.map((item) => item.preparedData) }),
        );
        preparedDatum.forEach((item) => memoizedGetResolvedBlockByNumber.delete(item.blockNumber));
      },
    };

    startBatchSync({
      logger: logger,
      startBlockNumber: startBlockNumber,
      endBlockNumber: assumedValidBlockNumber,
      preparationConcurrency: PREPARATION_CONCURRENCY,
      preparationBufferSize: PREPARATION_BUFFER_SIZE,
      preparationTimeout: PREPARATION_TIMEOUT,
      handlerRetryDelay: HANDLER_RETRY_DELAY,

      handler: batchHandler,
    }).onStop(() => void main());
  }

  function runSequentialSync() {
    type PreparedMap = TxAssetDetailInsert[];

    const handler: SequenceBlockHandler<PreparedMap> = {
      prepare: async ({ blockHash }) => {
        return activityHandler.prepare!(createScopedContainer({ blockHash }));
      },
      save: async ({ blockHash }, preparedData) => {
        await activityHandler.save!(createScopedContainer({ blockHash, preparedData }));
        memoizedGetResolvedBlock.delete(blockHash);
      },
      rollback: async ({ blockNumber }, preparedData) => {
        await activityHandler.rollback!(createScopedContainer({ blockNumber, preparedData }));
        await scheduler.wait(ROLLBACK_WAIT_TIME);
      },
    };

    startSequntialSync({
      handler,
      logger,
      startBlockNumber,
      validTargetBlockNumber: assumedValidBlockNumber,
      preparationBufferSize: PREPARATION_BUFFER_SIZE,

      confirmation: CONFIRMATION,
      localInfo: blockService,
      sourceInfo: sourceService,

      handlerRetryDelay: HANDLER_RETRY_DELAY,
      preparationConcurrency: PREPARATION_CONCURRENCY,
      preparationTimeout: PREPARATION_TIMEOUT,
      storage,
    });
  }
}

void main();
