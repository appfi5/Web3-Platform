import { bytes, type BytesLike, Uint8 } from '@ckb-lumos/lumos/codec';
import BigNumber from 'bignumber.js';
import { eq, sql } from 'drizzle-orm';
import { differenceWith, isEqual } from 'es-toolkit';
import * as R from 'remeda';

import type { ResolvedBlock, ResolvedInput, ResolvedOutput } from '~/aggregator/ckb/types';
import { getAssetInfo, isScriptOf } from '~/aggregator/ckb/utils';
import { type DbTransaction, type Logger } from '~/aggregator/types';
import { NATIVE_ASSETS } from '~/constants';
import { LUMOS_CONFIG } from '~/lib/constant';
import { assetInfo, type AssetProtocolEnum, assetToProtocol, assetToTag, lastestMarket } from '~/server/db/schema';

import { createCkbSubHandler } from '.';

const getCellsAssets = R.piped(
  R.map<ResolvedInput[] | ResolvedOutput[], ReturnType<typeof getAssetInfo>>(getAssetInfo),
  R.filter((v): v is NonNullable<ReturnType<typeof getAssetInfo>> => R.isDefined(v) && v.id !== NATIVE_ASSETS.CKB),
);

export async function prepare({ block, logger }: { block: ResolvedBlock; logger?: Logger }) {
  const [, ...txs] = block.transactions;

  type PreparedAsset = typeof assetInfo.$inferInsert & { tags: string[]; protocols: AssetProtocolEnum[] };
  const mintedAssets = txs.flatMap<PreparedAsset>(({ inputs, outputs }) => {
    const outputAssets = getCellsAssets(outputs);
    const inputAssets = getCellsAssets(inputs);
    const mintedAssetIds = differenceWith(
      outputAssets.map((v) => v.id),
      inputAssets.map((v) => v.id),
      isEqual,
    );
    if (!mintedAssetIds.length) return [];
    const mintedAssets = outputAssets.filter((v) => mintedAssetIds.includes(v.id));
    if (mintedAssets.length === 1) {
      // when minted a new xudt, try to find the unique cell
      const { id, value, ...info } = mintedAssets[0]!;
      const uniqueCell = outputs.find((cell) => isScriptOf(cell.cellOutput.type, LUMOS_CONFIG.SCRIPTS.UNIQUE));

      if (uniqueCell) {
        try {
          const uniqueData = decodeUniqueData(uniqueCell.data);
          return [
            {
              id,
              layer: 2,
              name: uniqueData.name,
              symbol: uniqueData.symbol,
              decimals: uniqueData.decimals,
              firstFoundBlock: block.header.hash,
              firstMintAt: new Date(Number(block.header.timestamp)),
              totalSupply: value,
              ...info,
            },
          ];
        } catch {
          logger?.warn(`Failed to decode unique data in block ${Number(block.header.number)}`);
        }
      }
    }
    return mintedAssets.map(({ id, value, ...info }) => ({
      id,
      layer: 2,
      name: 'Unknown',
      symbol: 'Unknown',
      firstFoundBlock: block.header.hash,
      firstMintAt: new Date(Number(block.header.timestamp)),
      totalSupply: value,
      ...info,
    }));
  });

  return R.pipe(
    mintedAssets,
    R.groupBy(R.prop('id')),
    R.values(),
    R.map((v) => ({
      ...v[0],
      totalSupply: R.sumBy(v, (asset) => asset.totalSupply ?? BigInt(0)),
    })),
  );
}

export function decodeUniqueData(data: BytesLike): { decimals: number; name: string; symbol: string } {
  const bin = bytes.bytify(data);

  const nameLen = Uint8.unpack(bin.slice(1, 2));
  const name = new TextDecoder().decode(bin.slice(2, 2 + nameLen));
  const symbolLen = Uint8.unpack(bin.slice(2 + nameLen, 2 + nameLen + 1));
  const symbol = new TextDecoder().decode(bin.slice(2 + nameLen + 1, 2 + nameLen + 1 + symbolLen));

  return { decimals: Uint8.unpack(bin.slice(0, 1)), name, symbol };
}

async function updateMarketSupply(ctx: { tx: DbTransaction; preparedData: Awaited<ReturnType<typeof prepare>> }) {
  const existMarket = await ctx.tx.query.lastestMarket.findMany({
    where(fields, operators) {
      return operators.inArray(
        fields.assetId,
        ctx.preparedData.map((v) => v.id),
      );
    },
  });
  if (!existMarket.length) return;
  const assetAddSupply = R.mapToObj(ctx.preparedData, (v) => [
    v.id,
    BigNumber(v.totalSupply.toString()).div(v.decimals ?? 8),
  ]);
  const updatedMarket = existMarket.map((v) => {
    const totalSupply = BigNumber(v.totalSupply ?? 0).plus(assetAddSupply[v.assetId]?.toString() ?? 0);
    return {
      ...v,
      totalSupply: totalSupply.toString(),
      marketCap: v.price ? BigNumber(v.price).multipliedBy(totalSupply).toString() : null,
    };
  });
  await ctx.tx
    .insert(lastestMarket)
    .values(updatedMarket)
    .onConflictDoUpdate({
      target: [lastestMarket.assetId],
      set: {
        totalSupply: sql`excluded.total_supply`,
        marketCap: sql`excluded.market_cap`,
      },
    });
}

export default createCkbSubHandler({
  name: 'assetInfo',
  prepare: async (ctx) => {
    return prepare({ block: ctx.resolvedBlock, logger: ctx.logger });
  },
  save: async (ctx) => {
    if (ctx.preparedData.length <= 0) {
      return;
    }
    await ctx.tx
      .insert(assetInfo)
      .values(ctx.preparedData)
      .onConflictDoUpdate({
        target: [assetInfo.id],
        set: {
          totalSupply: sql`${assetInfo.totalSupply} + EXCLUDED.total_supply`,
        },
      });
    await updateMarketSupply(ctx);
    const tags = ctx.preparedData.flatMap((asset) =>
      asset.tags.map((tag) => ({ assetTagLabel: tag, assetId: asset.id })),
    );
    if (tags.length) await ctx.tx.insert(assetToTag).values(tags).onConflictDoNothing();

    const protocols = ctx.preparedData.flatMap((asset) =>
      asset.protocols.map((protocol) => ({ assetId: asset.id, protocol })),
    );
    if (protocols.length) await ctx.tx.insert(assetToProtocol).values(protocols).onConflictDoNothing();
  },
  rollback: async (ctx) => {
    await ctx.tx.delete(assetInfo).where(eq(assetInfo.firstFoundBlock, ctx.resolvedBlock.header.hash));
  },
});
