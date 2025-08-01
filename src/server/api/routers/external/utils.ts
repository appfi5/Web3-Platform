import createClient from 'openapi-fetch';

import { env } from '~/env';
import type * as CkbExplorerV1 from '~/utils/third-api/openapi-ckb-explorer-v1';
import type * as CkbExplorerV2 from '~/utils/third-api/openapi-ckb-explorer-v2';

export const commonHeader = { 'Content-Type': 'application/vnd.api+json', Accept: 'application/vnd.api+json' };
export const ckbExplorerApiV1 = createClient<CkbExplorerV1.paths>({
  baseUrl: env.CKB_EXPLORER_API_PREFIX + '/v1',
  headers: commonHeader,
});
export const ckbExplorerApiV2 = createClient<CkbExplorerV2.paths>({
  baseUrl: env.CKB_EXPLORER_API_PREFIX + '/v2',
  headers: commonHeader,
});

/* ========== Fee rate utils ========== */
/* ========== Copied from Explorer ========== */

type FeeRateSample = Record<'fee_rate' | 'confirmation_time' | 'timestamp', number>;

export const getFeeRateTiers = (feeRates: Array<FeeRateSample>, TPM = 100, avgBlockTime = 12) => {
  const samples = getFeeRateSamples(feeRates, TPM, avgBlockTime);
  const allFrs = samples.sort((a, b) => a.confirmation_time - b.confirmation_time);

  const avgConfirmationTime = getWeightedMedian(allFrs);

  const lowFrs = allFrs.filter((r) => r.confirmation_time >= avgConfirmationTime);
  const highFrs = allFrs.filter((r) => r.confirmation_time <= avgConfirmationTime);

  const list = [lowFrs, allFrs, highFrs].map(calcFeeRate).sort() as [number, number, number];

  return { low: list[0], medium: list[1], high: list[2] };
};

const getFeeRateSamples = (feeRates: Array<FeeRateSample>, TPM = 100, avgBlockTime = 12) => {
  if (feeRates.length === 0) return feeRates;

  const SAMPLES_MIN_COUNT = 100;

  const sampleCount = Math.max(SAMPLES_MIN_COUNT, Number.isNaN(TPM) ? 0 : Math.floor(TPM) * 10);
  const validSamples = feeRates.filter((i) => i.confirmation_time).sort((a, b) => a.fee_rate - b.fee_rate);

  // check if lowest fee rate has ideal confirmation time
  const lowests = validSamples.slice(0, SAMPLES_MIN_COUNT);
  const avgOfLowests = lowests.reduce((acc, cur) => acc + cur.confirmation_time, 0) / lowests.length;

  const ACCEPTABLE_CONFIRMATION_TIME = 2 * avgBlockTime;

  if (avgOfLowests <= ACCEPTABLE_CONFIRMATION_TIME) {
    return lowests;
  }

  // if lowest fee rate doesn't hit acceptable confirmation time, sample by iqrs

  // Calculate the first and third quartiles (Q1 and Q3)
  const q1Index = Math.floor(validSamples.length * 0.25);
  const q3Index = Math.floor(validSamples.length * 0.75);
  const q1 = validSamples[q1Index]?.fee_rate ?? 0;
  const q3 = validSamples[q3Index]?.fee_rate ?? 0;

  // Calculate the Interquartile Range (IQR)
  const iqr = q3 - q1;
  // // Define the lower and upper bounds for outliers
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;

  // Filter out the outliers
  const filteredData = validSamples.filter((item) => item.fee_rate >= lowerBound && item.fee_rate <= upperBound);

  const samples = filteredData
    .sort((a, b) => a.confirmation_time - b.confirmation_time)
    .reduce<Array<FeeRateSample>>((acc, cur) => {
      const last = acc[acc.length - 1];
      if (!last || last.fee_rate + 1.5 * iqr >= cur.fee_rate) {
        return [...acc, cur];
      }
      return acc;
    }, [])
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, sampleCount);

  return samples;
};

const getWeightedMedian = (tfrs: Array<FeeRateSample>): number => {
  if (!tfrs?.length) return 0;
  if (tfrs.length % 2 === 0) {
    return ((tfrs[tfrs.length / 2 - 1]?.confirmation_time ?? 0) + (tfrs[tfrs.length / 2]?.confirmation_time ?? 0)) / 2;
  }
  return tfrs[(tfrs.length - 1) / 2]?.confirmation_time ?? 0;
};

const calcFeeRate = (tfrs: Array<FeeRateSample>): number =>
  !tfrs.length ? 0 : Math.round(tfrs.reduce((acc, cur) => acc + cur.fee_rate * 1000, 0) / tfrs.length);
/* ========== Fee rate utils ========== */
