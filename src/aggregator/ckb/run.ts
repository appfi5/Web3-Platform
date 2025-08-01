import pino from 'pino';
import pretty from 'pino-pretty';

import { createBlockService } from '~/aggregator/ckb/block-service';
import { combineSubHandlers } from '~/aggregator/ckb/handlers';
import { createSourceService } from '~/aggregator/ckb/source-service';
import { startProcessBlocks } from '~/aggregator/core';
import { env } from '~/env';
import { nonNullable } from '~/utils/asserts';

import { startSyncAirtable } from '../airtable/sync';
import { createMarketService } from '../services/market-service';
import { createKVStorage, initializeRedisClient } from '../services/storage';
import assetHandler from './handlers/asset';
import blockHandler from './handlers/block';
import transactionHandler from './handlers/transaction';

const CONFIRMATION = 24;
const PREPARATION_TIMEOUT = 60000;
const PREPARATION_CACHE_SIZE = 25;
const PREPARATION_CONCURRENCY = 30;
const HANDLER_RETRY_DELAY = 50;

// - prepare: in parallel, without any sequence guarantee
// - save: block by block, sub-handler by sub-handler, in sequence
// - rollback: in reverse order of the save process
const handlers = [blockHandler, transactionHandler, assetHandler];

const logger = pino(pretty({ colorize: true }));
logger.level = env.AGGREGATOR_LOG_LEVEL;
const sourceService = createSourceService({ rpcUrl: nonNullable(env.CKB_RPC_URL, 'env.CKB_RPC_URL') });
const blockService = createBlockService();
const marketService = createMarketService();
const handler = combineSubHandlers(handlers, { sourceService, logger, marketService });

const storageScope = process.env.KV_SCOPE ?? 'ckb';

if (env.REDIS_URL) {
  await initializeRedisClient({ url: env.REDIS_URL, logger, migrateFromPostgreStorageScope: storageScope });
}
const storage = createKVStorage({ scope: storageScope });

export function run(
  options: { startBlockNumber?: number; preparationConcurrency?: number; preparationBufferSize?: number } = {},
) {
  startSyncAirtable({ logger });
  runBlockSync(options);
}

function runBlockSync(
  options: { startBlockNumber?: number; preparationConcurrency?: number; preparationBufferSize?: number } = {},
) {
  void Promise.all([blockService.getLastBlockInfo(), sourceService.getLastBlockInfo()]).then(
    ([localLastBlock, sourceLastBlock]) => {
      const startBlockNumber = options.startBlockNumber ?? (localLastBlock?.blockNumber ?? -1) + 1;
      const validTargetBlockNumber = (sourceLastBlock?.blockNumber ?? 8000) - 8000;
      const preparationBufferSize = options.preparationBufferSize ?? PREPARATION_CACHE_SIZE;

      logger.info(`start from: ${startBlockNumber}, valid target block: ${validTargetBlockNumber}`);

      startProcessBlocks({
        handler,
        logger,
        startBlockNumber,
        validTargetBlockNumber,
        preparationBufferSize,

        confirmation: CONFIRMATION,
        localInfo: blockService,
        sourceInfo: sourceService,

        handlerRetryDelay: HANDLER_RETRY_DELAY,
        preparationConcurrency: options.preparationConcurrency ?? PREPARATION_CONCURRENCY,
        preparationTimeout: PREPARATION_TIMEOUT,
        storage,
      });
    },
  );
}
