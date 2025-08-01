import BigNumber from 'bignumber.js';
import dayjs from 'dayjs';
import duration from 'dayjs/plugin/duration';
import localeData from 'dayjs/plugin/localeData';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import utc from 'dayjs/plugin/utc';
import weekday from 'dayjs/plugin/weekday';

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

export function formatWithDecimal(value: bigint | string | number, decimal: number): string {
  if (!value) return '0';
  const bigValue = new BigNumber(value.toString());
  if (bigValue.isNaN()) {
    return '0';
  }
  return bigValue.dividedBy(new BigNumber(`1e${decimal}`)).toString();
}

export const parseNumericAbbr = (value: BigNumber | string | number, decimal?: number, hideZero?: boolean) => {
  const bigValue = typeof value === 'string' || typeof value === 'number' ? new BigNumber(value) : value;
  if (bigValue.isNaN() || bigValue.isZero()) return '0';
  const kv = bigValue.dividedBy(1000);
  const mv = kv.dividedBy(1000);
  const bv = mv.dividedBy(1000);
  const tv = bv.dividedBy(1000);
  const pv = tv.dividedBy(1000);

  if (pv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? pv.toFixed(decimal) : pv.toFixed()}P`;
  }
  if (tv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? tv.toFixed(decimal) : tv.toFixed()}T`;
  }
  if (bv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? bv.toFixed(decimal) : bv.toFixed()}B`;
  }
  if (mv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? mv.toFixed(decimal) : mv.toFixed()}M`;
  }
  if (kv.isGreaterThanOrEqualTo(1)) {
    return `${decimal !== undefined ? kv.toFixed(decimal) : kv.toFixed()}K`;
  }
  return `${decimal && !hideZero ? bigValue.toFixed(decimal) : bigValue.toFixed()}`;
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

export const fetchImgByUrl = async (url: URL) => {
  const buffer = await fetch(url).then((res) => res.arrayBuffer());
  return `data:image/png;base64,${Buffer.from(buffer).toString('base64')}`;
};
