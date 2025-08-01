import BigNumber from 'bignumber.js';
import { and, count, eq, inArray, isNull, or, sql } from 'drizzle-orm';
import { expressionBuilder, type Kysely } from 'kysely';
import * as R from 'remeda';
import { z } from 'zod';

import { NATIVE_ASSETS } from '~/constants';
import { addressConvert } from '~/lib/address';
import { queryAssetHolders, queryAssetTotalSupply } from '~/server/api/clickhouse';
import { createTRPCRouter, publicProcedure } from '~/server/api/trpc';
import { createHelper, type Database } from '~/server/ch';
import { assetInfo, assetStats, assetTag, assetToTag, lastestMarket } from '~/server/db/schema';

import { type Pagination } from '../types';
import { paginationSchema } from './zod-helper';
import { addressInputOptional, zNumberString } from './zod-helper/basic';

const activityInputType = z.object({
  assetId: z.string(),
  txHash: z.string().optional(),
  fromAndTo: z
    .object({
      condition: z.enum(['and', 'or']).optional().default('and'),
      from: addressInputOptional,
      to: addressInputOptional,
    })
    .optional(),
  orderBy: z.tuple([z.enum(['timestamp', 'value', 'volume']), z.enum(['asc', 'desc'])]).optional(),
  pagination: paginationSchema,
});

type AssetInfo = {
  id: string;
  name: string;
  icon: string | null;
  tags: Array<{ label: string; style?: string | null }>;
  price?: string;
  priceChange24h?: number;
  volume24h?: string;
  marketCap?: string;
  transactions: number;
  holders: number;
  firstMintAt?: number;
};

type Activity = {
  txHash: string;
  action: string;
  time: number;
  from?: string;
  to?: string;
  fromCount: number;
  toCount: number;

  value: string;
  volume?: string;
  id: string;
  assetId?: string;
};

