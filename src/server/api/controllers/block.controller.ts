import { RPC } from '@ckb-lumos/lumos';
import { TRPCError } from '@trpc/server';
import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { type Kysely } from 'kysely';
import * as R from 'remeda';

import { getBestBlockHeight, getBlock as getBTCBlock, getBlockDetail } from '~/aggregator/btc/api';
import { createMarketService } from '~/aggregator/services/market-service';
import { env } from '~/env';
import { addressConvert } from '~/lib/address';
import {
  queryAddressAssetsChangeInBlock,
  queryBlockAddressCount,
  queryBlockAssetsAndVolume,
  queryBlockAssetTotal,
} from '~/server/api/clickhouse';
import { createHelper, type Database } from '~/server/ch';
import { ch as _ch } from '~/server/ch';
import { AssetRepository, type IAssetRepository } from '~/server/repositories/asset.repository';
import { type ITransactionRepository, TransactionRepository } from '~/server/repositories/transacton.repository';
import {
  type ITxActionAddressRepository,
  TxActionAddressRepository,
} from '~/server/repositories/tx-action-address.repository';
import { toHexNo0x } from '~/utils/bytes';
import { Chain, NATIVE_ASSETS } from '~/utils/const';
import { getBlock, getBlocks } from '~/utils/third-api/ckb-explorer';
import { sumBigNumbers } from '~/utils/utility';

import type * as schema from '../../db/schema';
import type { Network, PaginationInput } from '../routers/zod-helper';

const MIN_HASH_LENGTH = 64;
export class BlockController {
  static #instance: BlockController;

  static getInstance(db: PostgresJsDatabase<typeof schema>, ch: Kysely<Database> = _ch) {
    if (!BlockController.#instance) {
      BlockController.#instance = new BlockController(
        new TransactionRepository(db),
        new TxActionAddressRepository(db),
        new AssetRepository(db),
        db,
        ch,
      );
    }

