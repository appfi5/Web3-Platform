import { run } from '~/aggregator/btc/run';

run({
  startBlockNumber: +(process.env.START_BLOCK_NUMBER ?? ''),
  endBlockNumber: process.env.END_BLOCK_NUMBER ? +process.env.END_BLOCK_NUMBER : undefined,
  preparationConcurrency: process.env.PREPARATION_CONCURRENCY ? Number(process.env.PREPARATION_CONCURRENCY) : undefined,
  preparationBufferSize: process.env.PREPARATION_BUFFER_SIZE ? Number(process.env.PREPARATION_BUFFER_SIZE) : undefined,
});
