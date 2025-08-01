import { bytes } from '@ckb-lumos/lumos/codec';
import { ParamsFormatter } from '@ckb-lumos/lumos/rpc';
import BigNumber from 'bignumber.js';
import { eq } from 'drizzle-orm';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { type Kysely } from 'kysely';
import { z } from 'zod';

import { getTxRawData, getTxWithFeeRate } from '~/aggregator/btc/api';
import { NATIVE_ASSETS } from '~/constants';
import { getAssetPriceInABlock } from '~/server/api/comm';
import { createHelper, type Database, type Network } from '~/server/ch';
import { type DB } from '~/server/db';
import * as schema from '~/server/db/schema';
import { type tx } from '~/server/db/schema';
import { asserts } from '~/utils/asserts';
import { bytesEqual, toHexWith0x } from '~/utils/bytes';
import { type Attributes, getTx } from '~/utils/third-api/ckb-explorer';

import { createTRPCRouter, publicProcedure } from '../../trpc';
import { assertsTRPCError } from '../../utils';
import { txHashInput } from '../zod-helper/basic';
import { network } from '../zod-helper/network';
import { assetInfo, btcRawTx, btcTxDetail, ckbRawTx, ckbTxDetail } from '../zod-helper/txs';

export const txsRouter = createTRPCRouter({
  network: publicProcedure
    .meta({
      openapi: { path: '/v0/txs/{txHash}/network', method: 'GET' },
    })
    .input(z.object({ txHash: txHashInput }))
    .output(z.enum(['btc', 'ckb']).nullable())
    .query(async ({ ctx, input }) => {
      const { unhex } = createHelper<Database, 'tx_asset_detail'>();
      const item = await ctx.ch
        .selectFrom('tx_asset_detail')
        .select(['network'])
        .where('tx_hash', '=', unhex(input.txHash))
        .executeTakeFirst();
      assertsTRPCError(item, 'NOT_FOUND', `Can not find the ${input.txHash} tx`);
      return item.network;
    }),
  detail: publicProcedure
    .meta({
      openapi: { path: '/v0/txs/{txHash}', method: 'GET' },
    })
    .input(
      z.object({
        txHash: txHashInput,
      }),
    )
    .output(z.union([ckbTxDetail.extend({ assetInfo }), btcTxDetail.extend({ assetInfo })]).nullable())
    .query(async ({ input, ctx }) => {
      const { txHash } = input;
      const txInfoInDB = await fetchTxWithAssetInfo(ctx, txHash);
      assertsTRPCError(txInfoInDB, 'NOT_FOUND', `Can not find the ${input.txHash} tx`);
      const assetInfo = await ctx.db.query.assetInfo.findFirst({
        where(fields, operators) {
          return operators.eq(fields.id, txInfoInDB?.assetId);
        },
      });
      switch (txInfoInDB.network) {
        case 'ckb':
          const {
            data: { attributes },
          } = await getTx(txHash);

          return {
            ...(await handleCKBTxDetails(ctx.db, txInfoInDB, attributes)),
            assetInfo: {
              id: assetInfo?.id,
              icon: assetInfo?.icon || undefined,
              symbol: assetInfo?.symbol || undefined,
              name: assetInfo?.name,
              decimals: assetInfo?.decimals || undefined,
            },
          };
        case 'btc':
          const data = await getTxWithFeeRate({ txid: txHash });
          return {
            ...(await handleBTCTxDetails(ctx.db, txInfoInDB, data)),
            assetInfo: {
              id: assetInfo?.id,
              icon: assetInfo?.icon || undefined,
              symbol: assetInfo?.symbol || undefined,
              name: assetInfo?.name,
              decimals: assetInfo?.decimals || undefined,
            },
          };
        default:
          return null;
      }
    }),
  raw: publicProcedure
    .meta({
      openapi: { path: '/v0/txs/{network}/{txHash}/raw', method: 'GET' },
    })
    .input(
      z.object({
        network,
        txHash: txHashInput,
      }),
    )
    .output(z.union([ckbRawTx, btcRawTx]).nullable())
    .query(async ({ input, ctx }) => {
      const { network, txHash } = input;
      switch (network) {
        case 'ckb':
          const withdrawingTxMap = await ctx.dataSource.batchGetTransation([txHash]);
          if (!withdrawingTxMap[txHash]) return null;
          return ParamsFormatter.toRawTransaction(withdrawingTxMap[txHash]);
        case 'btc':
          const data = await getTxRawData({ txid: txHash });
          if (!data) return null;
          return data;
        default:
          return null;
      }
    }),
});

