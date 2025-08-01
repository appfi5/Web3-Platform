import { NATIVE_ASSETS } from '~/constants';

import { initHistoryFromBinance } from './binance';
import { syncFromUTXOSwap } from './utxoswap';

void (async function main() {
  await Promise.all([
    initHistoryFromBinance(NATIVE_ASSETS.BTC),
    initHistoryFromBinance(NATIVE_ASSETS.CKB),
    syncFromUTXOSwap(),
  ]);
  process.exit(0);
})();
