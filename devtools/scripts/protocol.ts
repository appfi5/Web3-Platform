// fill protocols to existing assets

import { eq, isNull } from 'drizzle-orm';
import pino from 'pino';
import pretty from 'pino-pretty';
import { concatMap, filter, from, map, mergeMap, pipe, tap } from 'rxjs';

import { NATIVE_ASSETS } from '~/constants';
import { ckbExplorerApiV1, ckbExplorerApiV2, commonHeader } from '~/server/api/routers/external/utils';
import { db } from '~/server/db';
import { assetInfo, assetToProtocol } from '~/server/db/schema';

const logger = pino(pretty({ colorize: true }));
logger.level = 'info';

// find assets that don't have protocol records
// fill protocol records for them
// if asset_id can be found in ckb explorer API v1's suggest_queries, fill protocol with the response
async function main() {
  // Get assets without protocols
  const assetsWithoutProtocol = await db
    .select({ id: assetInfo.id, meta: assetInfo.meta })
    .from(assetInfo)
    .leftJoin(assetToProtocol, eq(assetInfo.id, assetToProtocol.assetId))
    .where(isNull(assetToProtocol.assetId));

  logger.info(`Found ${assetsWithoutProtocol.length} assets without protocol`);

  from(assetsWithoutProtocol)
    .pipe(
      mergeMap(findProtocol, 20),
      tapWithIndex((assetWithProtocol, index) =>
        logger.info(`${index + 1}/${assetsWithoutProtocol.length}, ${JSON.stringify(assetWithProtocol)}`),
      ),
      filter((assetWithProtocol) => assetWithProtocol != null),
      concatMap((assetWithProtocol) =>
        db
          .insert(assetToProtocol)
          .values(assetWithProtocol)
          .then(() => assetWithProtocol),
      ),
    )
    .subscribe((assetWithProtocol) => {
      logger.info(`saved ${assetWithProtocol.assetId}`);
    });
}

const tapWithIndex = <T>(fn: (value: T, index: number) => void) =>
  pipe(
    map((x: T, i) => [x, i] as const),
    tap(([value, index]) => fn(value, index)),
    map(([value]) => value),
  );

async function findProtocol(asset: {
  id: string;
  meta: unknown;
}): Promise<typeof assetToProtocol.$inferInsert | undefined> {
  if (asset.id === NATIVE_ASSETS.CKB) {
    return { protocol: 'native_ckb', assetId: asset.id };
  }

  if (asset.id === NATIVE_ASSETS.BTC) {
    return { protocol: 'native_btc', assetId: asset.id };
  }

  if (
    asset.meta != null &&
    typeof asset.meta === 'object' &&
    'typeHash' in asset.meta &&
    typeof asset.meta.typeHash === 'string'
  ) {
    const suggestRes = await ckbExplorerApiV1.GET('/suggest_queries', {
      params: { header: commonHeader, query: { q: asset.meta.typeHash } },
    });

    if (suggestRes.data?.data.type === 'token_item') {
      return { assetId: asset.id, protocol: 'spore' };
    }

    const collectionRes = await ckbExplorerApiV2.GET('/nft/collections/{id}', {
      params: { path: { id: asset.meta.typeHash } },
    });

    if (collectionRes.data != null && collectionRes.data.standard === 'spore') {
      return { assetId: asset.id, protocol: 'spore_cluster' };
    }

    return undefined;
  }

  const suggestRes = await ckbExplorerApiV1.GET('/suggest_queries', {
    params: { header: commonHeader, query: { q: asset.id } },
  });

  if (suggestRes.data?.data.type === 'udt') {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
    const udtType = suggestRes.data.data.attributes.udt_type;

    if (udtType === 'xudt' || udtType === 'xudt_compatible') {
      return { assetId: asset.id, protocol: 'xudt' };
    }

    if (udtType === 'sudt') {
      return { assetId: asset.id, protocol: 'sudt' };
    }
  }

  logger.info(`cannot find protocol for ${asset.id}`);
}

main().catch(console.error);
