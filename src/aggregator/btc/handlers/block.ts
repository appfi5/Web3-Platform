import { eq } from 'drizzle-orm';

import { createBTCSubHandler } from '~/aggregator/btc/handlers/index';
import { blocks } from '~/server/db/schema';

const blockHandler = createBTCSubHandler({
  name: 'block',
  save: async (ctx) => {
    const block = ctx.resolvedBlock;
    await ctx.tx.insert(blocks).values({
      hash: block.hash,
      txCount: block.transactions.length,
      number: Number(block.height),
      network: 'BTC',
    });
  },
  rollback: async (ctx) => {
    await ctx.tx.delete(blocks).where(eq(blocks.hash, ctx.resolvedBlock.hash));
  },
});

export default blockHandler;
