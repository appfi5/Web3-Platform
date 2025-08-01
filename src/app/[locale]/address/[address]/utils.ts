'use client';
import { NATIVE_ASSETS } from '~/constants';
import { type assetInfo as AssetInfo } from '~/server/db/schema';

export const getAssetNetwork = (assetInfo: Pick<typeof AssetInfo.$inferSelect, 'id' | 'parentId'> | null) => {
  if (assetInfo?.parentId === NATIVE_ASSETS.BTC || assetInfo?.id === NATIVE_ASSETS.BTC) {
    return 'btc';
  }

  return 'ckb';
};

export const NetworkIcon = {
  CKB: '/img/ckb.png',
  BTC: '/img/btc.png',
  ckb: '/img/ckb.png',
  btc: '/img/btc.png',
};
