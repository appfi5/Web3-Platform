import { type Output, RPC, type Script } from '@ckb-lumos/lumos';
import { blockchain, bytes, Uint128 } from '@ckb-lumos/lumos/codec';
import { type CKBComponents } from '@ckb-lumos/lumos/rpc';
import { computeScriptHash } from '@ckb-lumos/lumos/utils';
import BigNumber from 'bignumber.js';
import { eq } from 'drizzle-orm';
import pino from 'pino';
import pretty from 'pino-pretty';
import {
  concatMap,
  defer,
  EMPTY,
  expand,
  forkJoin,
  from,
  identity,
  lastValueFrom,
  map,
  mergeMap,
  of,
  toArray,
} from 'rxjs';

import { NATIVE_ASSETS } from '~/constants';
import { env } from '~/env';
import { db } from '~/server/db';
import { assetInfo, historyPrice } from '~/server/db/schema';
import { sequencerPools } from '~/utils/third-api/uxto-swap';

import { createKVStorage } from '../services/storage';
import { type Logger } from '../types';

const CKB_ASSET_TYPE_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';
const logger = pino(pretty({ colorize: true }));
logger.level = env.AGGREGATOR_LOG_LEVEL;

const noopLogger: Logger = { debug: noop, error: noop, info: noop, warn: noop };

const store = createKVStorage<Record<string, string>>({ scope: 'utxoswap-sync-toblock' });

async function getAssetDecimals(assetId: string): Promise<number> {
  const result = await db.query.assetInfo.findFirst({
    columns: { decimals: true },
    where: eq(assetInfo.id, assetId),
  });

  const decimals = result?.decimals;

  if (decimals == null) {
    throw new Error(`Cannot find decimals of the asset ${assetId}`);
  }

  return decimals;
}

export async function syncFromUTXOSwap() {
  const helper = createUtxoSwapHelper({ logger });
  const tipBlockNumber = await helper.rpc.getTipBlockNumber();

  const assetIds = new Set((await db.select({ id: assetInfo.id }).from(assetInfo)).map((v) => v.id));
  const assetsFromUTXOSwap = await helper.getPairsQuoteWithCkb();
  for (const asset of assetsFromUTXOSwap) {
    if (assetIds.has(asset.assetY.typeHash) && asset.assetY.typeScript != null) {
      logger.info(`get ${asset.assetY.name} ${asset.assetY.typeHash} price`);

      const prices = await helper.getPriceInCkb({
        baseAsset: asset.assetY.typeScript as Script,
        liquidityLockArgs: asset.typeHash,
        fromBlock: (await store.getItem(asset.assetY.typeHash)) ?? undefined,
        baseAssetDecimals: await getAssetDecimals(asset.assetY.typeHash),
      });

      const historyItems = prices
        .filter((item) => item != null)
        .map((item): typeof historyPrice.$inferInsert => ({
          ...item,
          price: item.priceInCkb,
          quoteAssetId: NATIVE_ASSETS.CKB,
        }));

      await db.insert(historyPrice).values(historyItems).onConflictDoNothing();
      await store.setItem(asset.assetY.typeHash, tipBlockNumber);
    } else {
      logger.info(`${asset.assetY.name} ${asset.assetY.typeHash} doesn't in asset_info, skip get price`);
    }
  }
}

