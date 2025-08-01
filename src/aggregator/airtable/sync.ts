import { sql } from 'drizzle-orm';
import { defer, forkJoin, mergeMap, repeat, retry, tap, timeout } from 'rxjs';

import { airtable } from '~/clients';
import { db } from '~/server/db';
import { assetInfo, assetTag, assetToTag } from '~/server/db/schema';

import { type Logger } from '../types';

export function syncAssetAndTagsFromAirtable({ logger }: { logger?: Logger } = {}) {
  const syncAirtable$ = defer(() => forkJoin([airtable.getAssets(), airtable.getAssetTags()])).pipe(
    tap({
      next: () => logger?.debug('💨 Fetch data from Airtable success'),
      error: (error: Error) => logger?.error({ err: error, msg: '💨❌ Failed to fetch data from Airtable' }),
    }),
    mergeMap(async ([assetRes, assetTagRes]) => {
      await db.transaction(async (tx) => {
        // upsert assetTag
        if (assetTagRes.length > 0) {
          await tx
            .insert(assetTag)
            .values(
              assetTagRes.map<typeof assetTag.$inferInsert>((item) => ({
                label: item.fields.label,
                style: item.fields.style,
              })),
            )
            .onConflictDoUpdate({
              target: [assetTag.label],
              set: { style: sql.raw(`excluded.${assetTag.style.name}`) },
            });
        }

        // upsert asset
        const assetValues = assetRes
          .map((item) => item.fields)
          .map<typeof assetInfo.$inferInsert>((item) => ({
            id: item.id,
            icon: item.icon,
            layer: item.layer ?? 1,
            name: item.name ?? '',
            symbol: item.symbol,
            decimals: item.decimals,
            totalSupply: item.total_supply ? BigInt(item.total_supply) : undefined,
            public: item.public ?? false,
            keywords: item.keywords,
          }));
        await tx
          .insert(assetInfo)
          .values(assetValues)
          .onConflictDoUpdate({
            target: [assetInfo.id],
            set: {
              public: sql.raw(`excluded.${assetInfo.public.name}`),
              icon: sql.raw(`excluded.${assetInfo.icon.name}`),
              layer: sql.raw(`excluded.${assetInfo.layer.name}`),
              name: sql.raw(`excluded.${assetInfo.name.name}`),
              symbol: sql.raw(`excluded.${assetInfo.symbol.name}`),
              decimals: sql.raw(`excluded.${assetInfo.decimals.name}`),
              totalSupply: sql.raw(`excluded.${assetInfo.totalSupply.name}`),
              keywords: sql.raw(`excluded.${assetInfo.keywords.name}`),
              description: sql.raw(`excluded.${assetInfo.description.name}`),
            },
          });

        // refresh assetToTag
        const assetToTagValues = assetRes.flatMap((assetItem) =>
          (assetItem.fields.tags ?? [])
            .map((tagId) => assetTagRes.find((assetTagItem) => assetTagItem.id === tagId))
            .filter((tagItem) => tagItem != null)
            .map<typeof assetToTag.$inferInsert>((tagItem) => ({
              assetId: assetItem.fields.id,
              assetTagLabel: tagItem.fields.label,
            })),
        );

        if (assetToTagValues.length > 0) {
          await tx.delete(assetToTag);
          await tx.insert(assetToTag).values(assetToTagValues);
        }
      });

      return { assets: assetRes, assetTags: assetTagRes };
    }),
  );

  return syncAirtable$;
}

export function startSyncAirtable({
  scanInterval = 30_000,
  handleTimeout = 20_000,
  logger,
}: {
  scanInterval?: number;
  handleTimeout?: number;
  logger: Logger;
}) {
  const tapError = <T>(header?: string) =>
    tap<T>({
      error: (error: Error) => {
        logger.error({ err: error, msg: `❌ ${header ?? ''}` });
      },
    });

  syncAssetAndTagsFromAirtable({ logger })
    .pipe(
      timeout(handleTimeout),
      tapError('Failed to sync data from Airtable'),
      retry(),
      repeat({ delay: scanInterval }),
    )
    .subscribe({
      next: ({ assets, assetTags }) =>
        logger.info(`💨 Updated ${assets.length} assets and ${assetTags.length} asset-tags`),
      error: (err: Error) => logger.error({ msg: '💨❌ Failed to sync data from Airtable', err }),
    });
}
