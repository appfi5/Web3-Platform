import BigNumber from 'bignumber.js';
import { expressionBuilder, type ExpressionWrapper, type Kysely, type SqlBool } from 'kysely';
import * as R from 'remeda';
import { z } from 'zod';

import { createHelper, type Database } from '~/server/ch';

import { createTRPCRouter, publicProcedure } from '../../trpc';
import { USDollar } from '../../utils';
import { paginationInput, wrapPaginationOutput } from '../zod-helper';
import {
  addressInputOptional,
  addressOutput,
  assetIdInput,
  assetIdOutput,
  bytesOutput,
  dateInput,
  dateOutput,
  digitStringOutput,
  zBytesLike,
} from '../zod-helper/basic';
import { createOrderByInput } from '../zod-helper/orderby';

const activityListInput = z
  .object({
    assetId: assetIdInput.optional(),
    txHash: zBytesLike().optional(),
    fromAddress: addressInputOptional,
    toAddress: addressInputOptional,
    addressFilterOperator: z.enum(['and', 'or']).default('and'),
    startDate: dateInput.optional(),
    endDate: dateInput.optional(),
  })
  .merge(paginationInput)
  .merge(createOrderByInput(['timestamp', 'amount', 'amountUsd']));

async function findTxHashesFilterAddress(ch: Kysely<Database>, input: z.infer<typeof activityListInput>) {
  if (!input.fromAddress && !input.toAddress) {
    throw new Error('Must filter by from or to address');
  }
  const { hex, unhex } = createHelper<Database, 'tx_asset_detail'>();
  const eb = expressionBuilder<Database, 'tx_asset_detail'>();
  const conditions: ExpressionWrapper<Database, 'tx_asset_detail', SqlBool>[] = [];
  if (input.assetId) {
    conditions.push(eb('asset_id', '=', unhex(input.assetId)));
  }
  if (input.txHash) {
    conditions.push(eb('tx_hash', '=', unhex(input.txHash)));
  }
  const fromCondition = input.fromAddress
    ? eb.and([eb('address', '=', unhex(input.fromAddress)), eb('from_or_to', '=', 'from')])
    : undefined;
  const toCondition = input.toAddress
    ? eb.and([eb('address', '=', unhex(input.toAddress)), eb('from_or_to', '=', 'to')])
    : undefined;
  if (fromCondition && toCondition) {
    // use or when addressFilterOperator is and, because the and will filter by having
    conditions.push(eb.or([fromCondition, toCondition]));
  } else {
    conditions.push(...[fromCondition, toCondition].filter((v) => !!v));
  }
  const isFilterByFromAndTo = input.fromAddress && input.toAddress && input.addressFilterOperator === 'and';
  const existFrom = input.fromAddress
    ? eb.fn<number>('sumIf', [
        eb.val(1),
        eb.and([eb('address', '=', unhex(input.fromAddress)), eb('from_or_to', '=', 'from')]),
      ])
    : undefined;
  const existTo = input.toAddress
    ? eb.fn<number>('sumIf', [
        eb.val(1),
        eb.and([eb('address', '=', unhex(input.toAddress)), eb('from_or_to', '=', 'to')]),
      ])
    : undefined;
  const total = await ch
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
    .$if(input.orderKey === 'amount', (qb) => qb.select([eb.fn.max('value').as('amount')]))
    .$if(input.orderKey === 'amountUsd', (qb) => qb.select([eb.fn.max('volume').as('amountUsd')]))
    .where(eb.and(conditions))
    .groupBy('tx_hash')
    .$if(!!input.orderKey, (qb) => qb.orderBy(input.orderKey!, input.orderDirection))
    .$if(!input.orderKey, (qb) => qb.orderBy('block_number', 'desc').orderBy('tx_index', 'desc'))
    .$if(!!isFilterByFromAndTo && !!existFrom, (qb) => qb.having(existFrom!, '>', 0))
    .$if(!!isFilterByFromAndTo && !!existTo, (qb) => qb.having(existTo!, '>', 0))
    .limit(input.pageSize)
    .offset(input.pageSize * (input.page - 1))
    .execute();
  return {
    txHashes,
    total: Number(total?.count ?? 0),
  };
}

export const activityRouter = createTRPCRouter({
  list: publicProcedure
    .meta({ openapi: { method: 'GET', path: '/v0/activities' } })
    .input(activityListInput)
    .output(
      wrapPaginationOutput(
        z.object({
          action: z.string(),
          from: addressOutput,
          to: addressOutput,
          fromCount: z.number(),
          toCount: z.number(),
          time: dateOutput,
          txHash: bytesOutput,
          amount: digitStringOutput,
          amountUsd: digitStringOutput,
          assetId: assetIdOutput.optional(),
        }),
      ),
    )
    .query(async ({ ctx, input }) => {
      let txHashes = input.txHash ? [input.txHash] : [];
      let total: number;
      if (input.fromAddress || input.toAddress) {
        /**
         * Because we need to filter all addresses, we first filter out tx_hash through tx_asset_detail.
         * If there is no address filtering, we still retrieve it from tx_action, as filtering from tx_asset_detail without address criteria would be very slow.
         */
        const v = await findTxHashesFilterAddress(ctx.ch, input);
        if (v.txHashes.length === 0) {
          return { result: [], total: v.total };
        }
        txHashes = v.txHashes.map((v) => v.txHash);
        total = v.total;
      } else {
        const { unhex } = createHelper<Database, 'tx_action'>();
        total = Number(
          (
            await ctx.ch
              .selectFrom(
                ctx.ch
                  .selectFrom('tx_action')
                  .select([(eb) => eb.val('1').as('val')])
                  .$if(!!input.assetId, (eb) => eb.where('asset_id', '=', unhex(input.assetId!)))
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
          hex('asset_id', 'assetId'),
          'action',
          hex('from', 'from'),
          hex('to', 'to'),
          'input_count',
          'output_count',
          'timestamp',
          hex('tx_hash', 'txHash'),
          'value as amount',
          'volume as amountUsd',
        ])
        .$if(!!input.assetId, (eb) => eb.where('asset_id', '=', unhex(input.assetId!)))
        .$if(!!txHashes.length, (eb) =>
          eb.where(
            'tx_hash',
            'in',
            txHashes.map((item) => unhex(item)),
          ),
        )
        .$if(!!input.orderKey, (qb) => qb.orderBy(input.orderKey!, input.orderDirection))
        .$if(!input.orderKey, (qb) => qb.orderBy('block_number', 'desc').orderBy('tx_index', 'desc'))
        .$if(!txHashes.length, (eb) => eb.limit(input.pageSize).offset(input.pageSize * (input.page - 1)))
        .execute();
      const assetIds = txActions.map((item) => item.assetId);
      const assets = await ctx.db.query.assetInfo.findMany({
        where(fields, operators) {
          return operators.inArray(fields.id, assetIds);
        },
      });
      const assetMap = R.mapToObj(assets, (item) => [item.id, item.decimals]);
      const result = txActions.map((item) => {
        const amountUsd = Number(item.amountUsd || '0');
        return {
          action: item.action,
          from: item.from,
          to: item.to,
          fromCount: item.input_count,
          toCount: item.output_count,
          time: Number(item.timestamp) * 1000,
          txHash: item.txHash.toLowerCase(),
          amount: BigNumber(String(item.amount))
            .div(10 ** (assetMap[item.assetId] ?? 0))
            .toString(),
          amountUsd: amountUsd ? USDollar.format(amountUsd) : '-',
          assetId: item.assetId,
        };
      });
      return { result, total };
    }),
});