export function createUtxoSwapHelper({ rpcUrl, logger = noopLogger }: { rpcUrl?: string; logger?: Logger } = {}) {
  rpcUrl = rpcUrl ?? env.CKB_RPC_URL;

  if (!rpcUrl) {
    throw new Error('CKB_RPC_URL is required');
  }
  const rpc = new RPC(rpcUrl);
  const BATCH_SIZE = 100;

  const UTXO_LIQUIDITY_LOCK_CODE_HASH = env.NEXT_PUBLIC_IS_MAINNET
    ? '0x393df3359e33f85010cd65a3c4a4268f72d95ec6b049781a916c680b31ea9a88'
    : '0x75ac906998b047602967d7f89505bb9817e405b89f868111ded51d672f9e260e';

  async function fetchLiquidityTransactionHashes({
    liquidityLockArgs,
    assetTypeScript,
    fromBlock = '0x0',
    toBlock = '0xffffffffffffffff',
    lastCursor,
  }: {
    liquidityLockArgs: string;
    assetTypeScript: Script;
    fromBlock?: string;
    toBlock?: string;
    lastCursor?: string;
  }) {
    const res = await rpc.getTransactions(
      {
        script: { codeHash: UTXO_LIQUIDITY_LOCK_CODE_HASH, hashType: 'type', args: liquidityLockArgs },
        scriptType: 'lock',
        filter: { script: assetTypeScript, blockRange: [fromBlock, toBlock] },
        groupByTransaction: true,
      },
      'asc',
      '0x' + BATCH_SIZE.toString(16),
      lastCursor,
    );

    return res;
  }

  function parseCkbTradingPairLiquidity(tx: CKBComponents.Transaction, baseAsset: Script) {
    const liquidityAssetCells = tx.outputs.reduce(
      (acc, output, index) =>
        acc.concat(
          output.lock.codeHash === UTXO_LIQUIDITY_LOCK_CODE_HASH ? [{ output, data: tx.outputsData[index]! }] : [],
        ),
      [] as { output: Output; data: string }[],
    );

    if (liquidityAssetCells.length !== 2) {
      return;
    }

    const [base, quote] = (() => {
      if (
        liquidityAssetCells[0]?.output.type &&
        bytes.equal(blockchain.Script.pack(liquidityAssetCells[0].output.type), blockchain.Script.pack(baseAsset))
      ) {
        return [liquidityAssetCells[0], liquidityAssetCells[1]!];
      }

      return [liquidityAssetCells[1]!, liquidityAssetCells[0]!];
    })();

    return {
      baseAmount: Uint128.unpack(base.data).toString(),
      quoteAmount: quote.output.capacity,
    };
  }

  async function getPairsQuoteWithCkb() {
    const result = await sequencerPools({ pageNo: 0, pageSize: 200, searchKey: CKB_ASSET_TYPE_HASH });
    if (result.code !== 0) throw new Error(result.message);
    return result.data.list;
  }

  function getPriceInCkb({
    liquidityLockArgs,
    baseAsset,
    baseAssetDecimals,
    fromBlock = '0x0',
  }: {
    liquidityLockArgs: string;
    baseAsset: Script;
    baseAssetDecimals: number;
    fromBlock?: string;
  }) {
    const boundFetchLiquidityTransactionHashes = (lastCursor?: string) =>
      fetchLiquidityTransactionHashes({ assetTypeScript: baseAsset, liquidityLockArgs, fromBlock, lastCursor });

    const baseAssetInfo$ = forkJoin({
      assetId: of(computeScriptHash(baseAsset)),
      typeScript: of(baseAsset),
      decimals: of(baseAssetDecimals),
    });

    const liquidityTransactionHashes$ = defer(() => boundFetchLiquidityTransactionHashes()).pipe(
      expand(
        ({ objects, lastCursor }) =>
          objects.length === BATCH_SIZE ? boundFetchLiquidityTransactionHashes(lastCursor) : EMPTY,
        1,
      ),
    );

    const pricesInCkb$ = from(baseAssetInfo$).pipe(
      mergeMap((baseAssetInfo) =>
        liquidityTransactionHashes$.pipe(map((baseAssetLiquidityTxs) => ({ baseAssetLiquidityTxs, baseAssetInfo }))),
      ),
      concatMap(async ({ baseAssetInfo, baseAssetLiquidityTxs }) => {
        if (!baseAssetLiquidityTxs.objects.length) {
          return [];
        }

        const fromBlock = Number(baseAssetLiquidityTxs.objects[0]?.blockNumber);
        const toBlock = Number(baseAssetLiquidityTxs.objects[baseAssetLiquidityTxs.objects.length - 1]?.blockNumber);

        logger.debug(`Fetching asset ${baseAssetInfo.assetId} price from block ${fromBlock} to block ${toBlock}`);

        const batchTxs = baseAssetLiquidityTxs.objects.map(
          (obj) => ['getTransaction', obj.txHash] as ['getTransaction', string],
        );
        const batchHeaders = baseAssetLiquidityTxs.objects.map(
          (obj) => ['getHeaderByNumber', obj.blockNumber] as ['getHeaderByNumber', string],
        );

        const getHeadersRes = await rpc
          .createBatchRequest<'getHeaderByNumber', string[], CKBComponents.BlockHeader[]>(batchHeaders)
          .exec();

        const getTxRes = await rpc
          .createBatchRequest<'getTransaction', string[], CKBComponents.TransactionWithStatus[]>(batchTxs)
          .exec();

        return getTxRes
          .map((item, index) =>
            item.txStatus.status === 'committed' && getHeadersRes[index]?.timestamp
              ? {
                  ...parseCkbTradingPairLiquidity(item.transaction, baseAsset),
                  timestamp: new Date(Number(getHeadersRes[index].timestamp)),
                }
              : null,
          )
          .map((liquidity) =>
            liquidity?.baseAmount == null || liquidity.quoteAmount == null
              ? null
              : {
                  assetId: baseAssetInfo.assetId,
                  priceInCkb: BigNumber(liquidity.quoteAmount)
                    .times(10 ** 8)
                    .div(BigNumber(liquidity.baseAmount).times(10 ** baseAssetInfo.decimals))
                    .toFixed(),
                  time: liquidity.timestamp,

                  dataSource: 'utxoswap',
                },
          );
      }),
      concatMap(identity),
    );

    return lastValueFrom(pricesInCkb$.pipe(toArray()));
  }

  return { rpc, getPriceInCkb, getPairsQuoteWithCkb };
}

function noop(): void {
  // do nothing
}
