import * as R from 'remeda';

import { mapOutputs, resolveInput } from '../ckb/source-service';
import type { CkbSourceService, ResolvedInput, ResolvedTransaction } from '../ckb/types';

const CELL_BASE_TX_HASH = '0x0000000000000000000000000000000000000000000000000000000000000000';

export const resloveTransactions = async (
  dataSource: CkbSourceService,
  txHashes: string[],
): Promise<ResolvedTransaction[]> => {
  const txMaps = await dataSource.batchGetTransation(txHashes);

  const inputTxHashes = R.pipe(
    R.values(txMaps),
    R.flatMap((tx) => tx.inputs),
    R.map((i) => i.previousOutput.txHash),
    R.filter((hash) => hash !== CELL_BASE_TX_HASH),
    R.unique(),
  );

  const inputTxMaps = await dataSource.batchGetTransation(inputTxHashes);

  const resolvedTransactions: ResolvedTransaction[] = R.pipe(
    R.values(txMaps),
    R.map((tx) => ({
      ...tx,
      inputs: tx.inputs
        .filter((i) => i.previousOutput.txHash !== CELL_BASE_TX_HASH)
        .map<ResolvedInput>((i) => ({
          ...i,
          ...resolveInput(i, inputTxMaps),
        })),
      outputs: mapOutputs(tx.outputs, tx.outputsData),
    })),
  );

  return resolvedTransactions;
};
