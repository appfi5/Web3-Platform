import { toHexNo0x } from '~/utils/bytes';

import { addressConvert } from './address';

const ckbAddress = 'ckb1qzda0cr08m85hc8jlnfp3zer7xulejywt49kt2rr0vthywaa50xwsq0tpsqq08mkay9ewrfrdwlcghv62qw704s93hhsj';
const ckbPacked =
  '0x490000001000000030000000310000009bd7e06f3ecf4be0f2fcd2188b23f1b9fcc88e5d4b65a8637b17723bbda3cce80114000000eb0c00079f76e90b970d236bbf845d9a501de7d6';
const btcAddresses = [
  '13HFqPr9Ceh2aBvcjxNdUycHuFG7PReGH4',
  'bc1pfnzkap3dr2nf2hvnju72kjrq65hhum22pncreefdygh7rmwgf6gq5p706m',
  '3CLT6iFw4v1ZoLaf273qZ5akvdXULt4Es6',
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  '6a0462656172',
  '41041e0fda51a022022365806821060ff21319758a1e853dbf8aad20c7af2820b01948bb86e98b22e00b70667972c3fbdf3bb5c981ba1d5bc540d7961504bf001eb3ac',
];
const btcPackedAddresses = [
  '0x76a91419034a421bf9f6a14657f39c806944d3e197d1cf88ac',
  '0x51204cc56e862d1aa6955d93973cab4860d52f7e6d4a0cf03ce52d222fe1edc84e90',
  '0xa91474c5a9e99596a8a8261f384a63ad6b8d5a34e0a087',
  '0x0014751e76e8199196d454941c45d1b3a323f1433bd6',
  '6a0462656172',
  '41041e0fda51a022022365806821060ff21319758a1e853dbf8aad20c7af2820b01948bb86e98b22e00b70667972c3fbdf3bb5c981ba1d5bc540d7961504bf001eb3ac',
];
const btcFromCHAddresses = [
  '13HFqPr9Ceh2aBvcjxNdUycHuFG7PReGH4',
  'bc1pfnzkap3dr2nf2hvnju72kjrq65hhum22pncreefdygh7rmwgf6gq5p706m',
  '3CLT6iFw4v1ZoLaf273qZ5akvdXULt4Es6',
  'bc1qw508d6qejxtdg4y5r3zarvary0c5xw7kv8f3t4',
  'UNKNOWN',
  'UNKNOWN',
];

describe('addressConvert', () => {
  test('ckb address toCH', () => {
    expect(addressConvert.toCH(ckbAddress, 'ckb')).toBe(ckbPacked);
    expect(addressConvert.toCH(ckbAddress)).toBe(ckbPacked);
  });
  test('btc address toCH', () => {
    btcAddresses.forEach((btcAddress, i) => {
      expect(addressConvert.toCH(btcAddress, 'btc')).toBe(btcPackedAddresses[i]);
      expect(addressConvert.toCH(btcAddress)).toBe(btcPackedAddresses[i]);
    });
  });
  test('ckb address fromCH', () => {
    expect(addressConvert.fromCH(ckbPacked, 'ckb')).toBe(ckbAddress);
    expect(addressConvert.fromCH(ckbPacked)).toBe(ckbAddress);
    expect(addressConvert.fromCH(toHexNo0x(ckbPacked))).toBe(ckbAddress);
  });
  test('btc address fromCH', () => {
    btcPackedAddresses.forEach((btcPackedAddress, i) => {
      expect(addressConvert.fromCH(btcPackedAddress, 'btc')).toBe(btcFromCHAddresses[i]);
      expect(addressConvert.fromCH(btcPackedAddress)).toBe(btcFromCHAddresses[i]);
      expect(addressConvert.fromCH(toHexNo0x(btcPackedAddress))).toBe(btcFromCHAddresses[i]);
    });
  });
});
