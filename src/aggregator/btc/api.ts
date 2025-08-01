/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-explicit-any */

import { type Block as MempoolBlock } from '@mempool/mempool.js/lib/interfaces/bitcoin/blocks';
import {
  type Tx as MempoolTx,
  type Vout as MempoolVout,
} from '@mempool/mempool.js/lib/interfaces/bitcoin/transactions';
import BigNumber from 'bignumber.js';
import { script, Transaction as BitcoinTx } from 'bitcoinjs-lib';
import * as R from 'remeda';
import {
  BehaviorSubject,
  concatMap,
  first,
  firstValueFrom,
  from,
  identity,
  interval,
  mergeMap,
  type Observable,
  of,
  share,
  throwError,
  timeout,
} from 'rxjs';

import { env } from '~/env';
import { nonNullable } from '~/utils/asserts';

import { type Logger } from '../types';

const BTC_RPC_URL = env.BTC_RPC_URL;
const BTC_RPC_USERNAME = env.BTC_RPC_USERNAME;
const BTC_RPC_PASSWORD = env.BTC_RPC_PASSWORD;
const BTC_RPC_AUTH =
  BTC_RPC_USERNAME && BTC_RPC_PASSWORD ? `Basic ${btoa(BTC_RPC_USERNAME + ':' + BTC_RPC_PASSWORD)}` : undefined;
const logger: Logger = console;

export async function getBlockHash({ height }: { height: number }): Promise<string> {
  const hash = await request<string | undefined, [number]>({ method: 'getblockhash', params: [height] });
  if (!hash) {
    throw new Error(`Cannot find the block hash of ${height}`);
  }
  return hash;
}

export async function getBlock(params: { hash: string }): Promise<
  Omit<MempoolBlock, 'extras'> & {
    extras: {
      totalFees: number;
      reward: number;
      coinbaseAddress: string;
      coinbaseAddresses: string[];
    };
  }
> {
  const blockhash = params.hash.replace('0x', '');
  const block = await request<BitcoinApiBlock | null, [string]>({ method: 'getblock', params: [blockhash] });

  if (!block) {
    throw new Error(`Cannot find the block ${params.hash}`);
  }

  const coinbaseTxid = nonNullable(block.tx[0]);
  const coinbaseTx = await request<BitcoinApiCoinbaseTx, [string, number]>({
    method: 'getrawtransaction',
    params: [coinbaseTxid, 2],
  });
  const reward = coinbaseTx.vout
    .map((vout) => BigNumber(vout.value).times(1e8))
    .reduce((sum, b) => sum.plus(b), BigNumber(0))
    .toNumber();
  const addresses = coinbaseTx.vout.map((vout) => vout.scriptPubKey.address).filter((value) => value != null);

  const stats = await request<{ totalfee: number }, [string, string[]]>({
    method: 'getblockstats',
    params: [blockhash, ['totalfee']],
  });

  return {
    id: block.hash,
    height: block.height,
    timestamp: block.time,
    tx_count: block.nTx,
    bits: Number('0x' + block.bits),
    difficulty: block.difficulty,
    mediantime: block.mediantime,
    merkle_root: block.merkleroot,
    nonce: block.nonce,
    previousblockhash: block.previousblockhash,
    size: block.size,
    version: block.version,
    weight: block.weight,
    extras: {
      totalFees: stats.totalfee,
      reward: BigNumber(reward).times(1e8).toNumber(),
      coinbaseAddress: addresses[0] ?? '',
      coinbaseAddresses: addresses,
    },
  };
}

// not in use so we don't need to wrap it
// export const getBlocks = wrapperMempoolAPI(blocks.getBlocks, 'getBlocks');

// export const getBlockTxs = wrapperMempoolAPI(blocks.getBlockTxs, 'getBlockTxs');
export async function getBlockTxs({ hash }: { hash: string }): Promise<MempoolTx[]> {
  const blockhash = hash.replace('0x', '');
  const bitcoinApiBlock = await request<BitcoinApiBlock | null, [string]>({ method: 'getblock', params: [blockhash] });
  if (!bitcoinApiBlock) {
    return [];
  }

  const txHashes = bitcoinApiBlock.tx;
  const fetchAllTxs$ = txHashes.map((txHash) =>
    request<BitcoinApiTx, [string, number]>({ method: 'getrawtransaction', params: [txHash, 2] }),
  );
  const txs = await Promise.all(fetchAllTxs$);
  return rawTxsToMempoolTxs(txs, bitcoinApiBlock.height);
}