export const assetRouter = createTRPCRouter({
  assetInfoList: publicProcedure
    .input(
      z
        .object({
          tags: z.array(z.string()).min(1).optional(),
          orderBy: z
            .tuple([
              z.enum(['price', 'priceChange24h', 'marketCap', 'volume24h', 'transactions', 'holders']),
              z.enum(['asc', 'desc']),
            ])
            .optional(),
          pagination: paginationSchema,
        })
        .default({}),
    )
    .query(async ({ ctx, input }): Promise<Pagination<AssetInfo>> => {
      const orderBy = (() => {
        const [field, order] = input.orderBy ?? ['marketCap', 'desc'];
        const tableField = (() => {
          switch (field) {
            case 'holders':
              return assetStats.holderCount;
            case 'price':
              return lastestMarket.price;
            case 'priceChange24h':
              return lastestMarket.percentChange24h;
            case 'transactions':
              return assetStats.transactionCount;
            case 'volume24h':
              return lastestMarket.volume24h;
            default:
              return lastestMarket.marketCap;
          }
        })();

        return sql`${tableField} ${sql.raw(order)} NULLS LAST`;
      })();

      // filter the asset that is not layer 1 or layer 2, for example a spore token
      const parentIdCondition = or(
        isNull(assetInfo.parentId),
        inArray(assetInfo.parentId, [NATIVE_ASSETS.BTC, NATIVE_ASSETS.CKB]),
      );
      const containTags = (tags: string[]) =>
        ctx.db
          .select({ id: assetInfo.id })
          .from(assetInfo)
          .leftJoin(assetToTag, eq(assetInfo.id, assetToTag.assetId))
          .leftJoin(assetTag, eq(assetToTag.assetTagLabel, assetTag.label))
          .groupBy(assetInfo.id)
          .having(eq(count(assetInfo.id), tags.length))
          .where(and(inArray(assetTag.label, tags), eq(assetInfo.public, true), parentIdCondition));

      const whereCondition = input.tags ? inArray(assetInfo.id, containTags(input.tags)) : parentIdCondition;
      const assetInfos = await ctx.db
        .select()
        .from(assetInfo)
        .leftJoin(assetStats, eq(assetInfo.id, assetStats.assetId))
        .leftJoin(lastestMarket, eq(assetInfo.id, lastestMarket.assetId))
        .orderBy(orderBy)
        .where(and(whereCondition, eq(assetInfo.public, true)))
        .limit(input.pagination.pageSize)
        .offset((input.pagination.page - 1) * input.pagination.pageSize);

      const rowCount = await ctx.db.$count(
        ctx.db
          .select()
          .from(assetInfo)
          .where(and(whereCondition, eq(assetInfo.public, true)))
          .limit(5000),
      );
      const matchedAssetInfoIds = assetInfos.map((item) => item.asset_info.id);

      const infoWithTags = await ctx.db.query.assetInfo.findMany({
        with: { assetToTag: { with: { assetTag: true } } },
        where: (t, { inArray }) => inArray(t.id, matchedAssetInfoIds),
      });

      const groupedTags = R.pipe(
        infoWithTags,
        R.indexBy((item) => item.id),
        R.mapValues((item) => item.assetToTag.map((tag) => tag.assetTag)),
      );

      const data = assetInfos.map<AssetInfo>((item) => ({
        id: item.asset_info.id,
        name: item.asset_info.name,
        icon: item.asset_info.icon,
        tags: groupedTags[item.asset_info.id] ?? [],

        price: item.latest_market?.price ?? undefined,
        marketCap: item.latest_market?.marketCap ?? undefined,
        priceChange24h: item.latest_market?.percentChange24h ?? undefined,
        volume24h: item.latest_market?.volume24h ?? undefined,

        transactions: item.asset_stats?.transactionCount ?? 0,
        holders: item.asset_stats?.holderCount ?? 0,
        firstMintAt: item.asset_info.firstMintAt ? +item.asset_info.firstMintAt : undefined,
      }));

      return {
        data: data,
        pagination: { rowCount },
      };
    }),

  assetInfo: publicProcedure
    .meta({ openapi: { path: '/asset/asset-info', method: 'GET' } })
    .input(z.object({ assetId: z.string() }))
    .output(
      z
        .object({
          name: z.string(),
          symbol: z.string().nullable(),
          icon: z.string().nullable(),
          decimals: z.number().nullable(),
          tags: z.array(z.object({ label: z.string(), style: z.string().nullable() })),
          holderCount: z.number().nullable(),
          price: z.string().nullable(),
          percentChange24h: z.number().nullable(),
          marketCap: z.string().nullable(),
          volume24h: z.string().nullable(),
          totalSupply: zNumberString().nullable(),
          description: z.string().nullable(),
        })
        .nullable(),
    )
    .query(async ({ ctx, input }) => {
      const res = await ctx.db.query.assetInfo.findFirst({
        where: eq(assetInfo.id, input.assetId),
        with: {
          assetToTag: { with: { assetTag: true } },
          assetInfoStats: true,
        },
      });

      if (!res) {
        return null;
      }

      const marketData = await ctx.marketService.getLatestMarketData({
        assetId: input.assetId,
      });

      return {
        name: res.name,
        symbol: res.symbol,
        icon: res.icon,
        decimals: res.decimals,
        tags: res.assetToTag.map((item) => item.assetTag),
        holderCount: res.assetInfoStats?.holderCount ?? null,

        price: marketData?.price ?? null,
        percentChange24h: marketData?.percentChange24h ?? null,
        marketCap: marketData?.marketCap ?? null,
        volume24h: marketData?.volume24h ?? null,

        totalSupply: res.totalSupply,
        description: res.description,
      };
    }),

  activity: publicProcedure
    .input(activityInputType)
    .query(async ({ ctx, input }): Promise<Pagination<Omit<Activity, 'id'>>> => {
      const asset = await ctx.db.query.assetInfo.findFirst({ where: eq(assetInfo.id, input.assetId) });
      const decimals = asset?.decimals ?? 0;
      let txHashes = input.txHash ? [input.txHash] : [];
      let totalCount: number;
      if (input.fromAndTo?.from || input.fromAndTo?.to) {
        /**
         * Because we need to filter all addresses, we first filter out tx_hash through tx_asset_detail.
         * If there is no address filtering, we still retrieve it from tx_action, as filtering from tx_asset_detail without address criteria would be very slow.
         */
        const v = await findTxHashesFilterAddress(ctx.ch, input);
        if (v.txHashes.length === 0) {
          return { data: [], pagination: { rowCount: v.totalCount } };
        }
        txHashes = v.txHashes.map((v) => v.txHash);
        totalCount = v.totalCount;
      } else {
        const { unhex } = createHelper<Database, 'tx_action'>();
        totalCount = Number(
          (
            await ctx.ch
              .selectFrom(
                ctx.ch
                  .selectFrom('tx_action')
                  .select([(eb) => eb.val('1').as('val')])
                  .where('asset_id', '=', unhex(input.assetId))
                  .$if(!!input.txHash, (eb) => eb.where('tx_hash', '=', unhex(input.txHash!)))
                  .limit(5000)
                  .as('sq'),
              )
              .select((eb) => eb.fn.countAll().as('count'))
              .executeTakeFirst()
          )?.count ?? 0,
        );
      }
      const { hex, unhex } = createHelper<Database, 'tx_action'>();
      const txActions = await ctx.ch
        .selectFrom('tx_action')
        .select([
          'action',
          hex('from', 'from'),
          hex('to', 'to'),
          'input_count',
          'output_count',
          'timestamp',
          hex('tx_hash', 'txHash'),
          'value',
          'volume',
        ])
        .where('asset_id', '=', unhex(input.assetId))
        .$if(!!txHashes.length, (eb) =>
          eb.where(
            'tx_hash',
            'in',
            txHashes.map((item) => unhex(item)),
          ),
        )
        .$if(!!input.orderBy?.length, (qb) => qb.orderBy(input.orderBy![0], input.orderBy![1]))
        .$if(!input.orderBy?.length, (qb) => qb.orderBy('block_number', 'desc').orderBy('tx_index', 'desc'))
        .$if(!txHashes.length, (eb) =>
          eb.limit(input.pagination.pageSize).offset(input.pagination.pageSize * (input.pagination.page - 1)),
        )
        .execute();
      const data = txActions.map((item) => {
        const volume = Number(item.volume || '0');
        return {
          action: item.action,
          from: addressConvert.fromCH(item.from),
          to: addressConvert.fromCH(item.to),
          fromCount: item.input_count,
          toCount: item.output_count,
          time: Number(item.timestamp) * 1000,
          txHash: item.txHash.toLowerCase(),
          value: BigNumber(String(item.value))
            .div(10 ** decimals)
            .toString(),
          volume: volume ? USDollar.format(volume) : '-',
          assetId: asset?.id,
        };
      });
      return { data, pagination: { rowCount: totalCount } };
    }),

  holders: publicProcedure
    .input(
      z.object({
        assetId: z.string(),
        pagination: paginationSchema,
      }),
    )
    .query(async ({ ctx, input }) => {
      const res = await queryAssetHolders(input.assetId);

      const timestamp = Date.now();
      const calculator = await ctx.marketService.createCalculator([{ assetId: input.assetId, timestamp }]);

      const totalSupply = BigNumber((await queryAssetTotalSupply(input.assetId))[0]?.value ?? '0');

      const offset = input.pagination.pageSize * (input.pagination.page - 1);
      const data = res.slice(offset, offset + input.pagination.pageSize).map((item) => {
        const amountWithDecimals = calculator.getAmountWithDecimals({ assetId: input.assetId, value: item.amount });

        return {
          address: addressConvert.fromCH(item.address),
          amount: amountWithDecimals,
          volume: USDollar.format(
            Number(calculator.getVolume({ assetId: input.assetId, value: item.amount, timestamp })),
          ),
          // TODO: the total supply has deicimal info, and we need to remove it
          percentage: totalSupply.isZero() ? 0 : BigNumber(item.amount).div(totalSupply).toNumber(),
        };
      });

      return { data, pagination: { rowCount: res.length } };
    }),
});

