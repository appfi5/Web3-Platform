import * as R from 'remeda';
import { z } from 'zod';

import { createTRPCRouter, publicProcedure } from '../../trpc';

export const feedRouter = createTRPCRouter({
  hotAssets: publicProcedure
    .meta({
      openapi: { path: '/v0/feed/hot-assets', method: 'GET' },
    })
    .input(z.undefined())
    .output(
      z.array(
        z.object({
          id: z.string().describe('Asset ID'),
          name: z.string().describe('Asset name'),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const assets = await ctx.airtable.getAssets();
      const list = R.pipe(
        assets,
        R.filter(({ fields }) => !!fields.hot_token),
        R.sortBy(({ fields }) => fields.hot_token ?? 0),
        R.map(({ fields }) => ({
          id: fields.id,
          name: fields.name,
        })),
      );
      return list;
    }),
  hotAssetTags: publicProcedure
    .meta({
      openapi: { path: '/v0/feed/hot-asset-tags', method: 'GET' },
    })
    .input(z.undefined())
    .output(
      z.array(
        z.object({
          label: z.string().describe('Asset tag label'),
        }),
      ),
    )
    .query(async ({ ctx }) => {
      const assetTags = await ctx.airtable.getAssetTags();
      const list = R.pipe(
        assetTags,
        R.filter(({ fields }) => !!fields.hot_category),
        R.sortBy(({ fields }) => fields.hot_category ?? 0),
        R.map(({ fields }) => ({
          label: fields.label,
        })),
      );
      return list;
    }),
});