function isCoinbaseTx(tx: BitcoinApiTx): tx is BitcoinApiCoinbaseTx {
  return tx.vin.length === 1 && isCoinbaseVin(tx.vin[0]);
}

function isCoinbaseVin(vin: unknown): vin is BitcoinApiCoinbaseVin {
  return vin != null && typeof vin === 'object' && 'coinbase' in vin;
}

function rawTxsToMempoolTxs(txs: BitcoinApiTx[], height: number): MempoolTx[] {
  return txs.map((tx) => {
    return {
      fee: isCoinbaseTx(tx)
        ? 0 // is coinbase
        : tx.vin
            .reduce((sum, vin) => sum.plus(vin.prevout.value), BigNumber(0))
            .minus(tx.vout.reduce((sum, vout) => sum.plus(vout.value), BigNumber(0)))
            .times(1e8)
            .toNumber(),
      locktime: tx.locktime,
      size: tx.size,
      txid: tx.txid,
      weight: tx.weight,
      version: tx.version,
      status: {
        block_hash: tx.blockhash,
        block_height: height,
        block_time: tx.blocktime,
        confirmed: true,
      },
      vin: tx.vin.map<MempoolTx['vin'][number]>((vin) => {
        if (isCoinbaseVin(vin)) {
          let scriptsig_asm;

          // https://github.com/Magickbase/Web3-Platform/issues/1060
          // coinbase can be written with anything, if it's not valid, we just set it to empty string
          try {
            scriptsig_asm = convertScriptSigAsm(vin.coinbase);
          } catch {
            scriptsig_asm = '';
          }

          return {
            is_coinbase: true,
            // FIXME: this can be null in Mempool, but the type def is not correct in @mempool/mempool.js
            prevout: null as unknown as MempoolTx['vin'][number]['prevout'],
            scriptsig: vin.coinbase,
            scriptsig_asm,
            sequence: String(vin.sequence),
            txid: '0000000000000000000000000000000000000000000000000000000000000000',
            vout: 0xffffffff,
          };
        }

        return {
          txid: vin.txid,
          vout: vin.vout,
          is_coinbase: false,
          prevout: {
            value: BigNumber(vin.prevout.value).times(1e8).toNumber(),
            scriptpubkey: vin.prevout.scriptPubKey.hex,
            // FIXME: this can be null in Mempool, but the type def is not correct in @mempool/mempool.js
            scriptpubkey_address: vin.prevout.scriptPubKey.address as unknown as string,
            scriptpubkey_asm: convertScriptSigAsm(vin.prevout.scriptPubKey.hex),
            scriptpubkey_type: translateScriptPubKeyType(vin.prevout.scriptPubKey.type),
          },
          scriptsig: vin.scriptSig.hex,
          scriptsig_asm: convertScriptSigAsm(vin.scriptSig.hex),
          sequence: String(vin.sequence),
        };
      }),
      vout: tx.vout.map(bitcoinApiVoutToMempoolVout),
    };
  });
}

function bitcoinApiVoutToMempoolVout(vout: BitcoinApiVout): MempoolVout {
  return {
    value: BigNumber(vout.value).times(1e8).toNumber(),
    scriptpubkey: vout.scriptPubKey.hex,
    scriptpubkey_address: vout.scriptPubKey.address ?? '',
    scriptpubkey_asm: convertScriptSigAsm(Buffer.from(vout.scriptPubKey.hex).toString('hex')),
    scriptpubkey_type: translateScriptPubKeyType(vout.scriptPubKey.type),
  };
}

// export const getBestBlockHeight = wrapperMempoolAPI(blocks.getBlocksTipHeight, 'getBlocksTipHeight');
export function getBestBlockHeight(): Promise<number> {
  return request<number>({ method: 'getblockcount', params: [] });
}
// export const getBestBlockHash = wrapperMempoolAPI(blocks.getBlocksTipHash, 'getBlocksTipHash');
export function getBestBlockHash() {
  return request<string>({ method: 'getbestblockhash', params: [] });
}

