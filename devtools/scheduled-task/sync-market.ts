import { syncDobFromOmiga, syncFromCoinmarket, syncFromUTXOSwap, syncXudtFromOmiga } from '~/server/api/routers/market';
import { db } from '~/server/db';

const args = process.argv.slice(2);
let funcName = '';
const parameterName = '--sync=';
args.forEach((v) => {
  if (v.startsWith(parameterName)) {
    funcName = v.slice(parameterName.length);
  }
});

void (async function main() {
  switch (funcName) {
    case 'syncFromCoinmarket':
      await syncFromCoinmarket(['CKB', 'BTC'], db);
      break;
    case 'syncFromUTXOSwap':
      await syncFromUTXOSwap(
        { pageNo: 0, pageSize: 200, searchKey: '0x0000000000000000000000000000000000000000000000000000000000000000' },
        db,
      );
      break;
    case 'syncFromOmiga':
      await syncXudtFromOmiga({ pageNo: 0, pageSize: 200, sort: 'volume_24h' }, db);
      await syncDobFromOmiga(db);
      break;
    default:
      console.info(`The sync function ${funcName} doesn't found`);
      process.exit(0);
  }
  console.info(`The sync function ${funcName} excute success`);
  process.exit(0);
})();
