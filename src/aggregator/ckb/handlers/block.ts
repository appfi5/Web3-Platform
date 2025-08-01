import { eq } from 'drizzle-orm';

import { createCkbSubHandler } from '~/aggregator/ckb/handlers/index';
import { blocks } from '~/server/db/schema';

const blockHandler = createCkbSubHandler({
  name: 'block',
  save: async (ctx) => {
    const block = ctx.resolvedBlock;
    await ctx.tx
      .insert(blocks)
      .values({
        hash: block.header.hash,
        txCount: block.transactions.length,
        number: Number(block.header.number),
        network: 'CKB',
      })
      .onConflictDoNothing();
  },
  rollback: async (ctx) => {
    await ctx.tx.delete(blocks).where(eq(blocks.hash, ctx.resolvedBlock.header.hash));
  },
});

export default blockHandler;
