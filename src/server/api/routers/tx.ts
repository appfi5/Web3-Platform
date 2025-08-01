import BigNumber from 'bignumber.js';
import { eq } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { type Kysely } from 'kysely';
import { z } from 'zod';

import { getTx as getBTCTx, getTxWithFeeRate } from '~/aggregator/btc/api';
import { NATIVE_ASSETS } from '~/constants';
import { getAssetPriceInABlock } from '~/server/api/comm';
import { createHelper, type Database, type Network } from '~/server/ch';
import { type DB } from '~/server/db';
import * as schema from '~/server/db/schema';
import { type tx } from '~/server/db/schema';
import { type TxDetails } from '~/server/types/tx';
import { asserts } from '~/utils/asserts';
import { bytesEqual, toHexWith0x } from '~/utils/bytes';
import { Chain } from '~/utils/const';
import { type Attributes, getTx } from '~/utils/third-api/ckb-explorer';

import { createTRPCRouter, publicProcedure } from '../trpc';
const handleCKBTxDetails = async (
  db: PostgresJsDatabase<typeof schema>,
  txInfoInDB: typeof tx.$inferInsert,
  attributes: Attributes,
): Promise<TxDetails> => {
  const assetsInfo = await db.query.assetInfo.findMany();
  const ckbAssset = assetsInfo.find((a) => a.id === NATIVE_ASSETS.CKB);

  const assets = new Set<string>();
  assets.add(NATIVE_ASSETS.CKB);
  [...attributes.display_inputs, ...attributes.display_outputs].forEach((item) => {
    const asset = assetsInfo.find((a) => a.symbol === item.extra_info?.symbol);
    if (asset) {
      assets.add(asset?.id);
    }
  });

  const assetPrice = await getAssetPriceInABlock(txInfoInDB.blockHash!);
  const ckbPrice = assetPrice[NATIVE_ASSETS.CKB] ?? '0';

  let inputCapacity = BigNumber(0);
  let outputCapacity = BigNumber(0);

  let inputNativeTokenAmount = BigNumber(0);
  let outputNativeTokenAmount = BigNumber(0);

  const inputs = attributes.display_inputs.map((item) => {
    inputNativeTokenAmount = inputNativeTokenAmount.plus(BigNumber(item.capacity || 0));
    if (item.extra_info) {
      inputCapacity = inputCapacity.plus(BigNumber(item.capacity || 0));
      const asset = assetsInfo.find((a) => a.symbol === item.extra_info?.symbol);
      return {
        ...item,
        assetId: asset?.id ?? '',
        icon: asset?.icon ?? '',
        symbol: item.extra_info.symbol,
        decimal: item.extra_info.decimal,
        amount: item.extra_info.amount,
        value: asset?.id
          ? BigNumber(item.extra_info.amount || 0)
              .multipliedBy(assetPrice[asset.id] ?? 0)
              .dividedBy(10 ** Number(item.extra_info.decimal))
              .toString()
          : '0',
      };
    }

    return {
      ...item,
      assetId: ckbAssset?.id ?? '',
      icon: ckbAssset?.icon ?? '',
      symbol: ckbAssset?.symbol ?? 'CKB',
      decimal: ckbAssset?.decimals ?? 8,
      amount: item.capacity,
      value: BigNumber(item.capacity || 0)
        .multipliedBy(ckbPrice)
        .dividedBy(10 ** 8)
        .toString(),
    };
  });

  const outputs = attributes.display_outputs.map((item) => {
    outputNativeTokenAmount = outputNativeTokenAmount.plus(BigNumber(item.capacity || 0));
    if (item.extra_info) {
      outputCapacity = outputCapacity.plus(BigNumber(item.capacity || 0));
      const asset = assetsInfo.find((a) => a.symbol === item.extra_info?.symbol);
      return {
        ...item,
        assetId: asset?.id ?? '',
        icon: asset?.icon ?? '',
        symbol: item.extra_info.symbol,
        decimal: item.extra_info.decimal,
        amount: item.extra_info.amount,
        value: asset?.id
          ? BigNumber(item.extra_info.amount || 0)
              .multipliedBy(assetPrice[asset.id] ?? 0)
              .dividedBy(10 ** Number(item.extra_info.decimal))
              .toString()
          : '0',
      };
    }

    return {
      ...item,
      assetId: ckbAssset?.id ?? '',
      icon: ckbAssset?.icon ?? '',
      symbol: ckbAssset?.symbol ?? 'CKB',
      decimal: ckbAssset?.decimals ?? 8,
      amount: item.capacity,
      value: BigNumber(item.capacity || 0)
        .multipliedBy(ckbPrice)
        .dividedBy(10 ** 8)
        .toString(),
    };
  });

  const inputValue = inputs.reduce((val, cur) => BigNumber(val).plus(cur.value || 0), BigNumber(0));
  const outputValue = outputs.reduce((val, cur) => BigNumber(val).plus(cur.value || 0), BigNumber(0));

  const nativeTokenAmount = BigNumber.max(inputNativeTokenAmount, outputNativeTokenAmount).toString();

  const details = {
    chain: Chain.CKB,
    timestamp: txInfoInDB.submittedTime.getTime(),
    feeRate: new BigNumber(attributes.transaction_fee)
      .multipliedBy(1000)
      .dividedToIntegerBy(attributes.bytes)
      .toFormat({
        groupSeparator: ',',
        groupSize: 3,
      }),

    position: txInfoInDB.index,
    isCoinBase: false,
    lockTime: undefined,

    inputValue: inputValue.plus(inputCapacity.multipliedBy(ckbPrice).dividedBy(10 ** 8)).toString(),
    outputValue: outputValue.plus(outputCapacity.multipliedBy(ckbPrice).dividedBy(10 ** 8)).toString(),

    nativeTokenAmount,
    nativeTokenValue: BigNumber(ckbPrice)
      .multipliedBy(nativeTokenAmount)
      .dividedBy(10 ** 8)
      .toString(),
    totalValue: BigNumber.max(inputValue, outputValue).toString(),
  };

  return {
    ...txInfoInDB,
    ...attributes,
    ...details,
    attributes,
    inputs,
    outputs,
  };
};

