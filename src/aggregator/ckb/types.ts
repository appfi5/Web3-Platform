import {
  type Block,
  type HexNumber,
  type HexString,
  type OutPoint,
  type Output,
  type Transaction,
} from '@ckb-lumos/lumos';
import { type CKBComponents } from '@ckb-lumos/lumos/rpc';

import { type db } from '~/server/db';

import {
  type DbTransaction,
  type DeprecatedBlockJobHandler,
  type Hash,
  type Logger,
  type SourceService,
} from '../types';

export type CellbaseOutPoint = {
  txHash: '0x0000000000000000000000000000000000000000000000000000000000000000';
  index: '0xffffffff';
};

export type ResolvedOutput = { data: HexString; cellOutput: Output };
export type CellbaseInput = { previousOutput: CellbaseOutPoint; since: HexNumber };
export type ResolvedInput = { previousOutput: OutPoint; since: HexNumber } & ResolvedOutput;

export type CellbaseTransaction = Omit<Transaction, 'inputs' | 'outputs'> & {
  inputs: [CellbaseInput];
  outputs: ResolvedOutput[];
};
export type ResolvedTransaction = Omit<Transaction, 'inputs' | 'outputs'> & {
  inputs: ResolvedInput[];
  outputs: ResolvedOutput[];
  hash: Hash;
};
export type ResolvedBlock = Omit<Block, 'transactions'> & {
  transactions: [CellbaseTransaction, ...ResolvedTransaction[]];
};

export type CkbSourceService = SourceService<ResolvedBlock> & {
  getCells<D extends boolean>(
    searchKey: CKBComponents.GetCellsSearchKey<D>,
    order: 'asc' | 'desc',
    limit: string,
    cursor?: string,
  ): Promise<CKBComponents.GetCellsResult<D>>;
  batchGetTransation(txHashes: string[]): Promise<Record<string, CKBComponents.Transaction>>;
  batchCalculateDaoMaximumWithdraw(
    inputs: {
      outPoint: CKBComponents.OutPoint;
      kind: string | CKBComponents.OutPoint;
    }[],
  ): Promise<Record<string, string>>;
};

export type CkbBlockHandlerServices = { hash: Hash; sourceService: CkbSourceService; db: typeof db; logger: Logger };
export type CkbBlockExecCtx = { tx: DbTransaction };
export type CkbBlockHandler = DeprecatedBlockJobHandler<CkbBlockHandlerServices, CkbBlockExecCtx>;
export type CkbWriteWriteExecution = Awaited<ReturnType<CkbBlockHandler>>;

export type AssetId = string;
export type Timestamp = number | Date;
/**
 * Asset amount without precision
 */
export type AssetValue = number | bigint | string;

type PriceCalculator = {
  getVolume(options: { assetId: AssetId; timestamp: Timestamp; value: AssetValue }): string;
  getAmountWithDecimals(options: { assetId: AssetId; value: AssetValue }): string;
};
/**
 * @deprecated please migrate to the {@link MarketService}
 */
export interface PriceService {
  createCalculator(options: Array<{ assetId: AssetId; timestamp: Timestamp }>): Promise<PriceCalculator>;
}