const USDollar = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

async function findTxHashesFilterAddress(ch: Kysely<Database>, input: typeof activityInputType._type) {
  if (!input.fromAndTo?.from && !input.fromAndTo?.to) {
    throw new Error('Must filter by from or to address');
  }
  const { hex, unhex } = createHelper<Database, 'tx_asset_detail'>();
  const eb = expressionBuilder<Database, 'tx_asset_detail'>();
  const conditions = [eb('asset_id', '=', unhex(input.assetId))];
  if (input.txHash) {
    conditions.push(eb('tx_hash', '=', unhex(input.txHash)));
  }
  const fromCondition = input.fromAndTo.from
    ? eb.and([eb('address', '=', unhex(input.fromAndTo.from)), eb('from_or_to', '=', 'from')])
    : undefined;
  const toCondition = input.fromAndTo.to
    ? eb.and([eb('address', '=', unhex(input.fromAndTo.to)), eb('from_or_to', '=', 'to')])
    : undefined;
  if (fromCondition && toCondition) {
    // use or when addressFilterOperator is and, because the and will filter by having
    conditions.push(eb.or([fromCondition, toCondition]));
  } else {
    conditions.push(...[fromCondition, toCondition].filter((v) => !!v));
  }
  const isFilterByFromAndTo = input.fromAndTo.from && input.fromAndTo.to && input.fromAndTo.condition === 'and';
  const existFrom = input.fromAndTo.from
    ? eb.fn<number>('sumIf', [
        eb.val(1),
        eb.and([eb('address', '=', unhex(input.fromAndTo.from)), eb('from_or_to', '=', 'from')]),
      ])
    : undefined;
  const existTo = input.fromAndTo.to
    ? eb.fn<number>('sumIf', [
        eb.val(1),
        eb.and([eb('address', '=', unhex(input.fromAndTo.to)), eb('from_or_to', '=', 'to')]),
      ])
    : undefined;
  const totalCount = await ch
    .selectFrom(
      ch
        .selectFrom('tx_asset_detail')
        .distinctOn('tx_hash')
        .select([(eb) => eb.val('1').as('val')])
        .where(eb.and(conditions))
        .groupBy('tx_hash')
        .$if(!!isFilterByFromAndTo && !!existFrom, (qb) => qb.having(existFrom!, '>', 0))
        .$if(!!isFilterByFromAndTo && !!existTo, (qb) => qb.having(existTo!, '>', 0))
        .limit(5000)
        .as('sq'),
    )
    .select(eb.fn.countAll().as('count'))
    .executeTakeFirst();
  const txHashes = await ch
    .selectFrom('tx_asset_detail')
    .select([
      hex('tx_hash', 'txHash'),
      eb.fn<string>('any', ['block_number']).as('block_number'),
      eb.fn<string>('any', ['tx_index']).as('tx_index'),
    ])
    .$if(input.orderBy?.[0] === 'value', (qb) => qb.select([eb.fn.max('value').as('value')]))
    .$if(input.orderBy?.[0] === 'volume', (qb) => qb.select([eb.fn.max('volume').as('volume')]))
    .where(eb.and(conditions))
    .groupBy('tx_hash')
    .$if(!!input.orderBy?.length, (qb) => qb.orderBy(input.orderBy![0], input.orderBy![1]))
    .$if(!input.orderBy?.length, (qb) => qb.orderBy('block_number', 'desc').orderBy('tx_index', 'desc'))
    .$if(!!isFilterByFromAndTo && !!existFrom, (qb) => qb.having(existFrom!, '>', 0))
    .$if(!!isFilterByFromAndTo && !!existTo, (qb) => qb.having(existTo!, '>', 0))
    .limit(input.pagination.pageSize)
    .offset(input.pagination.pageSize * (input.pagination.page - 1))
    .execute();
  return {
    txHashes,
    totalCount: Number(totalCount?.count ?? 0),
  };
}
