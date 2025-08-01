import { type Script } from '@ckb-lumos/lumos';
import { blockchain, bytes } from '@ckb-lumos/lumos/codec';
import { encodeToAddress } from '@ckb-lumos/lumos/helpers';
import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import localeData from 'dayjs/plugin/localeData';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';
import * as R from 'remeda';

import { LUMOS_CONFIG } from '~/lib/constant';

dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.extend(utc);
dayjs.extend(duration);
dayjs.extend(weekday);
dayjs.extend(localeData);

dayjs.locale('en', {
  relativeTime: {
    future: 'in %s',
    past: '%s ago',
    s: '%d seconds',
    m: 'a minute',
    mm: '%d minutes',
    h: 'an hour',
    hh: '%d hours',
    d: 'a day',
    dd: '%d days',
    M: 'a month',
    MM: '%d months',
    y: 'a year',
    yy: '%d years',
  },
});

export { dayjs };

export function trunkLongStr(str?: string, startLen = 8, endLen = 6) {
  if (!str) return '';
  if (startLen + endLen >= str.length) return str;
  return `${str.slice(0, startLen)}...${str.slice(-endLen)}`;
}

export function formatWithDecimal(value: bigint | string | number, decimal: number): string {
  if (!value) return '0';
  const bigValue = new BigNumber(value.toString());
  if (bigValue.isNaN()) {
    return '0';
  }
  return bigValue.dividedBy(new BigNumber(`1e${decimal}`)).toString();
}

export const shannonToCkbDecimal = (value: BigNumber | string | number, decimal?: number) => {
  if (!value) return 0;
  const bigValue = typeof value === 'string' || typeof value === 'number' ? new BigNumber(value) : value;
  if (bigValue.isNaN()) {
    return 0;
  }
  const num = bigValue.dividedBy(new BigNumber('1e8')).abs().toNumber();
  if (decimal) {
    if (bigValue.isNegative()) {
      return 0 - Math.floor(num * 10 ** decimal) / 10 ** decimal;
    }
    return Math.floor(num * 10 ** decimal) / 10 ** decimal;
  }
  if (bigValue.isNegative()) {
    return 0 - Math.floor(num);
  }
  return Math.floor(num);
};

export const shannonToCkb = (value: string | number): string => {
  if (!value) return '0';
  const bigValue = typeof value === 'string' || typeof value === 'number' ? new BigNumber(value) : value;
  if (bigValue.isNaN()) {
    return '0';
  }
  const num = bigValue.dividedBy(new BigNumber('1e8'));
  if (num.abs().isLessThan(new BigNumber('1e-8'))) {
    return '0';
  }
  if (num.abs().isLessThan(new BigNumber('1e-6'))) {
    if (bigValue.mod(10).isEqualTo(0)) {
      return num.toFixed(7);
    }
    return num.toFixed(8);
  }
  return num.toString();
};

export function scriptToAddress(value: Script | string) {
  if (typeof value === 'string') {
    return value;
  }
  try {
    return encodeToAddress(value, { config: LUMOS_CONFIG });
  } catch (error) {
    return '';
  }
}

export function hexifyScript(script: Script) {
  return bytes.hexify(blockchain.Script.pack(script));
}

export function formatScriptForDBQuery(script: Script | string) {
  return typeof script === 'string' ? script : bytes.hexify(blockchain.Script.pack(script));
}

export function parseScriptHex(hex: string) {
  return blockchain.Script.unpack(hex);
}

export function unpackScriptHex(hex: string) {
  try {
    return parseScriptHex(hex);
  } catch {
    return hex;
  }
}

export const localeNumberString = (value: string | number, decimal?: number): string => {
  if (!value) return '0';

  if (typeof value === 'string') value = value.replace(/,/g, '');

  const origin = typeof value === 'string' || typeof value === 'number' ? new BigNumber(value) : value;
  const bigValue = origin.abs();
  if (bigValue.isNaN() || bigValue.isZero()) {
    return '0';
  }
  if (bigValue.isLessThan(1) && bigValue.abs().isGreaterThan(0)) {
    return `${decimal ? Number(value).toFixed(decimal) : value}`;
  }
  let text = (decimal ? bigValue.toFixed(decimal) : bigValue).toString(10);
  const pointIndex = text.indexOf('.');
  let offset = pointIndex === -1 ? text.length : pointIndex;
  while (offset > 3) {
    text = text
      .slice(0, offset - 3)
      .concat(',')
      .concat(text.slice(offset - 3));
    offset -= 3;
  }
  return origin.isNegative() ? `-${text}` : text;
};

