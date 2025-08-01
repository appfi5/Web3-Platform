import BigNumber from 'bignumber.js';
import * as R from 'remeda';

import { createSporeGroupByAddress } from '~/aggregator/ckb/handlers/activity/spore';
import { createXudtGroup } from '~/aggregator/ckb/handlers/activity/xudt';
import { type ResolvedInput, type ResolvedOutput } from '~/aggregator/ckb/types';
import { hexifyScript } from '~/aggregator/ckb/utils';
import { type PriceCalculator, type Timestamp } from '~/aggregator/services/types';
import { NATIVE_ASSETS } from '~/constants';

type TypeHash = string;
type Address = string;
type Amount = bigint;

export const calculateCKBChanges = ({ inputs, outputs }: { inputs: ResolvedInput[]; outputs: ResolvedOutput[] }) => {
  const CKBChangeMaps: Record<Address, Amount> = {};

  inputs.forEach((cell) => {
    CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] =
      (CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] ?? 0n) - BigInt(cell.cellOutput.capacity);
  });

  outputs.forEach((cell) => {
    CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] =
      (CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] ?? 0n) + BigInt(cell.cellOutput.capacity);
  });

  return {
    [NATIVE_ASSETS.CKB]: CKBChangeMaps,
  };
};

export const calculateAssetChanges = ({ inputs, outputs }: { inputs: ResolvedInput[]; outputs: ResolvedOutput[] }) => {
  const changeMaps: Record<TypeHash, Record<Address, Amount>> = {};

  const inputXudtGroup = createXudtGroup(inputs);
  const outputXudtGroup = createXudtGroup(outputs);

  const involvedXudts = R.pipe(R.keys(inputXudtGroup.byXudt).concat(R.keys(outputXudtGroup.byXudt)), R.unique());

  involvedXudts.forEach((typeHash) => {
    const inputAddressAmountMap = inputXudtGroup.byXudtAndAddress[typeHash];
    const outputAddressAmountMap = outputXudtGroup.byXudtAndAddress[typeHash];

    const addressMap: Record<Address, Amount> = changeMaps[typeHash] ?? {};

    Object.entries(inputAddressAmountMap ?? {}).forEach(([address, amount]) => {
      addressMap[address] = (addressMap[address] ?? 0n) - amount;
    });

    Object.entries(outputAddressAmountMap ?? {}).forEach(([address, amount]) => {
      addressMap[address] = (addressMap[address] ?? 0n) + amount;
    });

    changeMaps[typeHash] = addressMap;
  });

  return changeMaps;
};

export const calculateSporeChanges = ({ inputs, outputs }: { inputs: ResolvedInput[]; outputs: ResolvedOutput[] }) => {
  const changeMaps: Record<TypeHash, Record<Address, Amount>> = {};

  const inputSporeGroup = createSporeGroupByAddress(inputs);
  const outputSporeGroup = createSporeGroupByAddress(outputs);

  const involvedSporeIds = R.pipe(R.keys(inputSporeGroup.bySpore).concat(R.keys(outputSporeGroup.bySpore)), R.unique());

  involvedSporeIds.forEach((assetId) => {
    const i = inputSporeGroup.bySporeAndAddress[assetId];
    const o = outputSporeGroup.bySporeAndAddress[assetId];

    const addressMap: Record<Address, Amount> = changeMaps[assetId] ?? {};

    Object.entries(i ?? {}).forEach(([address, amount]) => {
      addressMap[address] = (addressMap[address] ?? 0n) - amount;
    });

    Object.entries(o ?? {}).forEach(([address, amount]) => {
      addressMap[address] = (addressMap[address] ?? 0n) + amount;
    });

    changeMaps[assetId] = addressMap;
  });

  return changeMaps;
};

export const calculateChanges = ({
  tx,
  timestamp,
  getVolume,
  getAmountWithDecimals,
}: {
  tx: { inputs: ResolvedInput[]; outputs: ResolvedOutput[] };
  timestamp: Timestamp;
  getVolume: PriceCalculator['getVolume'];
  getAmountWithDecimals?: PriceCalculator['getAmountWithDecimals'];
}) => {
  return R.pipe(
    R.entries(R.mergeAll([calculateAssetChanges(tx), calculateCKBChanges(tx), calculateSporeChanges(tx)])),
    R.flatMap(([assetId, changes]) =>
      Object.entries(changes).map(([address, value]) => ({
        address,
        assetId,
        value,
        volume: BigNumber(getVolume({ assetId, value, timestamp })).toFixed(2),
      })),
    ),
    R.filter((i) => i.value !== 0n),
    R.groupBy((i) => i.address),
    R.entries(),
    R.mapToObj(([address, changes]) => [
      address,
      changes.map(({ assetId, value, volume }) => ({
        assetId,
        value: (getAmountWithDecimals ? getAmountWithDecimals({ assetId, value }) : value).toString(),
        volume,
      })),
    ]),
  );
};
