import { bytes } from '@ckb-lumos/lumos/codec';
import * as R from 'remeda';

import { type MarketService } from '~/aggregator/services/types';
import { NATIVE_ASSETS } from '~/constants';
import { isValidBTCAddress } from '~/utils/bitcoin';

import { type ResolvedVout } from '../../api';
import { type ResolvedBlock } from '../../types';
import { type ActionGroup } from './types';

export async function prepareBtcActivities({
  resolvedBlock,
  marketService,
  skipHandleAddress,
}: {
  resolvedBlock: ResolvedBlock;
  marketService: MarketService;
  skipHandleAddress?: boolean;
}) {
  const [coinbaseTx, ...txs] = resolvedBlock.transactions;
  if (!coinbaseTx) return [];
  const value = R.sumBy(coinbaseTx?.vouts ?? [], (output: ResolvedVout) => BigInt(output.value));
  const groupByAddress = createGroupByAddress(skipHandleAddress);

  const calculator = await marketService.createCalculator([
    { assetId: NATIVE_ASSETS.BTC, timestamp: Number(resolvedBlock.time) },
  ]);

  const getBtcVolume = (value: number | bigint | string) =>
    calculator.getVolume({ value, assetId: NATIVE_ASSETS.BTC, timestamp: Number(resolvedBlock.time) });

  const cellbaseActivity: ActionGroup = {
    action: {
      txHash: coinbaseTx?.hash,
      txIndex: 0,
      value: BigInt(value),
      volume: getBtcVolume(value),
      action: 'Mint',
      assetId: NATIVE_ASSETS.BTC,
      from: undefined,
      to: R.pipe(coinbaseTx.vouts, groupByAddress, getMaxCapacityAddress),
      inputCount: 0,
      outputCount: coinbaseTx.vouts.length,
      timestamp: new Date(Number(resolvedBlock.time)),
      blockNumber: Number(resolvedBlock.height),
    },
    actionAddresses: Object.entries(groupByAddress(coinbaseTx.vouts)).map(([address, capacity]) => ({
      address,
      fromOrTo: 'to',
      value: capacity,
      txHash: coinbaseTx.hash,
      volume: getBtcVolume(capacity),
      blockNumber: Number(resolvedBlock.height),
      assetId: NATIVE_ASSETS.BTC,
      txIndex: 0,
    })),
  };

  const activities = txs.flatMap<ActionGroup>(({ vins, vouts, hash }, index) => {
    const groupedInputs = groupByAddress(vins);
    const groupedOutputs = groupByAddress(vouts);

    const maxInputAddress = getMaxCapacityAddress(groupedInputs);
    const maxOutputAddress = getMaxCapacityAddress(groupedOutputs);

    const inputCapacity = BigInt(R.sumBy(R.entries(groupedInputs), ([, capacity]) => capacity));
    const outputCapacity = BigInt(R.sumBy(R.entries(groupedOutputs), ([, capacity]) => capacity));
    const txIndex = index + 1;
    return [
      {
        action: {
          txHash: hash,
          txIndex,
          value: inputCapacity >= outputCapacity ? inputCapacity : outputCapacity,
          volume: getBtcVolume(inputCapacity >= outputCapacity ? inputCapacity : outputCapacity),
          action: !vins.length ? 'Mint' : 'Transfer',
          assetId: NATIVE_ASSETS.BTC,
          from: maxInputAddress,
          to: maxOutputAddress,
          inputCount: vins.length,
          outputCount: vouts.length,
          timestamp: new Date(Number(resolvedBlock.time)),
          blockNumber: Number(resolvedBlock.height),
        },
        actionAddresses: [
          ...Object.entries(groupedInputs).map<ActionGroup['actionAddresses'][number]>(([address, capacity]) => ({
            address: address,
            fromOrTo: 'from',
            txHash: hash,
            value: capacity,
            volume: getBtcVolume(capacity),
            assetId: NATIVE_ASSETS.BTC,
            blockNumber: Number(resolvedBlock.height),
            txIndex,
          })),

          ...Object.entries(groupedOutputs).map<ActionGroup['actionAddresses'][number]>(([address, capacity]) => ({
            address: address,
            fromOrTo: 'to',
            txHash: hash,
            value: capacity,
            volume: getBtcVolume(capacity),
            assetId: NATIVE_ASSETS.BTC,
            blockNumber: Number(resolvedBlock.height),
            txIndex,
          })),
        ],
      },
    ];
  });

  return [cellbaseActivity].concat(activities);
}

/**
 * create a group for address: capacity
 * @function
 */
const createGroupByAddress = (skipHandleAddress = false) =>
  R.piped(
    (cells: ResolvedVout[]) => cells,
    skipHandleAddress ? R.identity() : R.filter((o) => isValidBTCAddress(o.address)),
    R.groupBy((o) => (skipHandleAddress ? o.address : bytes.hexify(Buffer.from(o.address)).slice(2))),
    R.mapValues(
      R.piped(
        R.sumBy((o) => BigInt(o.value)),
        BigInt,
      ),
    ),
  );

const getMaxCapacityAddress = R.piped(
  (group: ReturnType<ReturnType<typeof createGroupByAddress>>) => group,
  R.entries(),
  R.firstBy(([, capacity]) => capacity),
  (entry) => entry?.[0],
);
