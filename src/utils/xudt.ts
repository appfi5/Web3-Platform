import { bytes, type BytesLike, Uint128 } from '@ckb-lumos/lumos/codec';

export function decodeUdtData(data: BytesLike): bigint {
  const amount = bytes.bytify(data);
  // https://explorer.nervos.org/transaction/0x743185b63745ab05e7a03878d7e9d460870ae79b13f1d19af4466e1c53459e27
  // the data could be empty when the amount is 0
  if (amount.length === 0) {
    return 0n;
  }

  try {
    return Uint128.unpack(amount.slice(0, 16)).toBigInt();
  } catch {
    // https://testnet.explorer.nervos.org/transaction/0xf54de5de67d553f04873c2cbef20f670c97ee20870196890e2df3a1862c93790
    // owner mode could skip the data length check https://github.com/nervosnetwork/ckb-miscellaneous-scripts/blob/53640e9c18eb4a3517ed3b3cb13ee72a1eec1daa/c/simple_udt.c#L111
    // If the data length is not 128, return 0
    return 0n;
  }
}
