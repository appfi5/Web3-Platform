import { type db } from '~/server/db';

import { type DbTransaction, type Hash, type Logger, type SourceService } from '../types';
import { type Block, type ResolvedTransaction } from './api';

export type ResolvedBlock = Block & {
  transactions: ResolvedTransaction[];
};

export type BTCSourceService = SourceService<ResolvedBlock>;

export type BTcBlockHandlerServices = { hash: Hash; sourceService: BTCSourceService; db: typeof db; logger: Logger };
export type BTCBlockExecCtx = { tx: DbTransaction };