export async function getBlockDetail(height: number) {
  const hash = await getBlockHash({ height });
  if (!hash) {
    return null;
  }
  return getBlock({ hash });
}

export const getTx = async ({
  txid,
}: {
  txid: string;
}): Promise<{ transaction: TransactionDetail; vouts: Vout[]; vins: Vin[] }> => {
  const tx = await request<BitcoinApiTx>({ method: 'getrawtransaction', params: [txid.replace('0x', ''), 2] });
  const { height } = await request<{ height: number }>({ method: 'getblockheader', params: [tx.blockhash] });
  return {
    transaction: {
      txid: tx.txid,
      hash: tx.hash,
      version: tx.version,
      size: tx.size,
      weight: tx.weight,
      locktime: tx.locktime,
      blockHeight: height,
      fee: tx.fee,
    },
    vouts: tx.vout.map((v, index) => ({
      outpoint: {
        txid: tx.txid,
        index,
      },
      address: v.scriptPubKey.address ?? '',
      value: BigNumber(v.value).times(1e8).toNumber(),
      scriptpubkey: v.scriptPubKey.hex,
      scriptpubkey_address: v.scriptPubKey.address,
      scriptpubkey_asm: convertScriptSigAsm(v.scriptPubKey.hex),
      scriptpubkey_type: translateScriptPubKeyType(v.scriptPubKey.type),
    })),
    vins: tx.vin.map((v, index) => ({
      consumed_outpoint: {
        txid: tx.txid,
        index,
      },
      txid: tx.txid,
      is_coinbase: isCoinbaseVin(v),
      scriptsig_asm: isCoinbaseVin(v) ? '' : convertScriptSigAsm(v.scriptSig.hex),
      vout: {
        outpoint: {
          txid: isCoinbaseVin(v) ? tx.txid : v.txid,
          index: isCoinbaseVin(v) ? 0 : v.vout,
        },
        address: isCoinbaseVin(v) ? '' : (v.prevout.scriptPubKey.address ?? ''),
        value: isCoinbaseVin(v) ? 0 : BigNumber(v.prevout.value).times(1e8).toNumber(),
      },
    })),
  };
};

export const getTxRawData = async ({ txid }: { txid: string }): Promise<MempoolTx> => {
  const tx = await request<BitcoinApiTx, [string, number]>({ method: 'getrawtransaction', params: [txid, 2] });
  const { height } = await request<{ height: number }>({ method: 'getblockheader', params: [tx.blockhash] });

  const result = rawTxsToMempoolTxs([tx], height)[0];
  if (!result) {
    throw new Error(`Cannot find the tx ${txid}`);
  }

  return result;
};

export const getTxWithFeeRate = async ({
  txid,
}: {
  txid: string;
}): Promise<{ transaction: TransactionDetail & { feeRate: number }; vouts: Vout[]; vins: Vin[] }> => {
  const txidWithoutPrefix = txid.replace('0x', '');
  const [tx, txHex] = await Promise.all([
    getTx({ txid: txidWithoutPrefix }),
    request<string>({ method: 'getrawtransaction', params: [txidWithoutPrefix] }),
  ]);
  return {
    ...tx,
    transaction: {
      ...tx.transaction,
      feeRate: (tx.transaction.fee ?? 0) / BitcoinTx.fromHex(txHex).virtualSize(),
    },
  };
};

export const getTxOut = ({ txid, vout }: { txid: string; vout: number }): Promise<Txout | null> => {
  return request<Txout>({ method: 'gettxout', params: [txid, vout] });
};

export type Txout = {
  result: {
    bestblock: string;
    confirmations: number;
    value: number;
    scriptPubKey: {
      asm: string;
      desc: string;
      hex: string;
      address: string;
      type: string;
    };
    coinbase: boolean;
  };
};

export const getAddress = async ({ address }: { address: string }): Promise<BlockbookAddress | undefined> => {
  return request<BlockbookAddress | undefined>({ method: 'bb_getAddress', params: [address] });
};

export interface Block extends MempoolBlock {
  hash: string;
  time: number;
}

export interface OutPoint {
  txid: string;
  index: number;
}

export interface TransactionBase {
  txid: string;
  hash: string;
  version: number;
  size: number;
  weight: number;
  locktime: number;
}

