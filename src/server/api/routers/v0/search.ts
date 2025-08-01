import { type Script } from '@ckb-lumos/lumos';
import { addressToScript } from '@ckb-lumos/lumos/helpers';
import BigNumber from 'bignumber.js';
import { eq } from 'drizzle-orm';
import { type Kysely } from 'kysely';
import { z } from 'zod';

import { LUMOS_CONFIG } from '~/lib/constant';
import { createHelper, type Database } from '~/server/ch';
import { type DB } from '~/server/db';
import { assetInfo, holders } from '~/server/db/schema';
import { isValidBTCAddress } from '~/utils/bitcoin';
import { toHexWith0x } from '~/utils/bytes';

import { createTRPCRouter, publicProcedure } from '../../trpc';
import {
  type addressProperty,
  type blockProperty,
  type chainProperty,
  matchedResult,
  SearchResultType,
  type tokenProperty,
  type txProperty,
} from '../zod-helper/search';

type SearchResult<T, P> = { type: T; property: P; tags: string[]; matched: string };
type SearchBlockResult = SearchResult<typeof SearchResultType.Block, z.infer<typeof blockProperty>>;

async function searchBlock(blockNumber: number, ch: Kysely<Database>): Promise<SearchBlockResult[] | undefined> {
  const { hex } = createHelper();
  const block = await ch
    .selectFrom('mv_block_info')
    .select([hex('block_hash'), 'block_number', 'network'])
    .where('block_number', '=', blockNumber)
    .execute();

  return block.map((v) => ({
    type: SearchResultType.Block,
    tags: ['Block', v.network === 'ckb' ? 'CKB' : v.network === 'btc' ? 'BTC' : ''],
    matched: `#${blockNumber}`,
    property: {
      number: Number(blockNumber),
      hash: toHexWith0x(v.block_hash),
      network: v.network,
    },
  }));
}

async function searchAsset(
  name: string,
  db: DB,
): Promise<
  (
    | SearchResult<typeof SearchResultType.Chain, z.infer<typeof chainProperty>>
    | SearchResult<typeof SearchResultType.Token, z.infer<typeof tokenProperty>>
  )[]
> {
  const matched = await db.query.assetInfo.findMany({
    where(fields, operators) {
      return operators.and(
        operators.or(
          operators.ilike(fields.symbol, `%${name}%`),
          operators.ilike(fields.name, `%${name}%`),
          operators.ilike(fields.keywords, `%${name}%`),
        ),
        operators.eq(fields.public, true),
      );
    },
    with: { parent: true },
  });
  return matched
    .map<
      (
        | SearchResult<typeof SearchResultType.Chain, z.infer<typeof chainProperty>>
        | SearchResult<typeof SearchResultType.Token, z.infer<typeof tokenProperty>>
      )[]
    >((v) => {
      const meta = v.meta as { type: string | null };
      const symbol = v.parent?.symbol ?? v.symbol;
      if (
        v.layer === 1 &&
        [v.name.toLowerCase(), v.keywords?.toLowerCase()].some((v) => v?.includes(name.toLowerCase()))
      ) {
        // for chain, do not match symbol
        return [
          // {
          //   type: SearchResultType.Chain,
          //   tags: ['Chain', v.name],
          //   matched: v.name,
          //   property: {
          //     uid: v.id.toString(),
          //     name: v.name,
          //     type: env.NEXT_PUBLIC_IS_MAINNET ? 'mainnet' : 'testnet',
          //   },
          // },
          {
            type: SearchResultType.Token,
            tags: symbol ? ['Token', symbol, v.name] : ['Token', v.name],
            matched: v.name,
            property: {
              uid: v.id.toString(),
              chain: v.parent?.name ?? v.name,
              symbol: v.symbol,
              decimals: v.decimals,
              type: meta.type,
            },
          },
        ];
      }
      return [
        {
          type: SearchResultType.Token,
          tags: symbol ? ['Token', symbol, v.name] : ['Token', v.name],
          matched: v.name,
          property: {
            uid: v.id.toString(),
            chain: v.parent?.name ?? v.name,
            symbol: v.symbol,
            decimals: v.decimals,
            type: meta.type,
          },
        },
      ];
    })
    .flat();
}

async function searchAddress(
  address: string,
  db: DB,
): Promise<SearchResult<typeof SearchResultType.Address, z.infer<typeof addressProperty>>[]> {
  let formatAddress: Script | string = address;
  try {
    formatAddress = addressToScript(address, {
      config: LUMOS_CONFIG,
    });
  } catch {}
  const holder = await db.query.holders.findMany({
    where: eq(holders.address, formatAddress),
    with: { assetInfo: true },
  });
  if (holder.length) {
    return [
      {
        type: SearchResultType.Address,
        matched: address,
        tags: ['Address', ...holder.map((v) => v.assetInfo.name)],
        property: {
          uid: address,
          chain: holder.length > 1 ? 'Multiple' : holder[0]!.assetInfo.name,
          chainNames: holder.map((v) => v.assetInfo.name),
          assetsAmountUsd: holder.reduce((pre, cur) => pre.plus(BigNumber(cur.amount)), BigNumber(0)).toString(),
        },
      },
    ];
  }
  if (isValidBTCAddress(address)) {
    return [
      {
        type: SearchResultType.Address,
        matched: address,
        tags: ['Address', 'BTC'],
        property: {
          uid: address,
          chain: 'BTC',
          chainNames: ['BTC'],
        },
      },
    ];
  }
  if (typeof formatAddress !== 'string') {
    return [
      {
        type: SearchResultType.Address,
        matched: address,
        tags: ['Address', 'CKB'],
        property: {
          uid: address,
          chain: 'CKB',
          chainNames: ['CKB'],
        },
      },
    ];
  }
  return [];
}

async function searchTx(
  hash: string,
  db: DB,
  ch: Kysely<Database>,
): Promise<SearchResult<typeof SearchResultType.Transaction, z.infer<typeof txProperty>>[]> {
  const hashStartWith0x = hash.startsWith('0x') ? hash : `0x${hash}`;
  if (hashStartWith0x.length !== 66) {
    return [];
  }
  const { hex, unhex } = createHelper();
  const findTx = await ch
    .selectFrom('tx_action')
    .select([hex('asset_id'), 'volume'])
    .where('tx_hash', '=', unhex(hash))
    .orderBy('volume desc')
    .limit(1)
    .executeTakeFirst();

  if (!findTx) return [];

  const foundAssetInfo = await db.query.assetInfo.findFirst({
    where: eq(assetInfo.id, findTx.asset_id),
  });

  return [
    {
      type: SearchResultType.Transaction,
      matched: hashStartWith0x,
      tags: ['Transaction', foundAssetInfo?.name ?? ''],
      property: {
        hash: hashStartWith0x,
        chain: foundAssetInfo?.name ?? '',
        txAmountUsd: String(findTx.volume),
      },
    },
  ];
}

export const searchRouter = createTRPCRouter({
  query: publicProcedure
    .meta({ openapi: { path: '/v0/search', method: 'GET' } })
    .input(z.object({ q: z.string().min(1) }))
    .output(z.array(matchedResult.and(z.object({ tags: z.array(z.string()), matched: z.string() }))).optional())
    // home.search
    .query(async ({ input, ctx }) => {
      if (!Number.isNaN(+input.q) && !input.q.startsWith('0x')) {
        return searchBlock(+input.q, ctx.ch);
      }
      const result = await Promise.all([
        searchAsset(input.q, ctx.db),
        searchAddress(input.q, ctx.db),
        searchTx(input.q, ctx.db, ctx.ch),
      ]);
      return result.flat();
    }),
});
