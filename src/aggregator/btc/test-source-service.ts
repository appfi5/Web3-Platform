import { mapValues } from 'es-toolkit';

import { type BTCSourceService } from '~/aggregator/btc/types';
import { snapshotify } from '~/aggregator/test-utils';

import { createSourceService } from './source-service';

export function createTestSourceService(): BTCSourceService {
  const service = createSourceService();

  return mapValues(service, (fn, key) =>
    snapshotify(fn, { namespace: 'btc/source-service/' + key }),
  ) as BTCSourceService;
}