export const parseNumericAbbr = (value: BigNumber | string | number, decimal?: number, hideZero?: boolean) => {
  const bigValue = typeof value === 'string' || typeof value === 'number' ? new BigNumber(value) : value;
  if (bigValue.isNaN() || bigValue.isZero()) return '0';
  const kv = bigValue.dividedBy(1000);
  const mv = kv.dividedBy(1000);
  const gv = mv.dividedBy(1000);
  const tv = gv.dividedBy(1000);
  const pv = tv.dividedBy(1000);
  const ev = pv.dividedBy(1000);
  const zv = ev.dividedBy(1000);
  const yv = zv.dividedBy(1000);

  if (yv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? yv.toFixed(decimal) : yv.toFixed()}Y`;
  }
  if (zv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? zv.toFixed(decimal) : zv.toFixed()}Z`;
  }
  if (ev.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? ev.toFixed(decimal) : ev.toFixed()}E`;
  }
  if (pv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? pv.toFixed(decimal) : pv.toFixed()}P`;
  }
  if (tv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? tv.toFixed(decimal) : tv.toFixed()}T`;
  }
  if (gv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? gv.toFixed(decimal) : gv.toFixed()}G`;
  }
  if (mv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? mv.toFixed(decimal) : mv.toFixed()}M`;
  }
  if (kv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? kv.toFixed(decimal) : kv.toFixed()}K`;
  }
  return `${decimal && !hideZero ? bigValue.toFixed(decimal) : bigValue.toFixed()}`;
};

const MIN_VALUE = new BigNumber(1);

export const handleDifficulty = (value: BigNumber | string | number) => {
  if (!value) return '0';
  const bigValue = typeof value === 'string' || typeof value === 'number' ? new BigNumber(value) : value;
  const kv = bigValue.dividedBy(1000);
  const mv = kv.dividedBy(1000);
  const gv = mv.dividedBy(1000);
  const tv = gv.dividedBy(1000);
  const pv = tv.dividedBy(1000);
  const ev = pv.dividedBy(1000);
  const zv = ev.dividedBy(1000);
  const yv = zv.dividedBy(1000);

  if (yv.isGreaterThanOrEqualTo(MIN_VALUE)) {
    return `${localeNumberString(yv.toFixed(2))} YH`;
  }
  if (zv.isGreaterThanOrEqualTo(MIN_VALUE)) {
    return `${localeNumberString(zv.toFixed(2))} ZH`;
  }
  if (ev.isGreaterThanOrEqualTo(MIN_VALUE)) {
    return `${localeNumberString(ev.toFixed(2))} EH`;
  }
  if (pv.isGreaterThanOrEqualTo(MIN_VALUE)) {
    return `${localeNumberString(pv.toFixed(2))} PH`;
  }
  if (tv.isGreaterThanOrEqualTo(MIN_VALUE)) {
    return `${localeNumberString(tv.toFixed(2))} TH`;
  }
  if (gv.isGreaterThanOrEqualTo(MIN_VALUE)) {
    return `${localeNumberString(gv.toFixed(2))} GH`;
  }
  if (mv.isGreaterThanOrEqualTo(MIN_VALUE)) {
    return `${localeNumberString(mv.toFixed(2))} MH`;
  }
  if (kv.isGreaterThanOrEqualTo(MIN_VALUE)) {
    return `${localeNumberString(kv.toFixed(2))} KH`;
  }
  return `${localeNumberString(bigValue.toFixed(2))} H`;
};

export const formatDuration = (duration: duration.Duration) => {
  const hms = duration.format('HH:mm:ss');
  const years = duration.years();
  const months = duration.months();
  const days = duration.days();

  if (years) {
    return `${years} Year ${months} Month ${days} Day ${hms}`;
  }
  if (months) {
    return `${months} Month ${days} Day ${hms}`;
  }
  if (days) {
    return `${days} Day ${hms}`;
  }
  return hms;
};

export const getIconBySymbol = (symbol?: string, icon?: string) => {
  if (symbol && symbol.toLowerCase() === 'ckb') {
    return '/img/ckb.png';
  }
  return icon || '/img/placeholder-icon.svg';
};

export const parseHourFromMinute = (minutes: number | string) => {
  const num = typeof minutes === 'string' ? Number(minutes) : minutes;
  return parseFloat((num / 60).toFixed(2));
};

export const parseHourFromMillisecond = (millisecond: string) => {
  const minutes = new BigNumber(millisecond).div(1000 * 60, 10).toNumber();
  return parseHourFromMinute(minutes);
};

export function sumBigNumbers(v: (string | BigNumber)[]): BigNumber;
export function sumBigNumbers<T extends Record<string, unknown>>(v: T[], prop: (v: T) => string | BigNumber): BigNumber;
export function sumBigNumbers(v: unknown[], prop?: (v: unknown) => string | BigNumber): BigNumber {
  if (prop) {
    return R.reduce(v, (pre, cur) => pre.plus(prop(cur)), BigNumber(0));
  }
  return R.reduce(v, (pre, cur) => pre.plus(cur as string | BigNumber), BigNumber(0));
}