export interface Transaction {
  transaction: TransactionBase;
  vin: {
    txid: string;
    vout: number;
  }[];
  vout: {
    value: number;
    index: number;
    txid: string;
    scriptPubKey: {
      asm: string;
      desc: string;
      hex: string;
      address: string;
      type: string;
    };
  }[];
}

export interface Vout {
  outpoint: OutPoint;
  value: number;
  address: string;
  scriptpubkey?: string;
  scriptpubkey_address?: string;
  scriptpubkey_asm?: string;
  scriptpubkey_type?: string;
}

export interface Vin {
  consumed_outpoint: OutPoint;
  txid: string;
  is_coinbase: boolean;
  scriptsig_asm: string;
  vout: Vout;
}

export interface TransactionDetail extends TransactionBase {
  blockHeight: number;
  fee?: number;
}

export type ResolvedVout = Vout;
export type ResolvedVin = Vout;

export type ResolvedTransaction = Omit<MempoolTx, 'vin' | 'vout'> & {
  hash: string;
  blockHeight: number;
  vins: ResolvedVin[];
  vouts: ResolvedVout[];
};

// tx from getrawtransaction
export type BitcoinApiTx = BitcoinApiCoinbaseTx | BitcoinApiNonCoinbaseTx;

type BitcoinApiCoinbaseVin = {
  coinbase: string;
  txinwitness: Array<string>;
  sequence: number;
};

type BitcoinApiNonCoinbaseVin = {
  txid: string;
  vout: number;
  scriptSig: {
    asm: string;
    hex: string;
  };
  prevout: {
    generated: boolean;
    height: number;
    value: number;
    scriptPubKey: {
      asm: string;
      desc: string;
      hex: string;
      address?: string;
      type: string;
    };
  };
  sequence: number;
};

type BitcoinApiTxWithVin<Vin> = {
  txid: string;
  hash: string;
  version: number;
  size: number;
  vsize: number;
  weight: number;
  locktime: number;
  vin: Array<Vin>;
  vout: Array<{
    value: number;
    n: number;
    scriptPubKey: {
      asm: string;
      desc: string;
      hex: string;
      address?: string;
      type: string;
    };
  }>;
  fee: number;
  hex: string;
  blockhash: string;
  confirmations: number;
  time: number;
  blocktime: number;
};

type BitcoinApiNonCoinbaseTx = BitcoinApiTxWithVin<BitcoinApiNonCoinbaseVin>;

type BitcoinApiCoinbaseTx = BitcoinApiTxWithVin<BitcoinApiCoinbaseVin>;

type BitcoinApiVout = {
  value: number;
  n: number;
  scriptPubKey: {
    asm: string;
    hex: string;
    address?: string;
    type: string;
  };
};

// https://github.com/mempool/mempool/blob/75972f709ec8d0c0e6ce0582605f5daa54a2e056/backend/src/api/transaction-utils.ts#L254-L317
function convertScriptSigAsm(hex: string): string {
  const buf = Buffer.from(hex, 'hex');

  const b: string[] = [];

  let i = 0;
  while (i < buf.length) {
    const op = buf[i]!;
    if (op >= 0x01 && op <= 0x4e) {
      i++;
      let push: number;
      if (op === 0x4c) {
        push = buf.readUInt8(i);
        b.push('OP_PUSHDATA1');
        i += 1;
      } else if (op === 0x4d) {
        push = buf.readUInt16LE(i);
        b.push('OP_PUSHDATA2');
        i += 2;
      } else if (op === 0x4e) {
        push = buf.readUInt32LE(i);
        b.push('OP_PUSHDATA4');
        i += 4;
      } else {
        push = op;
        b.push('OP_PUSHBYTES_' + push);
      }

      const data = buf.slice(i, i + push);
      if (data.length !== push) {
        break;
      }

      b.push(data.toString('hex'));
      i += data.length;
    } else {
      if (op === 0x00) {
        b.push('OP_0');
      } else if (op === 0x4f) {
        b.push('OP_PUSHNUM_NEG1');
      } else if (op === 0xb1) {
        b.push('OP_CLTV');
      } else if (op === 0xb2) {
        b.push('OP_CSV');
      } else if (op === 0xba) {
        b.push('OP_CHECKSIGADD');
      } else {
        const opcode = script.toASM([op]);
        if (opcode && op < 0xfd) {
          if (/^OP_(\d+)$/.test(opcode)) {
            b.push(opcode.replace(/^OP_(\d+)$/, 'OP_PUSHNUM_$1'));
          } else {
            b.push(opcode);
          }
        } else {
          b.push('OP_RETURN_' + op);
        }
      }
      i += 1;
    }
  }

  return b.join(' ');
}