const handleBTCTxDetails = async (
  db: PostgresJsDatabase<typeof schema>,
  txInfoInDB: typeof tx.$inferInsert,
  data: Awaited<ReturnType<typeof getTxWithFeeRate>>,
): Promise<TxDetails> => {
  const { transaction, vins, vouts } = data;

  const assetsInfo = await db.query.assetInfo.findMany();
  const btcAssset = assetsInfo.find((a) => a.id === NATIVE_ASSETS.BTC);

  const assetPrice = await getAssetPriceInABlock(txInfoInDB.blockHash!);
  const btcPrice = assetPrice[NATIVE_ASSETS.BTC] ?? 0;

  let inputNativeTokenAmount = BigNumber(0);
  let outputNativeTokenAmount = BigNumber(0);

  let isCoinBase = false;

  const inputs = vins.map((item) => {
    inputNativeTokenAmount = inputNativeTokenAmount.plus(BigNumber(item.vout.value || 0));
    if (item.is_coinbase) {
      isCoinBase = true;
    }
    return {
      ...item,
      id: item.txid,
      address_hash: item.vout.address,
      assetId: btcAssset?.id ?? '',
      icon: btcAssset?.icon ?? '',
      symbol: btcAssset?.symbol || 'BTC',
      decimal: btcAssset?.decimals || 8,
      amount: `${item.vout.value}`,
      value: BigNumber(item.vout.value)
        .multipliedBy(btcPrice)
        .dividedBy(10 ** 8)
        .toString(),
    };
  });

  const outputs = vouts.map((item) => {
    outputNativeTokenAmount = outputNativeTokenAmount.plus(BigNumber(item.value || 0));
    return {
      ...item,
      id: item.outpoint.txid,
      address_hash: item.address,
      assetId: btcAssset?.id ?? '',
      icon: btcAssset?.icon ?? '',
      symbol: btcAssset?.symbol || 'BTC',
      decimal: btcAssset?.decimals || 8,
      amount: `${item.value}`,
      value: BigNumber(item.value)
        .multipliedBy(btcPrice)
        .dividedBy(10 ** 8)
        .toString(),
    };
  });

  const inputValue = inputs.reduce((val, cur) => BigNumber(val).plus(cur.value), BigNumber(0));
  const outputValue = outputs.reduce((val, cur) => BigNumber(val).plus(cur.value), BigNumber(0));

  const nativeTokenAmount = BigNumber.max(inputNativeTokenAmount, outputNativeTokenAmount).toString();

  const details = {
    chain: Chain.BTC,
    timestamp: txInfoInDB.submittedTime.getTime(),
    feeRate: `${transaction?.feeRate ?? 0}`,
    version: transaction.version,
    size: transaction.size,
    position: txInfoInDB.index,
    isCoinBase,
    lockTime: transaction.locktime,
    transaction_fee: `${transaction?.fee ?? 0}`,
    block_number: transaction.blockHeight,

    inputValue: inputValue.toString(),
    outputValue: inputValue.toString(),

    nativeTokenAmount,
    nativeTokenValue: BigNumber(btcPrice)
      .multipliedBy(nativeTokenAmount)
      .dividedBy(10 ** 8)
      .toString(),
    totalValue: BigNumber.max(inputValue, outputValue).toString(),
  };

  return {
    ...txInfoInDB,
    ...details,
    is_cellbase: false,
    tx_status: 'committed',
    attributes: data,
    inputs,
    outputs,
  };
};

