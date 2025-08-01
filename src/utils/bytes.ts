import { type BytesLike, hexify } from '@ckb-lumos/lumos/codec';

export function toHexWith0x(value: BytesLike): string {
  if (typeof value === 'string') {
    return value.startsWith('0x') ? hexify(value) : hexify('0x' + value);
  }

  return hexify(value);
}

export function toHexNo0x(value: BytesLike): string {
  if (typeof value === 'string' && !value.startsWith('0x')) {
    return value;
  }

  return hexify(value).slice(2);
}

export function bytesEqual(a: BytesLike, b: BytesLike) {
  return toHexNo0x(a) === toHexNo0x(b);
}