// https://github.com/mempool/mempool/blob/75972f709ec8d0c0e6ce0582605f5daa54a2e056/backend/src/api/bitcoin/bitcoin-api.ts#L324-L343
function translateScriptPubKeyType(outputType: string): string {
  const map: Record<string, string> = {
    pubkey: 'p2pk',
    pubkeyhash: 'p2pkh',
    scripthash: 'p2sh',
    witness_v0_keyhash: 'v0_p2wpkh',
    witness_v0_scripthash: 'v0_p2wsh',
    witness_v1_taproot: 'v1_p2tr',
    nonstandard: 'nonstandard',
    multisig: 'multisig',
    anchor: 'anchor',
    nulldata: 'op_return',
  };

  if (outputType in map) {
    return map[outputType]!;
  } else {
    return 'unknown';
  }
}

export type BitcoinApiBlock = {
  hash: string;
  confirmations: number;
  height: number;
  version: number;
  versionHex: string;
  merkleroot: string;
  time: number;
  mediantime: number;
  nonce: number;
  bits: string;
  target: string;
  difficulty: number;
  chainwork: string;
  nTx: number;
  previousblockhash: string;
  nextblockhash: string;
  strippedsize: number;
  size: number;
  weight: number;
  tx: Array<string>;
};

export type BlockbookBlock = {
  page: number;
  totalPages: number;
  itemsOnPage: number;
  hash: string;
  previousBlockHash: string;
  nextBlockHash: string;
  height: number;
  confirmations: number;
  size: number;
  time: number;
  version: number;
  merkleRoot: string;
  nonce: string;
  bits: string;
  difficulty: string;
  txCount: number;
  txs: Array<{
    txid: string;
    vin: Array<{
      n: number;
      isAddress: boolean;
      value: string;
      addresses?: Array<string>;
    }>;
    vout: Array<{
      value: string;
      n: number;
      addresses: Array<string>;
      isAddress: boolean;
      spent?: boolean;
      hex?: string;
    }>;
    blockHash: string;
    blockHeight: number;
    confirmations: number;
    blockTime: number;
    value: string;
    valueIn: string;
    fees: string;
  }>;
};

export type BlockbookTx = {
  txid: string;
  version: number;
  vin: Array<{
    txid: string;
    vout: number;
    sequence: number;
    n: number;
    addresses: Array<string>;
    isAddress: boolean;
    value: string;
  }>;
  vout: Array<{
    value: string;
    n: number;
    hex: string;
    addresses: Array<string>;
    isAddress: boolean;
  }>;
  blockHash: string;
  blockHeight: number;
  confirmations: number;
  blockTime: number;
  size: number;
  vsize: number;
  value: string;
  valueIn: string;
  fees: string;
  hex: string;
};

export type BlockbookAddress = {
  page: number;
  totalPages: number;
  itemsOnPage: number;
  address: string;
  balance: string;
  totalReceived: string;
  totalSent: string;
  unconfirmedBalance: string;
  unconfirmedTxs: number;
  txs: number;
  txids: Array<string>;
};

const queue$ = new BehaviorSubject({
  unprocessed: [] as JsonRpcRequest[],
  processing: [] as JsonRpcRequest[],
});

const MAX_BATCH_REQUEST_NUMBER = 300;

