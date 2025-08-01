import { type Script } from '@ckb-lumos/lumos';

import { getTx } from '~/aggregator/btc/api';
import { isScriptOf } from '~/aggregator/ckb/utils';
import { LUMOS_CONFIG } from '~/lib/constant';

import { asserts } from './asserts';

export async function getRgbppCellAddress(script: Script) {
  const [txid, outIndex] = parseRgbppArgs(script.args);
  const tx = await getTx({ txid });

  const address = tx.vouts[outIndex]?.address;

  asserts(address);

  return address;
}

export function isRGBPP(script: Script): boolean {
  return isScriptOf(script, LUMOS_CONFIG.SCRIPTS.RGBPP);
}

export function parseRgbppArgs(args: string): [string, number] {
  // 去掉前缀 "0x"
  args = args.startsWith('0x') ? args.slice(2) : args;

  // 将前8个字符解析为数值
  const outIndex = Buffer.from(args.slice(0, 8), 'hex').readUInt16LE(0);

  // 从第9个字符开始，按字节倒序排列，得到 txid
  const txid = args.slice(8).match(/../g)?.reverse().join('') ?? '';

  return [txid, outIndex];
}