    return BlockController.#instance;
  }

  private constructor(
    private readonly transactionRepository: ITransactionRepository,
    private readonly txActionAddressRepository: ITxActionAddressRepository,
    private readonly assetRepository: IAssetRepository,
    private readonly db: PostgresJsDatabase<typeof schema>,
    private readonly ch: Kysely<Database>,
  ) {}

  async getBestBlockNumber({ chain }: { chain: Chain }) {
    switch (chain) {
      case Chain.CKB:
        const blocks = await getBlocks({ page: 1, pageSize: 1 });
        return parseInt(blocks.data[0]?.attributes.number ?? '0');
      case Chain.BTC:
        return getBestBlockHeight();
      default:
        return 0;
    }
  }

  async getOriginalBlockInfo({ blockHash, network }: { blockHash: string; network: Network }) {
    await this.checkBlock({ network, blockHash });
    switch (network) {
      case 'ckb':
        const rpc = new RPC(env.CKB_RPC_URL ?? '');
        const block = await rpc.getBlock(blockHash);
        return block;
      case 'btc':
        return getBTCBlock({ hash: toHexNo0x(blockHash) });
      default:
        return null;
    }
  }

  async getBlockInfo(req: { network: Network; hashOrHeight: number | string }) {
    let blockHeight: number | undefined, blockHash: string | undefined;
    if (req.hashOrHeight.toString().length < MIN_HASH_LENGTH) {
      blockHeight = Number(req.hashOrHeight);
    } else {
      blockHash = req.hashOrHeight.toString();
    }
    const blockInfo = await this.checkBlock(
      blockHeight !== undefined
        ? { network: req.network, blockHeight }
        : { network: req.network, blockHash: blockHash! },
    );
    switch (blockInfo.network) {
      case 'ckb':
        const block = await getBlock(blockInfo.blockHeight);
        const ckbVolume = await queryBlockAssetTotal(block.data.attributes.block_hash, NATIVE_ASSETS.CKB);
        const assetsInBlock = await queryBlockAssetsAndVolume(block.data.attributes.block_hash);
        const tokensInBlock = assetsInBlock.filter((v) => v.assetId !== NATIVE_ASSETS.CKB);
        const calculator = await createMarketService().createCalculatorInBlock(block.data.attributes.block_hash);
        const ckbAssetInfo = (await this.assetRepository.getAssetsMapByAssetIds([NATIVE_ASSETS.CKB]))[
          NATIVE_ASSETS.CKB
        ];

        return {
          token: {
            count: tokensInBlock.length,
            totalAmountUsd: sumBigNumbers(tokensInBlock, (v) => v.volume).toString(),
          },
          txFee: {
            amount: block.data.attributes.total_transaction_fee,
            amountUsd: calculator({
              assetId: NATIVE_ASSETS.CKB,
              value: block.data.attributes.total_transaction_fee,
            }),
            asset: ckbAssetInfo,
          },
          txAmount: {
            amount: BigInt(ckbVolume.value),
            amountUsd: ckbVolume.volume,
            asset: ckbAssetInfo,
          },
          blockReward: {
            amount: block.data.attributes.miner_reward,
            amountUsd: calculator({
              assetId: NATIVE_ASSETS.CKB,
              value: block.data.attributes.miner_reward,
            }),
            asset: ckbAssetInfo,
          },
          txCount: block.data.attributes.transactions_count,
          hash: block.data.attributes.block_hash,
          height: parseInt(block.data.attributes.number),
          miner: block.data.attributes.miner_hash,
          time: parseInt(block.data.attributes.timestamp),
          weight: block.data.attributes.cycles,
          size: block.data.attributes.size,
          difficulty: block.data.attributes.difficulty,
          merkleRoot: block.data.attributes.transactions_root,
          nonce: block.data.attributes.nonce,
          bits: null,
        };
      case 'btc':
        try {
          const btcBlock = await getBlockDetail(blockInfo.blockHeight);
          if (!btcBlock) return null;
          const btcVolume = await queryBlockAssetTotal(btcBlock.id, NATIVE_ASSETS.BTC);
          const assetsInBlock = await queryBlockAssetsAndVolume(btcBlock.id);
          const tokensInBlock = assetsInBlock.filter((v) => v.assetId !== NATIVE_ASSETS.BTC);
          const calculator = await createMarketService().createCalculatorInBlock(btcBlock.id);
          const blockTimeMillis = btcBlock.timestamp * 1000;
          const btcAssetInfo = (await this.assetRepository.getAssetsMapByAssetIds([NATIVE_ASSETS.BTC]))[
            NATIVE_ASSETS.BTC
          ];
          return {
            token: {
              count: tokensInBlock.length,
              totalAmountUsd: sumBigNumbers(tokensInBlock, (v) => v.volume).toString(),
            },
            txFee: {
              amount: btcBlock.extras.totalFees.toString(),
              amountUsd: calculator({
                assetId: NATIVE_ASSETS.BTC,
                value: btcBlock.extras.totalFees.toString(),
              }),
              asset: btcAssetInfo,
            },
            txAmount: {
              amount: BigInt(btcVolume.value),
              amountUsd: btcVolume.volume,
              asset: btcAssetInfo,
            },
            blockReward: {
              amount: btcBlock.extras.reward.toString(),
              amountUsd: calculator({
                assetId: NATIVE_ASSETS.BTC,
                value: btcBlock.extras.reward.toString(),
              }),
              asset: btcAssetInfo,
            },
            txCount: btcBlock.tx_count.toString(),
            hash: btcBlock.id,
            height: btcBlock.height,
            miner: btcBlock.extras.coinbaseAddress ?? '',
            time: blockTimeMillis,
            weight: btcBlock.weight,
            size: btcBlock.size,
            difficulty: btcBlock.difficulty.toString(),
            merkleRoot: btcBlock.merkle_root,
            nonce: btcBlock.nonce.toString(),
            bits: btcBlock.bits.toString(),
          };
        } catch (e) {}
      default:
        break;
    }
    return null;
  }

  async getTransactionList(
    req: {
      blockHash: string;
      txHash?: string;
      from?: string;
      to?: string;
      addressFilterOperator?: 'or' | 'and';
      orderDirection?: 'desc' | 'asc';
    } & PaginationInput,
  ) {
    await this.checkBlock({ blockHash: req.blockHash });
    const { txs, total } = await this.transactionRepository.getTransactionListByBlock(
      req.blockHash,
      {
        from: req.from,
        to: req.to,
        addressCondition: req.addressFilterOperator,
        txHash: req.txHash,
      },
      {
        page: req.page,
        pageSize: req.pageSize,
      },
      req.orderDirection ?? undefined,
    );
    return {
      total,
      result: txs.map((r) => ({
        hash: r.hash ?? '',
        txIndex: r.txIndex,
        amount: r.amount,
        amountUsd: r.volume ?? 0,
        from: r.fromCount === 0 ? 'coinbase' : (r.from ?? ''),
        fromCount: r.fromCount,
        to: r.to ?? '',
        toCount: r.toCount,
        asset: r.tokenInfo ?? r.assetInfo,
      })),
    };
  }

  async getAddressChangeList(
    req: {
      blockHash: string;
      address?: string;
      orderDirection?: 'asc' | 'desc';
    } & PaginationInput,
  ) {
    await this.checkBlock({ blockHash: req.blockHash });
    const block = await this.fetchBlockInfo(req.blockHash);

    const addressChangeListPromise = this.txActionAddressRepository.getAddressChangeListByTransactions(
      req.blockHash,
      req.orderDirection,
      req.address,
      req.page,
      req.pageSize,
    );

    const [addressChangeList, totalAddressChangeCount] = await Promise.all([
      addressChangeListPromise,
      queryBlockAddressCount(req.blockHash, req.address),
    ]);

    const result = R.pipe(
      addressChangeList,
      R.filter((v) => !!v.address),
      R.groupBy((v) => v.address),
      R.mapValues((v, address) => {
        const change = v.reduce(
          (acc, cur) => {
            if (cur.assetId !== NATIVE_ASSETS.CKB && cur.assetId !== NATIVE_ASSETS.BTC && cur.value) {
              if (cur.value > 0n) {
                acc.increase++;
              } else if (cur.value < 0n) {
                acc.decrease++;
              }
            } else {
              acc.amount += BigInt(cur.value ?? '0');
            }
            acc.amountUsd += cur.volume ?? 0;
            return acc;
          },
          { increase: 0, decrease: 0, amount: 0n, amountUsd: 0 },
        );
        return {
          address: block?.network ? addressConvert.fromCH(address, block.network) : address,
          amountUsd: change.amountUsd,
          sendTokens: change?.increase ?? 0,
          receiveTokens: change?.decrease ?? 0,
          amount: change?.amount ?? 0n,
        };
      }),
      R.values(),
      R.sortBy((v) => (req.orderDirection === 'desc' ? -v.amountUsd : v.amountUsd)),
    );

    return {
      total: totalAddressChangeCount,
      result,
    };
  }

  async getAddressTransferChangeList(req: { blockHash: string; address: string } & PaginationInput) {
    await this.checkBlock({ blockHash: req.blockHash });
    const block = await this.fetchBlockInfo(req.blockHash);
    const address = block?.network ? addressConvert.toCH(req.address, block.network) : req.address;
    const res = await queryAddressAssetsChangeInBlock(req.blockHash, address, {
      page: req.page,
      pageSize: req.pageSize,
    });
    const assetIds = res.data.map((r) => r.assetId);
    const assets = await this.db.query.assetInfo.findMany({
      where(fields, operators) {
        return operators.inArray(fields.id, assetIds);
      },
    });
    const assetMap = R.mapToObj(assets, (v) => [v.id, v]);

    return {
      total: res.total,
      result: res.data.map((v) => {
        return {
          amountUsd: v.volume ?? 0,
          amountSent: BigInt(v.input ?? 0),
          amountReceived: BigInt(v.output ?? 0),
          asset: {
            id: v.assetId,
            name: assetMap[v.assetId]?.name ?? 'UNKNOWN',
            icon: assetMap[v.assetId]?.icon ?? null,
            symbol: assetMap[v.assetId]?.symbol ?? 'UNKNOWN',
            decimals: assetMap[v.assetId]?.decimals ?? 0,
          },
        };
      }),
    };
  }

  async getAssetList(req: { blockHash: string }) {
    await this.checkBlock({ blockHash: req.blockHash });
    const assetList = await this.assetRepository.getAssetNameListByBlock(req.blockHash);

    return {
      data: assetList,
    };
  }

  async getAssetTransferList(req: { blockHash: string; assetId: string } & PaginationInput) {
    await this.checkBlock({ blockHash: req.blockHash });
    const assetInfoPromise = this.assetRepository.getAssetsMapByAssetIds([req.assetId]);
    const assetTransfersPromise = this.transactionRepository.getAssetTransfersByBlock(
      req.blockHash,
      req.assetId,
      req.page,
      req.pageSize,
    );
    const assetTransferTotalCountPromise = this.transactionRepository.getTransactionCountByAssetId(
      req.blockHash,
      req.assetId,
    );

    const [assetTransfers, assetTransferTotalCount, assetInfo] = await Promise.all([
      assetTransfersPromise,
      assetTransferTotalCountPromise,
      assetInfoPromise,
    ]);

    const asset = assetInfo[req.assetId];
    return {
      total: assetTransferTotalCount,
      result: assetTransfers.map((r) => {
        return {
          hash: r.hash,
          amountUsd: r.volume ?? 0,
          amount: r.amount,
          asset: asset
            ? {
                id: asset.id,
                name: asset.name,
                icon: asset.icon ?? null,
                symbol: asset.symbol ?? '',
                decimals: asset.decimals ?? 0,
              }
            : undefined,
        };
      }),
    };
  }

  async getAssetChangeList(
    req: {
      blockHash: string;
      orderDirection?: 'asc' | 'desc';
      assetName: string | null;
      tags: string[];
    } & PaginationInput,
  ) {
    await this.checkBlock({ blockHash: req.blockHash });
    const { data, total } = await this.txActionAddressRepository.getTransactionsByBlockSumVolumnWithAsset(
      req.blockHash,
      req.orderDirection,
      req.assetName ?? undefined,
      req.tags ?? undefined,
      req.page,
      req.pageSize,
    );
    const tags = await this.assetRepository.getTagsByAssetIds(
      data.map((r) => r.asset.id).filter((assetId) => assetId != null),
    );
    return {
      total,
      result: data.map((r) => ({
        ...r,
        tags: Array.from(tags.get(r.asset.id ?? '') ?? []),
      })),
    };
  }

  async fetchBlockInfo(blockHash: string): Promise<{
    network: Network;
    number: number;
    txCount: number;
    hash: string;
  } | null> {
    const { unhex } = createHelper();
    const res = await this.ch
      .selectFrom('tx_action')
      .select([
        (eb) => eb.fn<string>('any', [eb.fn(`'0x' || hex`, ['block_hash'])]).as('blockHash'),
        (eb) => eb.fn<string>('countDistinct', ['tx_hash']).as('txCount'),
        (eb) => eb.fn<'ckb' | 'btc'>('any', ['network']).as('network'),
        (eb) => eb.fn<string>('any', ['block_number']).as('blockNumber'),
      ])
      .where('block_hash', '=', unhex(blockHash))
      .executeTakeFirst();

    if (!res) {
      return null;
    }
    return {
      network: res.network,
      number: Number(res.blockNumber),
      txCount: Number(res.txCount),
      hash: res.blockHash,
    };
  }

  async checkBlock(params: { network?: Network; blockHash: string } | { network: Network; blockHeight: number }) {
    const { hex, unhex } = createHelper();
    let blockHash: string | undefined, blockHeight: number | undefined;
    if ('blockHash' in params) {
      blockHash = params.blockHash;
    } else {
      blockHeight = params.blockHeight;
    }
    const block = await this.ch
      .selectFrom('mv_block_info')
      .select(['network', 'block_number as blockHeight', hex('block_hash', 'blockHash')])
      .$if(!!params.network, (eb) => eb.where('network', '=', params.network!))
      .$if(!!blockHash, (eb) => eb.where('block_hash', '=', unhex(blockHash!)))
      .$if(blockHeight !== undefined, (eb) => eb.where('block_number', '=', blockHeight!))
      .executeTakeFirst();
    if (!block) {
      throw new TRPCError({
        message: `Can not find the ${blockHash ?? blockHeight} block in ${params.network}`,
        code: 'NOT_FOUND',
      });
    }
    return block;
  }
}
