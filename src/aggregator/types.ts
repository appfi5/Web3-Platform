import { type ObservableInput } from 'rxjs';

import { type db } from '~/server/db';

export type Hash = string;

export type BasicBlockInfo = { blockNumber: number; blockHash: Hash };
type BasicBlockInfoResponse = BasicBlockInfo | null;

export interface BasicBlockInfoService {
  /**
   * Get the last block info
   */
  getLastBlockInfo(): Promise<BasicBlockInfoResponse>;

  /**
   * get last N block info
   */
  getLastNBlockInfos(n: number): Promise<BasicBlockInfoResponse[]>;

  /**
   * get multiple BasicBLockInfo by one request
   * @param blockNumbers
   */
  getBlockInfosByHeights(blockNumbers: number[]): Promise<BasicBlockInfoResponse[]>;
}

export interface SourceService<BlockData> extends BasicBlockInfoService {
  getResolvedBlock(blockHash: Hash): Promise<BlockData | null>;
  getResolvedBlockByNumber(blockNumber: number): Promise<BlockData | null>;
}

export interface LocalBlockService extends BasicBlockInfoService {
  save(block: BasicBlockInfo): Promise<void>;
  rollback(block: BasicBlockInfo): Promise<void>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on(eventName: string, listener: (...args: any[]) => void): void;
}

export interface Logger {
  debug(...data: unknown[]): void;
  info(...data: unknown[]): void;
  warn(...data: unknown[]): void;
  error(format: { err: unknown; msg: string }): void;
  error(...data: unknown[]): void;
}

export type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
export type WriteExecution<ExecCtx> = (execCtx: ExecCtx) => Promise<void>;

/**
 * @deprecated please migrate to the new one
 */
export type DeprecatedBlockJobHandler<Services, ExecCtx> = (services: Services) => Promise<WriteExecution<ExecCtx>>;

/**
 * Preparing blocks in parallel and save them in sequence
 */
export type SequenceBlockHandler<Prepared = unknown> = {
  prepare(blockInfo: BasicBlockInfo): ObservableInput<Prepared>;
  save(blockInfo: BasicBlockInfo, prepared: Prepared): ObservableInput<unknown>;
  rollback(blockInfo: BasicBlockInfo, prepared: Prepared): ObservableInput<unknown>;
};
