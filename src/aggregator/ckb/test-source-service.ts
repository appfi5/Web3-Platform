import { mapValues } from 'es-toolkit';

import { type CkbSourceService } from '~/aggregator/ckb/types';
import { snapshotify } from '~/aggregator/test-utils';

import { createSourceService } from './source-service';

export function createTestSourceService(): CkbSourceService {
  const mainnetService = createSourceService({ rpcUrl: 'https://mainnet.ckb.dev' });
  const testnetService = createSourceService({ rpcUrl: 'https://testnet.ckb.dev' });

  const service = { ...mainnetService };
  service.getResolvedBlock = async (blockHash) => {
    const block = await mainnetService.getResolvedBlock(blockHash);
    if (block) {
      return block;
    }

    return testnetService.getResolvedBlock(blockHash);
  };

  return mapValues(service, (fn, key) =>
    snapshotify(fn, { namespace: 'ckb/source-service/' + key }),
  ) as CkbSourceService;
}