export const txRouter = createTRPCRouter({
  getTxNetwork: publicProcedure
    .input(z.string())
    .output(z.enum(['btc', 'ckb']))
    .query(async ({ ctx, input }) => {
      const { unhex } = createHelper<Database, 'tx_asset_detail'>();
      const item = await ctx.ch
        .selectFrom('tx_asset_detail')
        .select(['network'])
        .where('tx_hash', '=', unhex(input))
        .limit(1)
        .executeTakeFirstOrThrow();
      return item.network;
    }),
  getTxDetail: publicProcedure.input(z.string()).query(async ({ input, ctx }) => {
    const txInfoInDB = await fetchTxWithAssetInfo(ctx, input);
    if (!txInfoInDB) throw new Error(`The tx ${input} can not found`);
    const assetInfo = await ctx.db.query.assetInfo.findFirst({
      where(fields, operators) {
        return operators.eq(fields.id, txInfoInDB?.assetId);
      },
    });

    switch (txInfoInDB?.assetId) {
      case NATIVE_ASSETS.CKB:
        const {
          data: { attributes },
        } = await getTx(input);

        return {
          ...(await handleCKBTxDetails(ctx.db, txInfoInDB, attributes)),
          assetInfo,
        };
      case NATIVE_ASSETS.BTC:
        const data = await getTxWithFeeRate({ txid: input });
        return {
          ...(await handleBTCTxDetails(ctx.db, txInfoInDB, data)),
          assetInfo,
        };
      default:
        break;
    }
  }),
  getTxRawData: publicProcedure
    .input(
      z.object({
        hash: z.string(),
        chain: z.nativeEnum(Chain),
      }),
    )
    .query(async ({ input, ctx }) => {
      const { hash, chain } = input;
      switch (chain) {
        case Chain.CKB:
          const withdrawingTxMap = await ctx.dataSource.batchGetTransation([hash]);
          return withdrawingTxMap[hash];
        case Chain.BTC:
          const data = await getBTCTx({ txid: hash });
          return data;
        default:
          break;
      }
    }),
});

async function fetchTxWithAssetInfo(
  ctx: { ch: Kysely<Database>; db: DB },
  input: string,
): Promise<
  (typeof schema.tx.$inferSelect & { assetInfo: typeof schema.assetInfo.$inferSelect; network: Network }) | null
> {
  const { hex, unhex } = createHelper<Database, 'tx_action'>();
  const foundTx = await ctx.ch
    .selectFrom('tx_action')
    .select([
      hex('asset_id', 'assetId'),
      hex('tx_hash', 'txHash'),
      hex('block_hash', 'blockHash'),
      hex('from'),
      hex('to'),
      'volume',
      'timestamp',
      'tx_index',
      'network',
      'input_count',
      'output_count',
      'value',
    ])
    .where('tx_hash', '=', unhex(input))
    .orderBy('volume desc')
    .limit(1)
    .executeTakeFirst();

  if (!foundTx) {
    return null;
  }

  asserts(foundTx.network === 'ckb' || foundTx.network === 'btc');
  const assetId = foundTx.network === 'ckb' ? NATIVE_ASSETS.CKB : NATIVE_ASSETS.BTC;
  const tokenId =
    !bytesEqual(foundTx.assetId, NATIVE_ASSETS.CKB) && !bytesEqual(foundTx.assetId, NATIVE_ASSETS.BTC)
      ? foundTx.assetId
      : undefined;

  const foundAssetInfo = await ctx.db.query.assetInfo.findFirst({
    where: eq(schema.assetInfo.id, toHexWith0x(tokenId ?? assetId)),
  });

  if (!foundAssetInfo) {
    return null;
  }

  return {
    ...foundTx,
    assetId,
    tokenId: tokenId ?? null,
    assetInfo: foundAssetInfo,
    committedTime: new Date(Number(foundTx.timestamp) * 1000),
    submittedTime: new Date(Number(foundTx.timestamp) * 1000),
    index: Number(foundTx.tx_index),
    hash: foundTx.txHash,
    value: BigInt(foundTx.value),
    inputCount: Number(foundTx.input_count),
    outputCount: Number(foundTx.output_count),
  };
}
