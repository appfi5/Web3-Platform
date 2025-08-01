import { type Script } from '@ckb-lumos/lumos';
import { addressToScript } from '@ckb-lumos/lumos/helpers';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import { and, eq, gte, inArray, sql } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { expressionBuilder, type Kysely } from 'kysely';
import * as R from 'remeda';
import { z } from 'zod';

import { NATIVE_ASSETS } from '~/constants';
import { LUMOS_CONFIG } from '~/lib/constant';
import * as zodHelper from '~/server/api/routers/zod-helper';
import { paginationSchema } from '~/server/api/routers/zod-helper';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { createHelper, type Database } from '~/server/ch';
import {
  assetInfo,
  type AssetProtocolEnum,
  historyPrice,
  holders,
  lastestMarket,
  searchStatistics,
} from '~/server/db/schema';
import {
  type addressProperty,
  type blockProperty,
  type chainProperty,
  matchedResult,
  SearchResultType,
  type tokenProperty,
  type txProperty,
} from '~/server/types/home';
import { isValidBTCAddress } from '~/utils/bitcoin';
import { toHexWith0x } from '~/utils/bytes';

import { zAddressLike, zBytesLike, zDate, zNumber, zNumberString } from './zod-helper/basic';

// eslint-disable-next-line @typescript-eslint/consistent-type-imports
type DB = PostgresJsDatabase<typeof import('~/server/db/schema')>;
type SearchResult<T, P> = { type: T; property: P; tags: string[]; matched: string };
type SearchBlockResult = SearchResult<SearchResultType.Block, z.infer<typeof blockProperty>>;

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
      chain: v.network === 'ckb' ? 'CKB' : v.network === 'btc' ? 'BTC' : '',
    },
  }));
}

async function searchAsset(
  name: string,
  db: DB,
): Promise<
  (
    | SearchResult<SearchResultType.Chain, z.infer<typeof chainProperty>>
    | SearchResult<SearchResultType.Token, z.infer<typeof tokenProperty>>
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
        | SearchResult<SearchResultType.Chain, z.infer<typeof chainProperty>>
        | SearchResult<SearchResultType.Token, z.infer<typeof tokenProperty>>
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
): Promise<SearchResult<SearchResultType.Address, z.infer<typeof addressProperty>>[]> {
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
          usedChain: holder.map((v) => v.assetInfo.name),
          assetSumToUSD: holder.reduce((pre, cur) => pre.plus(BigNumber(cur.amount)), BigNumber(0)).toString(),
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
          usedChain: ['BTC'],
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
          usedChain: ['CKB'],
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
): Promise<SearchResult<SearchResultType.Transaction, z.infer<typeof txProperty>>[]> {
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
        totalValue: String(findTx.volume),
      },
    },
  ];
}

