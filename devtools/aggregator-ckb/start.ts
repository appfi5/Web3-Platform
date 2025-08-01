import { createBlockService } from '~/aggregator/ckb/block-service';
import { run } from '~/aggregator/ckb/run';

const service = createBlockService();
const info = await service.getLastBlockInfo();

run({
  // for local dev, use the env first
  // startBlockNumber: process.env.START_BLOCK_NUMBER
  //   ? Number(process.env.START_BLOCK_NUMBER)
  //   : (info?.blockNumber ?? -1) + 1,
  startBlockNumber: info ? undefined : +(process.env.START_BLOCK_NUMBER ?? ''),
  preparationConcurrency: process.env.PREPARATION_CONCURRENCY ? Number(process.env.PREPARATION_CONCURRENCY) : undefined,
  preparationBufferSize: process.env.PREPARATION_BUFFER_SIZE ? Number(process.env.PREPARATION_BUFFER_SIZE) : undefined,
});
