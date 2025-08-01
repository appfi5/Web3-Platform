import { normalizeHexKeys } from '.';

test('normalizeHexKeys', () => {
  const obj = { field1_hex: '0123456789abcdef', field2_nohex: 'no hex' };
  const result = normalizeHexKeys(obj);

  expect(result).toEqual({ field1: '0x0123456789abcdef', field2_nohex: 'no hex' });
});
