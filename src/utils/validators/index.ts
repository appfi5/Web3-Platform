import { parseAddress } from '@ckb-lumos/lumos/helpers';

import { LUMOS_CONFIG } from '~/lib/constant';

const HEX_REGEX = /^(0x)?[0-9a-fA-F]{64}$/;

export function isValidHash(value: string): boolean {
  return HEX_REGEX.test(value);
}

export function isValidAddress(value: string): boolean {
  try {
    parseAddress(value, { config: LUMOS_CONFIG });
    return true;
  } catch (e) {
    return false;
  }
}
