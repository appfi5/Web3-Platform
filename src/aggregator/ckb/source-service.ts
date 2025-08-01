import { type Hash, type HexString, type Input, type Output, RPC, type Transaction } from '@ckb-lumos/lumos';
import { type CKBComponents } from '@ckb-lumos/lumos/rpc';
import { ParamsFormatter } from '@ckb-lumos/lumos/rpc';
import * as R from 'remeda';
import { concatMap, from, lastValueFrom, reduce } from 'rxjs';

import { asserts } from '~/utils/asserts';
import { todo } from '~/utils/unimplemented';

import {
  type CellbaseInput,
  type CellbaseTransaction,
  type CkbSourceService,
  type ResolvedInput,
  type ResolvedOutput,
  type ResolvedTransaction,
} from './types';

const CHUNK_SIZE = 100;

export function createSourceService({ rpcUrl }: { rpcUrl: string }): CkbSourceService {
  const rpc = new RPC(rpcUrl);

  const getBlockHashes: CkbSourceService['getBlockInfosByHeights'] = async (blockNumbers) => {
    if (!blockNumbers.length) return [];

    const requests = blockNumbers.map(
      (blockNumber) => ['getHeaderByNumber', '0x' + blockNumber.toString(16)] as ['getHeaderByNumber', string],
    );
    const headers = (await rpc.createBatchRequest(requests).exec()) as (CKBComponents.BlockHeader | null)[];
    return headers
      .filter((item) => item != null)
      .map((header) => ({ blockHash: header.hash, blockNumber: Number(header.number) }));
  };

  const getResolvedBlock: CkbSourceService['getResolvedBlock'] = async (blockHash) => {
    const block = await rpc.getBlock(blockHash);

    if (!block) {
      return null;
    }

    const [originCellbaseTransaction, ...originNonCellbaseTransactions] = block.transactions;

    const requests = R.pipe(
      originNonCellbaseTransactions,
      R.flatMap((tx) => tx.inputs.map((input) => input.previousOutput.txHash)),
      R.unique(),
      R.map((txHash) => ['getTransaction', txHash] as ['getTransaction', string]),
      R.chunk(CHUNK_SIZE),
    );

    const transactionDict$ = from(requests).pipe(
      concatMap((request) => rpc.createBatchRequest(request).exec() as Promise<CKBComponents.TransactionWithStatus[]>),
      concatMap((tx) => tx),
      reduce(
        (res, tx) => Object.assign(res, { [tx.transaction.hash]: tx.transaction }),
        {} as Record<string, Transaction>,
      ),
    );

    const transactionDict = await lastValueFrom(transactionDict$);

    asserts(originCellbaseTransaction != null, 'The cellbase transaction does not exist');

    const resolvedCellbaseTransaction: CellbaseTransaction = {
      ...originCellbaseTransaction,
      inputs: originCellbaseTransaction.inputs as [CellbaseInput],
      outputs: mapOutputs(originCellbaseTransaction.outputs, originCellbaseTransaction.outputsData),
    };

    const resolvedTransactions: ResolvedTransaction[] = originNonCellbaseTransactions.map((transaction) => ({
      ...transaction,
      inputs: transaction.inputs.map<ResolvedInput>((input) => ({
        ...input,
        ...resolveInput(input, transactionDict),
      })),
      outputs: mapOutputs(transaction.outputs, transaction.outputsData),
    }));

    return { ...block, transactions: [resolvedCellbaseTransaction, ...resolvedTransactions] };
  };

  const getResolvedBlockByNumber: CkbSourceService['getResolvedBlockByNumber'] = async (blockNumber) => {
    const [info] = await getBlockHashes([blockNumber]);
    if (!info) {
      throw new Error(`Cannot find the block hash of ${blockNumber}`);
    }
    return getResolvedBlock(info.blockHash);
  };

  const getLatestBlockInfo: CkbSourceService['getLastBlockInfo'] = async () => {
    const header = await rpc.getTipHeader();
    return { blockHash: header.hash, blockNumber: Number(header.number) };
  };

  const getCells: CkbSourceService['getCells'] = async (...params) => {
    return rpc.getCells(...params);
  };

  const batchGetTransation: CkbSourceService['batchGetTransation'] = async (txHashes) => {
    if (txHashes.length === 0) return {};

    const res = (await rpc.createBatchRequest(txHashes.map((txHash) => ['getTransaction', txHash])).exec()) as {
      transaction: CKBComponents.Transaction;
    }[];

    return R.pipe(
      res,
      R.filter((tx) => !!tx.transaction),
      R.map((tx) => tx.transaction),
      R.mapToObj((tx) => [tx.hash, tx]),
    );
  };

  const batchCalculateDaoMaximumWithdraw: CkbSourceService['batchCalculateDaoMaximumWithdraw'] = async (inputs) => {
    if (inputs.length === 0) return {};

    const params = inputs.map((i) => ({
      id: 2,
      jsonrpc: '2.0',
      method: 'calculate_dao_maximum_withdraw',
      params: [
        ParamsFormatter.toOutPoint(i.outPoint),
        typeof i.kind === 'string' ? i.kind : ParamsFormatter.toOutPoint(i.kind),
      ],
    }));

    const result = await fetch(rpcUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: JSON.stringify(params),
    });
    if (!result.ok) throw new Error(`response with status ${result.status}, ${result.statusText}`);
    const res = (await result.json()) as { result: string }[];

    return R.pipe(
      inputs,
      R.mapToObj((p, index) => [`${p.outPoint.txHash}:${Number(p.outPoint.index)}`, res[index]?.result ?? '0x0']),
    );
  };

  return {
    getBlockInfosByHeights: getBlockHashes,
    getLastNBlockInfos: todo,
    getResolvedBlock: getResolvedBlock,
    getResolvedBlockByNumber,
    getLastBlockInfo: getLatestBlockInfo,
    getCells: getCells,
    batchCalculateDaoMaximumWithdraw: batchCalculateDaoMaximumWithdraw,
    batchGetTransation: batchGetTransation,
  };
}

export function mapOutputs(outputs: Output[], outputsData: HexString[]): ResolvedOutput[] {
  return outputs.map((output, i) => {
    if (outputsData[i] == null) {
      throw new Error('Cannot find corresponding outputsData');
    }
    return { cellOutput: output, data: outputsData[i] };
  });
}

export function resolveInput(
  input: Input,
  transactionDict: Record<Hash, Transaction>,
): { data: HexString; cellOutput: Output } {
  const transaction = transactionDict[input.previousOutput.txHash];
  const outputIndex = Number(input.previousOutput.index);

  if (!transaction?.outputsData[outputIndex] || !transaction?.outputs[outputIndex]) {
    throw new Error('Cannot find corresponding transaction from the dictionary');
  }

  return {
    data: transaction.outputsData[outputIndex],
    cellOutput: transaction.outputs[outputIndex],
  };
}
