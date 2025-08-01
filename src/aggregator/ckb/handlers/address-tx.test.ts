import * as R from 'remeda';

import { createTestSourceService } from '~/aggregator/ckb/test-source-service';
import { asserts } from '~/utils/asserts';
import { unimplemented } from '~/utils/unimplemented';
import { hexifyScript } from '~/utils/utility';

import { exchangePrepareDataToInsert, prepareAddressTx } from './address-tx';

test('prepare address tx', async () => {
  const sourceService = createTestSourceService();
  const block = await sourceService.getResolvedBlock(
    '0xc8684b0f2764c8a25d374fa86c201a0fafd7f26a02c47b62f1cc0487e687c183',
  );
  asserts(block);

  const getVolume = jest.fn(() => '0');
  const priceService = {
    createCalculator: async () => ({ getVolume, getAmountWithDecimals: unimplemented }),
  };

  const prepareData = await prepareAddressTx(block, priceService);
  const [cellbase, ...transactions] = block.transactions;

  const txMap = R.pipe(
    prepareData,
    exchangePrepareDataToInsert,
    R.filter((data) => typeof data.txHash === 'string'),
    R.groupBy((data) => data.txHash),
  );

  // cellBase
  const minter = cellbase.outputs[0]?.cellOutput.lock;

  expect(minter).toBeDefined();
  const minterHash = hexifyScript(minter!);

  expect(txMap[cellbase.hash!]).toBeDefined();
  expect(txMap[cellbase.hash!]?.length).toBe(1);

  expect(txMap[cellbase.hash!]?.[0].address).toBe(minterHash);
  expect(txMap[cellbase.hash!]?.[0].io).toBe(1);

  // txs
  for (const tx of transactions) {
    expect(txMap[tx.hash]).toBeDefined();
    const inputAddresses = R.unique(tx.inputs.map((cell) => hexifyScript(cell.cellOutput.lock)));
    const outputAddresses = R.unique(tx.outputs.map((cell) => hexifyScript(cell.cellOutput.lock)));

    const intersectAddresses = R.intersection(inputAddresses, outputAddresses);
    const onlyInputAddress = R.difference(inputAddresses, intersectAddresses);
    const onlyOutputAddress = R.difference(outputAddresses, intersectAddresses);

    expect(txMap[tx.hash]?.length).toBe(intersectAddresses.length + onlyInputAddress.length + onlyOutputAddress.length);

    expect(txMap[tx.hash]?.filter((tx) => tx.io === 0).length).toBe(onlyInputAddress.length);
    expect(txMap[tx.hash]?.filter((tx) => tx.io === 1).length).toBe(onlyOutputAddress.length);
    expect(txMap[tx.hash]?.filter((tx) => tx.io === 2).length).toBe(intersectAddresses.length);
  }
});