export const homeRouter = createTRPCRouter({
  search: publicProcedure
    .input(z.string().min(2))
    .output(z.array(matchedResult.and(z.object({ tags: z.array(z.string()), matched: z.string() }))).optional())
    .query(async ({ input, ctx }) => {
      if (!Number.isNaN(+input) && !input.startsWith('0x')) {
        return searchBlock(+input, ctx.ch);
      }
      const result = await Promise.all([
        searchAsset(input, ctx.db),
        searchAddress(input, ctx.db),
        searchTx(input, ctx.db, ctx.ch),
      ]);
      return result.flat();
    }),
  getLatestMarket: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const marketInfo = await ctx.db.query.lastestMarket.findFirst({ where: eq(lastestMarket.assetId, input) });
    const network = input === NATIVE_ASSETS.BTC ? 'btc' : 'ckb';
    const latestBlock = await ctx.ch
      .selectFrom('mv_block_info')
      .select(['block_number'])
      .where('network', '=', network)
      .orderBy('block_number desc')
      .limit(1)
      .executeTakeFirst();

    if (!latestBlock) {
      return { ...marketInfo, latestBlockNumber: 0, latestBlockTime: undefined };
    }

    const timestampRes = await ctx.ch
      .selectFrom('tx_action')
      .select('timestamp')
      .where((eb) => eb.and([eb('block_number', '=', latestBlock.block_number), eb('network', '=', network)]))
      .executeTakeFirst();

    return {
      ...marketInfo,
      latestBlockNumber: Number(latestBlock.block_number),
      latestBlockTime: timestampRes?.timestamp ? new Date(Number(timestampRes.timestamp) * 1000) : undefined,
    };
  }),
  getLast7DayPrice: publicProcedure.input(z.string()).query(async ({ ctx, input }) => {
    const res = await ctx.db
      .select({
        assetId: historyPrice.assetId,
        price: historyPrice.price,
        time: historyPrice.time,
        sequence: sql`row_number() over(partition by DATE_TRUNC('hour', "time") order by time asc)`,
      })
      .from(historyPrice)
      .where(
        and(eq(historyPrice.assetId, input), gte(historyPrice.time, sql`CURRENT_TIMESTAMP::TIMESTAMP + '-7 day'`)),
      );
    return res.filter((v) => v.sequence === '1');
  }),
  getTxList: publicProcedure
    .input(
      z
        .object({
          filter: z
            .object({
              assetId: z.string().optional(),
              keywords: z.string().optional(),
              tokens: z.array(z.string()).optional(),
              assetTags: z.array(z.string()).optional(),
              time: z
                .object({
                  from: z.date(),
                  to: z.date(),
                })
                .refine(
                  ({ from, to }) => {
                    return (
                      dayjs(from).isBefore(to) &&
                      dayjs().subtract(33, 'day').isBefore(from, 'day') &&
                      dayjs().add(1, 'day').isAfter(to, 'day')
                    );
                  },
                  {
                    message: 'Can only query data from the last month',
                  },
                ),
              amount: z.array(z.string()).max(2).optional(),
              volume: z.array(z.string()).max(2).optional(),
            })
            .default({
              time: {
                from: dayjs().subtract(1, 'M').toDate(),
                to: new Date(),
              },
            }),
          pagination: paginationSchema.default({
            pageSize: 20,
          }),
        })
        .default({}),
    )
    .output(
      z.object({
        pagination: z.object({
          page: zNumber().describe('Current page number'),
          pageSize: zNumber().describe('Number of items per page'),
          total: zNumber().describe('Total number of items'),
        }),
        data: z
          .array(
            z.object({
              hash: zBytesLike().describe('Transaction hash'),
              assetId: zBytesLike().describe('Asset identifier involved in the transaction'),
              value: zNumberString().describe('Transaction value'),
              volume: zNumberString().describe('Transaction volume'),
              inputCount: zNumber().describe('Number of inputs in the transaction'),
              outputCount: zNumber().describe('Number of outputs in the transaction'),
              committedTime: zDate().nullable().describe('Time when transaction was committed'),
              index: z.number().describe('Transaction index'),
              from: zAddressLike().nullable().describe('Sender address'),
              to: zAddressLike().nullable().describe('Receiver address'),
              network: z.enum(['btc', 'ckb']),
              assetInfo: zodHelper.asset
                .extend({
                  meta: z.unknown().describe('Additional metadata for the asset'),
                  style: z.unknown().describe('Style information for the asset'),
                })
                .optional(),
            }),
          )
          .describe('Array of transaction records'),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { filter, pagination } = input;
      const assetIds = filter.assetId ? [filter.assetId] : [];
      const assetTags = filter.assetTags ?? [];
      if (filter.keywords) {
        assetTags.push(filter.keywords);
        assetIds.push(filter.keywords);
      }
      if (assetTags?.length) {
        const protocolAssets = await ctx.db.query.assetToProtocol.findMany({
          where(fields, operators) {
            return operators.inArray(fields.protocol, assetTags.map((v) => v.toLowerCase()) as AssetProtocolEnum[]);
          },
        });
        const tagsAssets = await ctx.db.query.assetToTag.findMany({
          where(fields, operators) {
            return operators.inArray(fields.assetTagLabel, assetTags);
          },
        });
        assetIds.push(...protocolAssets.map((v) => v.assetId), ...tagsAssets.map((v) => v.assetId));
      }
      if (filter.tokens?.length) {
        assetIds.push(...filter.tokens);
      }

      const eb = expressionBuilder<Database, 'tx_action'>();
      const { hex, unhex } = createHelper<Database, 'tx_action'>();

      const conditions = eb.and(
        [
          assetIds?.length &&
            eb(
              'tx_action.asset_id',
              'in',
              assetIds.map((val) => unhex(val)),
            ),
          filter.volume?.[0] && eb('tx_action.volume', '>=', filter.volume[0].toString()),
          filter.volume?.[1] && eb('tx_action.volume', '<=', filter.volume[1].toString()),
          filter.time?.from && eb('tx_action.timestamp', '>=', dayjs(filter.time.from).unix().valueOf()),
          filter.time?.to && eb('tx_action.timestamp', '<=', dayjs(filter.time.to).unix().valueOf()),
          filter.amount?.[0] && eb('tx_action.value', '>=', BigInt(filter.amount[0]).toString()),
          filter.amount?.[1] && eb('tx_action.value', '<=', BigInt(filter.amount[1]).toString()),
          eb('tx_action.input_count', '>', 0),
        ].filter(R.isObjectType),
      );

      const result = await ctx.ch
        .selectFrom('tx_action')
        .select([
          hex('asset_id'),
          hex('tx_hash'),
          hex('from'),
          hex('to'),
          'timestamp',
          'input_count',
          'output_count',
          'tx_index',
          'volume',
          'value',
          'network',
        ])
        .where(conditions)
        .orderBy(['timestamp desc', 'tx_index desc'])
        .limit(pagination.pageSize)
        .offset((pagination.page - 1) * pagination.pageSize)
        .execute();

      const totalCount = await ctx.ch
        .selectFrom(
          ctx.ch
            .selectFrom('tx_action')
            .select([(eb) => eb.val('1').as('val')])
            .where(conditions)
            .limit(5000)
            .as('sq'),
        )
        .select(eb.fn.countAll().as('count'))
        .executeTakeFirst();

      const assetInfos = await ctx.db.query.assetInfo.findMany({
        where: inArray(assetInfo.id, Array.from(new Set(result.map((item) => toHexWith0x(item.asset_id))))),
      });
      const assetInfoMap = Object.fromEntries(assetInfos.map((item) => [item.id, item]));

      return {
        data: result.map((item) => ({
          assetId: item.asset_id,
          committedTime: item.timestamp,
          from: item.from,
          to: item.to,
          hash: item.tx_hash,
          index: item.tx_index,
          inputCount: item.input_count,
          outputCount: item.output_count,
          volume: item.volume,
          value: item.value,
          assetInfo: assetInfoMap[item.asset_id],
          network: item.network,
        })),
        pagination: {
          page: pagination.page,
          pageSize: pagination.pageSize,
          total: Number(totalCount?.count ?? 0),
        },
      };
    }),
  getSearchStatistics: publicProcedure.query(async ({ ctx }) => {
    return ctx.db.query.searchStatistics.findMany();
  }),
  updateSearchTagsStatistics: publicProcedure.input(z.array(z.string())).mutation(async ({ ctx, input }) => {
    return await ctx.db
      .insert(searchStatistics)
      .values(input.map((v) => ({ count: 1, search: v, type: 'assetTag' })))
      .onConflictDoUpdate({ target: searchStatistics.search, set: { count: sql`${searchStatistics.count} + 1` } });
  }),
  getHotToken: publicProcedure.query(async ({ ctx }) => {
    const assets = await ctx.airtable.getAssets();
    const list = R.pipe(
      assets,
      R.filter((item) => !!item.fields.hot_token),
      R.map((item) => item.fields),
      R.sortBy((item) => item?.hot_token ?? 0),
    );
    return list;
  }),
  getHotCategory: publicProcedure.query(async ({ ctx }) => {
    const assetTags = await ctx.airtable.getAssetTags();
    const list = R.pipe(
      assetTags,
      R.filter((item) => !!item.fields.hot_category),
      R.map((item) => item.fields),
      R.sortBy((item) => item?.hot_category ?? 0),
    );
    return list;
  }),
});
