import { blockchain, bytes } from '@ckb-lumos/lumos/codec';
import * as R from 'remeda';

import { type ResolvedBlock, type ResolvedOutput } from '~/aggregator/ckb/types';
import { getSporeVolume } from '~/aggregator/ckb/utils';
import { type MarketService } from '~/aggregator/services/types';
import { NATIVE_ASSETS } from '~/constants';
import { type txAction } from '~/server/db/schema';
import { isSpore } from '~/utils/ckb';
import { groupWith } from '~/utils/groupWith';

import { type ActionGroup } from './types';

export default async function prepareSporeActivities({
  resolvedBlock,
  marketService,
}: {
  resolvedBlock: ResolvedBlock;
  marketService: MarketService;
}): Promise<ActionGroup[]> {
  const [_, ...txs] = resolvedBlock.transactions;
  const currentBlockCKBPirce = await marketService.createCalculator([
    { assetId: NATIVE_ASSETS.CKB, timestamp: +resolvedBlock.header.timestamp },
  ]);

  const actionGroups = txs.flatMap<ActionGroup>(({ inputs, outputs, hash }, index) => {
    const inputSporeGroup = createSporeGroup(inputs);
    const outputSporeGroup = createSporeGroup(outputs);

    const involvedSporeIds = R.pipe(R.keys(inputSporeGroup).concat(R.keys(outputSporeGroup)), R.unique());

    const actions: ActionGroup[] = [];
    involvedSporeIds.forEach((assetId) => {
      const i = inputSporeGroup[assetId];
      const o = outputSporeGroup[assetId];
      const action: (typeof txAction.$inferInsert)['action'] = (() => {
        if (i && !o) return 'Burn';
        if (!i && o) return 'Mint';
        return 'Transfer';
      })();
      const ckbVolume = i && o ? getSporeVolume(i, o) : undefined;
      const usdVolume = ckbVolume
        ? currentBlockCKBPirce.getVolume({
            assetId: NATIVE_ASSETS.CKB,
            timestamp: +resolvedBlock.header.timestamp,
            value: ckbVolume.toBigInt(),
          })
        : undefined;
      const actionAddresses = [
        i
          ? {
              txHash: hash,
              fromOrTo: 'from' as const,
              address: bytes.hexify(blockchain.Script.pack(i.cellOutput.lock)),
              volume: usdVolume,
              value: BigInt(1),
              assetId: assetId,
              blockNumber: Number(resolvedBlock.header.number),
              txIndex: index + 1,
            }
          : undefined,
        o
          ? {
              txHash: hash,
              fromOrTo: 'to' as const,
              address: bytes.hexify(blockchain.Script.pack(o.cellOutput.lock)),
              volume: usdVolume,
              value: BigInt(1),
              assetId: assetId,
              blockNumber: Number(resolvedBlock.header.number),
              txIndex: index + 1,
            }
          : undefined,
      ];
      actions.push({
        action: {
          action: action,
          from: i?.cellOutput.lock,
          to: o?.cellOutput.lock,
          txIndex: index + 1,
          txHash: hash,
          outputCount: o ? 1 : 0,
          inputCount: i ? 1 : 0,
          value: BigInt(1),
          volume: usdVolume,
          assetId,
          timestamp: new Date(Number(resolvedBlock.header.timestamp)),
          blockNumber: Number(resolvedBlock.header.number),
        },
        actionAddresses: actionAddresses.filter((v) => !!v),
      });
    });

    return actions;
  });

  return actionGroups;
}

type SporeAssetId = string;
type SerializedAddress = string;

export function createSporeGroup(cells: ResolvedOutput[]): Record<SporeAssetId, ResolvedOutput> {
  const sporeGroup: Record<SporeAssetId, ResolvedOutput[]> = R.pipe(
    cells,
    R.filter((cell) => !!cell.cellOutput.type && isSpore(cell.cellOutput.type)),
    R.groupBy((cell) => cell.cellOutput.type!.args),
  );

  return R.mapValues(sporeGroup, (v) => v[0]!);
}

export function createSporeGroupByAddress(cells: ResolvedOutput[]): {
  /**
   * the map of spore type hash and corresponding total amount
   */
  bySpore: Record<SporeAssetId, bigint>;
  /**
   * the nested map of spore
   */
  bySporeAndAddress: Record<SporeAssetId, Record<SerializedAddress, bigint>>;
} {
  const sporeGroup: Record<SporeAssetId, ResolvedOutput[]> = R.pipe(
    cells,
    R.filter((cell) => !!cell.cellOutput.type && isSpore(cell.cellOutput.type)),
    R.groupBy((cell) => cell.cellOutput.type!.args),
  );

  const bySpore = R.mapValues(
    sporeGroup,
    R.reduce((sum) => sum + 1n, 0n),
  );

  const bySporeAndAddress = R.mapValues(sporeGroup, (cells) =>
    groupWith(
      cells,
      (cell) => bytes.hexify(blockchain.Script.pack(cell.cellOutput.lock)),
      (sum) => sum + 1n,
      0n,
    ),
  );

  return { bySpore, bySporeAndAddress };
}
