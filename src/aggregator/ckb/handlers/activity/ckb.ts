import { blockchain, bytes } from '@ckb-lumos/lumos/codec';
import * as R from 'remeda';

import { type MarketService } from '~/aggregator/services/types';
import { NATIVE_ASSETS } from '~/constants';

import { type ResolvedBlock, type ResolvedOutput } from '../../types';
import { type ActionGroup } from './types';

export async function prepareCkbActivities({
  resolvedBlock,
  marketService,
}: {
  resolvedBlock: ResolvedBlock;
  marketService: MarketService;
}) {
  const [cellbaseTx, ...txs] = resolvedBlock.transactions;
  const value = R.sumBy(cellbaseTx.outputs, (output) => BigInt(output.cellOutput.capacity));

  const calculator = await marketService.createCalculator([
    { assetId: NATIVE_ASSETS.CKB, timestamp: Number(resolvedBlock.header.timestamp) },
  ]);

  // get CKB volume of the current block
  const getCkbVolume = (value: number | bigint | string) =>
    calculator.getVolume({ value, assetId: NATIVE_ASSETS.CKB, timestamp: Number(resolvedBlock.header.timestamp) });

  const cellbaseActivity: ActionGroup = {
    action: {
      txHash: cellbaseTx.hash!,
      txIndex: 0,
      value: BigInt(value),
      volume: getCkbVolume(value),
      // there may no burn action on CKB
      // because all burned CKB will be treated as transaction fee
      action: 'Mint',
      assetId: NATIVE_ASSETS.CKB,
      from: undefined,
      to: R.pipe(cellbaseTx.outputs, groupByAddress, getMaxCapacityAddress),
      inputCount: 0,
      outputCount: cellbaseTx.outputs.length,
      timestamp: new Date(Number(resolvedBlock.header.timestamp)),
      blockNumber: Number(resolvedBlock.header.number),
    },
    actionAddresses: Object.entries(groupByAddress(cellbaseTx.outputs)).map(([address, capacity]) => ({
      address,
      fromOrTo: 'to',
      value: capacity,
      txHash: cellbaseTx.hash!,
      volume: getCkbVolume(capacity),
      blockNumber: Number(resolvedBlock.header.number),
      assetId: NATIVE_ASSETS.CKB,
      txIndex: 0,
    })),
  };

  const activities = txs.flatMap<ActionGroup>(({ inputs, outputs, hash }, index) => {
    const groupedInputs = groupByAddress(inputs);
    const groupedOutputs = groupByAddress(outputs);

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
          volume: getCkbVolume(inputCapacity >= outputCapacity ? inputCapacity : outputCapacity),
          // there may no burn action on CKB
          // because all burned CKB will be treated as transaction fee
          action: inputCapacity == 0n ? 'Mint' : 'Transfer',
          assetId: NATIVE_ASSETS.CKB,
          from: maxInputAddress,
          to: maxOutputAddress,
          inputCount: inputs.length,
          outputCount: outputs.length,
          timestamp: new Date(Number(resolvedBlock.header.timestamp)),
          blockNumber: Number(resolvedBlock.header.number),
        },
        actionAddresses: [
          ...Object.entries(groupedInputs).map<ActionGroup['actionAddresses'][number]>(([address, capacity]) => ({
            address: address,
            fromOrTo: 'from',
            txHash: hash,
            value: capacity,
            volume: getCkbVolume(capacity),
            assetId: NATIVE_ASSETS.CKB,
            blockNumber: Number(resolvedBlock.header.number),
            txIndex,
          })),

          ...Object.entries(groupedOutputs).map<ActionGroup['actionAddresses'][number]>(([address, capacity]) => ({
            address: address,
            fromOrTo: 'to',
            txHash: hash,
            value: capacity,
            volume: getCkbVolume(capacity),
            assetId: NATIVE_ASSETS.CKB,
            blockNumber: Number(resolvedBlock.header.number),
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
const groupByAddress = R.piped(
  (cells: ResolvedOutput[]) => cells,
  R.groupBy((cell) => bytes.hexify(blockchain.Script.pack(cell.cellOutput.lock))),
  R.mapValues(
    R.piped(
      R.sumBy((cell) => BigInt(cell.cellOutput.capacity)),
      BigInt,
    ),
  ),
);

const getMaxCapacityAddress = R.piped(
  (group: ReturnType<typeof groupByAddress>) => group,
  R.entries(),
  R.firstBy(([, capacity]) => capacity),
  (entry) => entry?.[0],
);
