import { and, type AnyColumn, eq, sql } from 'drizzle-orm';
import * as R from 'remeda';

import { createCkbSubHandler } from '~/aggregator/ckb/handlers/index';
import { type ResolvedBlock } from '~/aggregator/ckb/types';
import { NATIVE_ASSETS } from '~/constants';
import { addressAsset } from '~/server/db/schema';

import { getSporeVolume, hexifyScript } from '../utils';
import { createSporeGroup } from './activity/spore';
import { createXudtGroup } from './activity/xudt';

type ChangeAsset = {
  address: string;
  assetId: string;
  amount: bigint;
  deleted?: boolean;
};

const bigMath = {
  abs(x: bigint) {
    return x < 0n ? -x : x;
  },
};

const increment = (column: AnyColumn, value: number | string = 1) => {
  return sql`${column} + ${value}`;
};

const decrement = (column: AnyColumn, value: number | string = 1) => {
  return sql`${column} - ${value}`;
};

export const addressAssetHandler = createCkbSubHandler({
  name: 'addressAsset',
  prepare: async (ctx): Promise<ChangeAsset[]> => {
    return [
      ...prepareXudtChanges(ctx.resolvedBlock),
      ...prepareCKBChanges(ctx.resolvedBlock),
      ...prepareSporeChanges(ctx.resolvedBlock),
    ];
  },
  save: async ({ tx, preparedData }) => {
    await Promise.all(
      preparedData.map((data) =>
        data.deleted
          ? tx
              .delete(addressAsset)
              .where(and(eq(addressAsset.address, data.address), eq(addressAsset.assetId, data.assetId)))
          : tx
              .insert(addressAsset)
              .values({
                address: data.address,
                assetAmount: data.amount.toString(),
                assetId: data.assetId,
              })
              .onConflictDoUpdate({
                target: [addressAsset.address, addressAsset.assetId],
                set: {
                  assetAmount:
                    data.amount < 0n
                      ? decrement(addressAsset.assetAmount, bigMath.abs(data.amount).toString())
                      : increment(addressAsset.assetAmount, bigMath.abs(data.amount).toString()),
                },
              }),
      ),
    );
  },
  rollback: async (ctx) => {
    const preparedData = [
      ...prepareXudtChanges(ctx.resolvedBlock),
      ...prepareCKBChanges(ctx.resolvedBlock),
      ...prepareSporeChanges(ctx.resolvedBlock, true),
    ];

    await Promise.all(
      (preparedData as ChangeAsset[]).map((data) =>
        data.deleted
          ? ctx.tx
              .delete(addressAsset)
              .where(and(eq(addressAsset.address, data.address), eq(addressAsset.assetId, data.assetId)))
          : ctx.tx
              .insert(addressAsset)
              .values({
                address: data.address,
                assetAmount: data.amount.toString(),
                assetId: data.assetId,
              })
              .onConflictDoUpdate({
                target: [addressAsset.address, addressAsset.assetId],
                set: {
                  assetAmount:
                    data.amount < 0n
                      ? increment(addressAsset.assetAmount, bigMath.abs(data.amount).toString())
                      : decrement(addressAsset.assetAmount, bigMath.abs(data.amount).toString()),
                },
              }),
      ),
    );
  },
});

export const prepareXudtChanges = (block: ResolvedBlock) => {
  const [, ...txs] = block.transactions;

  const changeMaps: Record<string, Record<string, bigint>> = {};
  txs.forEach(({ inputs, outputs }) => {
    const inputXudtGroup = createXudtGroup(inputs);
    const outputXudtGroup = createXudtGroup(outputs);

    const involvedXudts = R.pipe(R.keys(inputXudtGroup.byXudt).concat(R.keys(outputXudtGroup.byXudt)), R.unique());

    involvedXudts.forEach((typeHash) => {
      const inputAddressAmountMap = inputXudtGroup.byXudtAndAddress[typeHash];
      const outputAddressAmountMap = outputXudtGroup.byXudtAndAddress[typeHash];

      const addressMap: Record<string, bigint> = changeMaps[typeHash] ?? {};

      Object.entries(inputAddressAmountMap ?? {}).forEach(([address, amount]) => {
        addressMap[address] = (addressMap[address] ?? 0n) - amount;
      });

      Object.entries(outputAddressAmountMap ?? {}).forEach(([address, amount]) => {
        addressMap[address] = (addressMap[address] ?? 0n) + amount;
      });

      changeMaps[typeHash] = addressMap;
    });
  });

  const changes = Object.entries(changeMaps).flatMap(([assetId, addressMap]) =>
    Object.entries(addressMap).map(([address, amount]) => ({
      assetId,
      address,
      amount,
    })),
  );

  return changes.filter((c) => c.amount !== 0n);
};

export const prepareCKBChanges = (block: ResolvedBlock) => {
  const [cellBaseTx, ...txs] = block.transactions;

  const CKBChangeMaps: Record<string, bigint> = {};

  txs.forEach(({ inputs, outputs }) => {
    inputs.forEach((cell) => {
      CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] =
        (CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] ?? 0n) - BigInt(cell.cellOutput.capacity);
    });

    outputs.forEach((cell) => {
      CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] =
        (CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] ?? 0n) + BigInt(cell.cellOutput.capacity);
    });
  });

  cellBaseTx.outputs.forEach((cell) => {
    CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] =
      (CKBChangeMaps[hexifyScript(cell.cellOutput.lock)] ?? 0n) + BigInt(cell.cellOutput.capacity);
  });

  const changes = Object.entries(CKBChangeMaps).map(([address, amount]) => ({
    assetId: NATIVE_ASSETS.CKB,
    address,
    amount,
  }));

  return changes.filter((c) => c.amount !== 0n);
};

export const prepareSporeChanges = (block: ResolvedBlock, isRollBack?: boolean) => {
  const [_, ...txs] = block.transactions;
  const inputsSpores = createSporeGroup(txs.map((v) => v.inputs).flat());
  const outputSpores = createSporeGroup(txs.map((v) => v.outputs).flat());

  return [
    ...Object.entries(outputSpores).map(([assetId, o]) => ({
      assetId,
      address: hexifyScript(o.cellOutput.lock),
      amount: getSporeVolume(inputsSpores[assetId], o)?.toBigInt() ?? 0n,
      deleted: isRollBack,
    })),
    ...Object.entries(inputsSpores).map(([assetId, i]) => ({
      assetId,
      address: hexifyScript(i.cellOutput.lock),
      amount: getSporeVolume(i, outputSpores[assetId])?.toBigInt() ?? 0n,
      deleted: !isRollBack,
    })),
  ];
};