// batch requests every 50ms
const rateLimitdRpc$: Observable<JsonRpcResponse> = interval(50).pipe(
  mergeMap(() => {
    const availableRequestCount = MAX_BATCH_REQUEST_NUMBER - queue$.value.processing.length;
    if (queue$.value.unprocessed.length === 0 || availableRequestCount <= 0) {
      return [];
    }

    const currentRoundTasks = queue$.value.unprocessed.slice(0, availableRequestCount);

    queue$.next({
      ...queue$.value,
      unprocessed: queue$.value.unprocessed.slice(availableRequestCount),
      processing: queue$.value.processing.concat(currentRoundTasks),
    });

    const batchStartTime = performance.now();
    logger.debug(
      `Sent ${currentRoundTasks.length} requests to BTC RPC, ${queue$.value.unprocessed.length} is in queue`,
    );
    const res$ = fetch(BTC_RPC_URL, {
      method: 'POST',
      body: JSON.stringify(currentRoundTasks),
      headers: new Headers(BTC_RPC_AUTH ? { Authorization: BTC_RPC_AUTH } : undefined),
    })
      .then<JsonRpcResponse[]>((res) => res.json())
      .then((jsonRpcReses) => {
        logger.debug(
          `Received ${currentRoundTasks.length}/${jsonRpcReses.length} responses from BTC RPC, cost ${performance.now() - batchStartTime}ms`,
        );
        try {
          // QuickNode/BTC RPC may return an error object instead of an array of error objects
          if (!Array.isArray(jsonRpcReses)) {
            logger.warn('Unexpected response from BTC RPC:', JSON.stringify(jsonRpcReses));
            queue$.next({
              ...queue$.value,
              unprocessed: currentRoundTasks.concat(queue$.value.unprocessed),
              processing: queue$.value.processing.filter(
                (req) => !currentRoundTasks.some((task) => task.id === req.id),
              ),
            });

            return [];
          }
          const [rateLimitResponses, nonRateLimitResponses] = R.partition(jsonRpcReses, isRateLimitErrorResponse);

          if (rateLimitResponses.length > 0) {
            logger.warn('rate limit reached, banned request count:', rateLimitResponses.length);
          }

          const rateLimitTasks = rateLimitResponses.map((res) =>
            nonNullable(currentRoundTasks.find((task) => task.id === res.id)),
          );

          queue$.next({
            ...queue$.value,
            // prepend rate limit tasks to unprocesses for retry in next round
            unprocessed: rateLimitTasks.concat(queue$.value.unprocessed),
            processing: queue$.value.processing.filter(
              (req) => !nonRateLimitResponses.some((res) => res.id === req.id),
            ),
          });

          return nonRateLimitResponses;
        } catch (e) {
          logger.warn(jsonRpcReses);
          logger.warn(e);
          throw e;
        }
      });

    return from(res$).pipe(timeout(60_000));
  }),
  concatMap(identity),
  share(),
);

function isSuccessResponse(res: JsonRpcResponse): res is JsonRpcSuccessResponse {
  return 'result' in res;
}

function isRateLimitErrorResponse(obj: any): obj is JsonRpcErrorResponse & { error: { code: -32007 | -32013 } } {
  if (!obj || typeof obj !== 'object') {
    return false;
  }

  const errorCode = (obj.code ?? obj.error?.code) as number;
  return errorCode === -32007 || errorCode === -32013;
}

let id = 0;

function enqueue(...tasks: JsonRpcRequest[]) {
  queue$.next({ ...queue$.value, unprocessed: [...queue$.value.unprocessed, ...tasks] });
}
export function request<Result = unknown, Params = unknown>(body: JsonRpcRequestBody<Params>): Promise<Result> {
  const taskId = ++id;
  enqueue({ ...body, jsonrpc: '2.0', id: taskId });

  const res$ = rateLimitdRpc$.pipe(
    first((res) => res.id === taskId),
    mergeMap((res) => {
      return isSuccessResponse(res)
        ? of(res.result as Result)
        : throwError(() => new Error(`${res.error.code}: ${res.error.message}`));
    }),
  );

  return firstValueFrom(res$);
}

type JsonRpcRequestBody<Params = unknown> = {
  method: string;
  params: Params;
};

type JsonRpcRequest = {
  jsonrpc: '2.0';
  id: number | string;
} & JsonRpcRequestBody;

type JsonRpcSuccessResponse<Result = unknown> = {
  id: number | string;
  jsonrpc: '2.0';
  result: Result;
};

type JsonRpcErrorResponse = {
  id: number | string;
  jsonrpc: '2.0';
  error: {
    code: number;
    message: string;
  };
};

type JsonRpcResponse<Result = unknown> = JsonRpcSuccessResponse<Result> | JsonRpcErrorResponse;