const handleCKBTxDetails = async (
  db: PostgresJsDatabase<typeof schema>,
  txInfoInDB: typeof tx.$inferInsert,
  attributes: Attributes,
): Promise<z.infer<typeof ckbTxDetail>> => {
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

  let relatedCapacityAmount = BigNumber(0);

  const inputs = attributes.display_inputs.map((item) => {
    const input = {
      id: item.id,
      addressHash: item.address_hash,
      assetId: ckbAssset?.id ?? '',
      icon: ckbAssset?.icon ?? '',
      symbol: ckbAssset?.symbol ?? 'CKB',
      decimal: ckbAssset?.decimals ?? 8,
      amount: item.capacity,
      capacityAmount: item.capacity,
      amountUsd: BigNumber(item.capacity || 0)
        .multipliedBy(ckbPrice)
        .dividedBy(10 ** 8)
        .toString(),
    };

    if (item.extra_info) {
      inputCapacity = inputCapacity.plus(BigNumber(item.capacity || 0));
      const asset: typeof schema.assetInfo.$inferSelect | undefined = assetsInfo.find((a) => {
        const typeHash = item.extra_info?.type_hash ?? item.extra_info?.collection?.type_hash;
        return (
          typeHash &&
          (bytes.equal(a.id, typeHash) || (!!a.meta && a.meta.typeHash && bytes.equal(a.meta.typeHash, typeHash)))
        );
      });
      return {
        ...input,
        assetId: asset?.id ?? '',
        icon: asset?.icon ?? '',
        symbol: item.extra_info.symbol,
        decimal: item.extra_info.decimal,
        amount: item.extra_info.amount ?? '0',
        amountUsd: asset?.id
          ? BigNumber(item.extra_info.amount || 0)
              .multipliedBy(assetPrice[asset.id] ?? 0)
              .dividedBy(10 ** Number(item.extra_info.decimal))
              .toString()
          : '0',
      };
    }

    return input;
  });

  const outputs = attributes.display_outputs.map((item, index) => {
    relatedCapacityAmount = relatedCapacityAmount.plus(BigNumber(item.capacity || 0));
    const output = {
      id: item.id,
      addressHash: item.address_hash,
      assetId: ckbAssset?.id ?? '',
      icon: ckbAssset?.icon ?? '',
      symbol: ckbAssset?.symbol ?? 'CKB',
      decimal: ckbAssset?.decimals ?? 8,
      amount: item.capacity,
      capacityAmount: item.capacity,
      amountUsd: BigNumber(item.capacity || 0)
        .multipliedBy(ckbPrice)
        .dividedBy(10 ** 8)
        .toString(),
    };

    if (item.extra_info) {
      outputCapacity = outputCapacity.plus(BigNumber(item.capacity || 0));
      const asset: typeof schema.assetInfo.$inferSelect | undefined = assetsInfo.find((a) => {
        const typeHash = item.extra_info?.type_hash ?? item.extra_info?.collection?.type_hash;
        return (
          typeHash &&
          (bytes.equal(a.id, typeHash) || (!!a.meta && a.meta.typeHash && bytes.equal(a.meta.typeHash, typeHash)))
        );
      });
      return {
        ...output,
        assetId: asset?.id ?? '',
        icon: asset?.icon ?? '',
        symbol: item.extra_info.symbol,
        decimal: item.extra_info.decimal,
        amount: item.extra_info.amount ?? '0',
        amountUsd: asset?.id
          ? BigNumber(item.extra_info.amount || 0)
              .multipliedBy(assetPrice[asset.id] ?? 0)
              .dividedBy(10 ** Number(item.extra_info.decimal))
              .toString()
          : '0',
      };
    }

    if (attributes.is_cellbase && index === 0) {
      return {
        ...output,
        baseReward: item?.base_reward || '0',
        commitReward: item?.commit_reward || '0',
        proposalReward: item?.proposal_reward || '0',
        secondaryReward: item?.secondary_reward || '0',
      };
    }

    return output;
  });

  const inputValue = inputs.reduce((val, cur) => BigNumber(val).plus(cur.amountUsd || 0), BigNumber(0));
  const outputValue = outputs.reduce((val, cur) => BigNumber(val).plus(cur.amountUsd || 0), BigNumber(0));

  return {
    network: 'ckb',
    hash: txInfoInDB.hash,
    blockHash: txInfoInDB.blockHash,
    committedTime: txInfoInDB.committedTime,
    submittedTime: txInfoInDB.submittedTime,
    feeRate: new BigNumber(attributes.transaction_fee)
      .multipliedBy(1000)
      .dividedToIntegerBy(attributes.bytes)
      .toFormat({
        groupSeparator: ',',
        groupSize: 3,
      }),
    position: txInfoInDB.index,
    isCellBase: attributes.is_cellbase,
    txStatus: attributes.tx_status,
    transactionFee: attributes.transaction_fee,
    blockNumber: attributes.block_number,
    cycles: attributes.cycles ?? 0,
    version: attributes.version,

    inputAmountUsd: inputValue.plus(inputCapacity.multipliedBy(ckbPrice).dividedBy(10 ** 8)).toString(),
    outputAmountUsd: outputValue.plus(outputCapacity.multipliedBy(ckbPrice).dividedBy(10 ** 8)).toString(),
    relatedCapacityAmount: relatedCapacityAmount.toString(),
    relatedCapacityAmountUsd: BigNumber(ckbPrice)
      .multipliedBy(relatedCapacityAmount)
      .dividedBy(10 ** 8)
      .toString(),
    totalAmountUsd: BigNumber.max(inputValue, outputValue).toString(),

    inputs,
    outputs,
  };
};

