import { blockchain, bytes } from '@ckb-lumos/lumos/codec';
import { computeScriptHash } from '@ckb-lumos/lumos/utils';
import * as R from 'remeda';

import { type ResolvedBlock, type ResolvedOutput } from '~/aggregator/ckb/types';
import { type MarketService } from '~/aggregator/services/types';
import { type txAction } from '~/server/db/schema';
import { isUdt } from '~/utils/ckb';
import { groupWith } from '~/utils/groupWith';
import { decodeUdtData } from '~/utils/xudt';

import { type ActionGroup } from './types';

export default async function prepareXudtActivities({
  resolvedBlock,
  marketService,
}: {
  resolvedBlock: ResolvedBlock;
  marketService: MarketService;
}): Promise<ActionGroup[]> {
  const [_, ...txs] = resolvedBlock.transactions;

  const assetIds = txs
    .flatMap((tx) => tx.outputs.concat(tx.inputs))
    .filter(({ cellOutput }) => !!cellOutput.type && isUdt(cellOutput.type))
    .map(({ cellOutput }) => computeScriptHash(cellOutput.type!));

  const calculator = await marketService.createCalculator(
    assetIds.map((assetId) => ({ assetId, timestamp: Number(resolvedBlock.header.timestamp) })),
  );

  const getVolume = ({ assetId, value }: { assetId: string; value: bigint | string | number }) =>
    calculator.getVolume({
      assetId,
      value,
      timestamp: Number(resolvedBlock.header.timestamp),
    });

  const actionGroups = txs.flatMap<ActionGroup>(({ inputs, outputs, hash }, index) => {
    const inputXudtGroup = createXudtGroup(inputs);
    const outputXudtGroup = createXudtGroup(outputs);

    const involvedXudts = R.pipe(R.keys(inputXudtGroup.byXudt).concat(R.keys(outputXudtGroup.byXudt)), R.unique());

    const actions: ActionGroup[] = [];
    involvedXudts.forEach((typeHash) => {
      const totalInputAmount = inputXudtGroup.byXudt[typeHash] ?? 0n;
      const totalOutputAmount = outputXudtGroup.byXudt[typeHash] ?? 0n;

      const inputAddressAmountMap = inputXudtGroup.byXudtAndAddress[typeHash];
      const outputAddressAmountMap = outputXudtGroup.byXudtAndAddress[typeHash];

      const actionAddresses: ActionGroup['actionAddresses'] = [
        ...Object.entries(inputAddressAmountMap ?? {}).map(([address, amount]) => ({
          txHash: hash,
          fromOrTo: 'from' as const,
          address: address,
          volume: getVolume({ assetId: typeHash, value: amount }),
          value: amount,
          assetId: typeHash,
          blockNumber: Number(resolvedBlock.header.number),
          txIndex: index + 1,
        })),
        ...Object.entries(outputAddressAmountMap ?? {}).map(([address, amount]) => ({
          txHash: hash,
          fromOrTo: 'to' as const,
          address: address,
          volume: getVolume({ assetId: typeHash, value: amount }),
          value: amount,
          assetId: typeHash,
          blockNumber: Number(resolvedBlock.header.number),
          txIndex: index + 1,
        })),
      ];

      const maxInputAddress = R.pipe(
        inputAddressAmountMap ?? {},
        R.entries(),
        R.firstBy([R.prop(1), 'desc']),
        (value) => value?.[0],
      );

      const maxOutputAddress = R.pipe(
        outputAddressAmountMap ?? {},
        R.entries(),
        R.firstBy([R.prop(1), 'desc']),
        (value) => value?.[0],
      );

      const action: (typeof txAction.$inferInsert)['action'] = (() => {
        if (totalInputAmount > totalOutputAmount) return 'Burn';
        if (totalInputAmount === totalOutputAmount) return 'Transfer';
        return 'Mint';
      })();

      actions.push({
        action: {
          action: action,
          from: maxInputAddress,
          to: maxOutputAddress,
          txIndex: index + 1,
          txHash: hash,
          outputCount: Object.keys(outputAddressAmountMap ?? {}).length,
          inputCount: Object.keys(inputAddressAmountMap ?? {}).length,
          value: totalInputAmount || totalOutputAmount,
          volume: getVolume({ assetId: typeHash, value: totalInputAmount || totalOutputAmount }),
          assetId: typeHash,
          timestamp: new Date(Number(resolvedBlock.header.timestamp)),
          blockNumber: Number(resolvedBlock.header.number),
        },
        actionAddresses,
      });
    });

    return actions;
  });

  return actionGroups;
}

type XudtTypeHash = string;
type SerializedAddress = string;

export function createXudtGroup(cells: ResolvedOutput[]): {
  /**
   * the map of xudt type hash and corresponding total amount
   */
  byXudt: Record<XudtTypeHash, bigint>;
  /**
   * the nested map of xudt
   */
  byXudtAndAddress: Record<XudtTypeHash, Record<SerializedAddress, bigint>>;
} {
  const xudtGroup: Record<XudtTypeHash, ResolvedOutput[]> = R.pipe(
    cells,
    R.filter((cell) => !!cell.cellOutput.type && isUdt(cell.cellOutput.type)),
    R.groupBy((cell) => computeScriptHash(cell.cellOutput.type!)),
  );

  const byXudt = R.mapValues(
    xudtGroup,
    R.reduce((sum, cell) => sum + decodeUdtData(cell.data), 0n),
  );

  const byXudtAndAddress = R.mapValues(xudtGroup, (cells) =>
    groupWith(
      cells,
      (cell) => bytes.hexify(blockchain.Script.pack(cell.cellOutput.lock)),
      (sum, cell) => sum + decodeUdtData(cell.data),
      0n,
    ),
  );

  return { byXudt, byXudtAndAddress };
}
