import pino from 'pino';
import pretty from 'pino-pretty';

import { createBlockService } from '~/aggregator/btc/block-service';
import { combineSubHandlers } from '~/aggregator/btc/handlers';
import { createSourceService } from '~/aggregator/btc/source-service';
import { startProcessBlocks } from '~/aggregator/core';
import { env } from '~/env';
import { decorate } from '~/utils/memoizeAsync';

import { createMarketService } from '../services/market-service';
import { createKVStorage, initializeRedisClient } from '../services/storage';
import blockHandler from './handlers/block';
import transactionHandler from './handlers/transaction';

const CONFIRMATION = 6;
const PREPARATION_CACHE_SIZE = 100;
const PREPARATION_CONCURRENCY = 20;
const HANDLER_RETRY_DELAY = 50;
const PREPARATION_TIMEOUT = env.AGGREGATOR_PREPARATION_TIMEOUT ?? 800000;

const logger = pino(pretty({ colorize: true }));
logger.level = env.AGGREGATOR_LOG_LEVEL;

const storageScope = process.env.KV_SCOPE ?? 'btc';

if (env.REDIS_URL) {
  await initializeRedisClient({ url: env.REDIS_URL, logger, migrateFromPostgreStorageScope: storageScope });
}
const storage = createKVStorage({ scope: storageScope });

// put the handlers here in the save sequence,
// e.g., block -> transaction -> cell...

const handlers = [blockHandler, transactionHandler];

export function run(
  options: {
    startBlockNumber?: number;
    endBlockNumber?: number;
    preparationConcurrency?: number;
    preparationBufferSize?: number;
  } = {},
) {
  const preparationBufferSize = options.preparationBufferSize ?? PREPARATION_CACHE_SIZE;
  const preparationConcurrency = options.preparationConcurrency ?? PREPARATION_CONCURRENCY;
  const sourceService = createSourceService();
  Object.assign(sourceService, {
    getResolvedBlock: decorate(sourceService.getResolvedBlock.bind(sourceService), {
      maxCacheSize: preparationBufferSize + preparationConcurrency * 2,
    }),
  });
  const blockService = createBlockService(options.endBlockNumber);
  const marketService = createMarketService();
  const handler = combineSubHandlers(handlers, { sourceService, logger, marketService, resolveBlockInterval: 20_000 });
  const shouldStopSaveBlock = ({ blockNumber }: { blockNumber: number }) =>
    !!options.endBlockNumber && blockNumber >= options.endBlockNumber;
  void Promise.all([blockService.getLastBlockInfo(), sourceService.getLastBlockInfo()]).then(
    ([localLastBlock, sourceLastBlock]) => {
      const startBlockNumber = Math.max(options.startBlockNumber ?? 0, (localLastBlock?.blockNumber ?? -1) + 1);
      const validTargetBlockNumber = (sourceLastBlock?.blockNumber ?? 8000) - 8000;

      logger.info(`start from: ${startBlockNumber}, valid target block: ${validTargetBlockNumber}`);

      startProcessBlocks({
        handler,
        logger,
        startBlockNumber,
        shouldStopSaveBlock,
        validTargetBlockNumber,
        confirmation: CONFIRMATION,
        localInfo: blockService,
        sourceInfo: sourceService,

        preparationBufferSize,
        handlerRetryDelay: HANDLER_RETRY_DELAY,
        preparationConcurrency,
        preparationTimeout: PREPARATION_TIMEOUT,
        storage,
      });
    },
  );
}