const handleBTCTxDetails = async (
  db: PostgresJsDatabase<typeof schema>,
  txInfoInDB: typeof tx.$inferInsert,
  data: Awaited<ReturnType<typeof getTxWithFeeRate>>,
): Promise<z.infer<typeof btcTxDetail>> => {
  const { transaction, vins, vouts } = data;

  const assetsInfo = await db.query.assetInfo.findMany();
  const btcAssset = assetsInfo.find((a) => a.id === NATIVE_ASSETS.BTC);

  const assetPrice = await getAssetPriceInABlock(txInfoInDB.blockHash!);
  const btcPrice = assetPrice[NATIVE_ASSETS.BTC] ?? 0;

  let isCoinBase = false;

  const inputs = vins.map((item, index) => {
    const input = {
      id: item.txid,
      addressHash: item.vout.address,
      assetId: btcAssset?.id ?? '',
      icon: btcAssset?.icon ?? '',
      symbol: btcAssset?.symbol || 'BTC',
      decimal: btcAssset?.decimals || 8,
      amount: `${item.vout.value}`,
      amountUsd: BigNumber(item.vout.value)
        .multipliedBy(btcPrice)
        .dividedBy(10 ** 8)
        .toString(),
    };

    if (item.is_coinbase && index === 0) {
      isCoinBase = true;
      return {
        ...input,
        scriptsigAsm: item.scriptsig_asm,
      };
    }

    return input;
  });

  const outputs = vouts.map((item) => {
    const output = {
      id: item.outpoint.txid,
      addressHash: item.address,
      assetId: btcAssset?.id ?? '',
      icon: btcAssset?.icon ?? '',
      symbol: btcAssset?.symbol || 'BTC',
      decimal: btcAssset?.decimals || 8,
      amount: `${item.value}`,
      amountUsd: BigNumber(item.value)
        .multipliedBy(btcPrice)
        .dividedBy(10 ** 8)
        .toString(),
    };

    if (item.scriptpubkey_type) {
      return {
        ...output,
        scriptPubkey: item.scriptpubkey_type,
        scriptPubkeyAddress: item.scriptpubkey_address,
        scriptPubkeyAsm: item.scriptpubkey_asm,
        scriptPubkeyType: item.scriptpubkey_type,
      };
    }

    return output;
  });

  const inputValue = inputs.reduce((val, cur) => BigNumber(val).plus(cur.amountUsd), BigNumber(0));
  const outputValue = outputs.reduce((val, cur) => BigNumber(val).plus(cur.amountUsd), BigNumber(0));

  return {
    network: 'btc',
    hash: txInfoInDB.hash,
    blockHash: txInfoInDB.blockHash,
    committedTime: txInfoInDB.committedTime,
    submittedTime: txInfoInDB.submittedTime,
    feeRate: `${transaction?.feeRate ?? 0}`,
    position: txInfoInDB.index,
    isCoinBase,
    lockTime: transaction.locktime,
    txStatus: 'committed',
    transactionFee: `${transaction?.fee ?? 0}`,
    blockNumber: `${transaction.blockHeight}`,
    version: `${transaction.version}`,

    inputAmountUsd: inputValue.toString(),
    outputAmountUsd: outputValue.toString(),
    totalAmountUsd: BigNumber.max(inputValue, outputValue).toString(),

    inputs,
    outputs,
  };
};

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
