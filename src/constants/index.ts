// https://github.com/satoshilabs/slips/blob/master/slip-0044.md
// A 2-way map for native assets' ID and symbol
export const NATIVE_ASSETS = {
  BTC: '0x80000000',
  '0x80000000': 'BTC',

  CKB: '0x80000135',
  '0x80000135': 'CKB',
} as const;
