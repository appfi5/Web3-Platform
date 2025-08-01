import path from 'node:path';
import readline from 'node:readline';

import compressing from 'compressing';
import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import { and, asc, desc, eq } from 'drizzle-orm';
import fs from 'fs';
import https from 'https';
import pino from 'pino';
import pretty from 'pino-pretty';

import { NATIVE_ASSETS } from '~/constants';
import { env } from '~/env';
import { db } from '~/server/db';
import { historyPrice } from '~/server/db/schema';

const DATE_FORMAT = 'YYYY-MM-DD';
type AssetId = typeof NATIVE_ASSETS.BTC | typeof NATIVE_ASSETS.CKB;
const logger = pino(pretty({ colorize: true }));
logger.level = env.AGGREGATOR_LOG_LEVEL;
const assetInfo = {
  [NATIVE_ASSETS.BTC]: {
    initPriceFirstDate: '2019-01-01',
    tradingPair: 'BTCUSDT',
  },
  [NATIVE_ASSETS.CKB]: {
    initPriceFirstDate: '2021-01-26',
    tradingPair: 'CKBUSDT',
  },
};
dayjs.extend(utc);

function downloadFile(fileURL: string, downloadPath: string) {
  const file = fs.createWriteStream(downloadPath);

  return new Promise((resolve, reject) => {
    https.get(fileURL, function (response) {
      response.pipe(file);
      file
        .on('finish', function () {
          file.close();
          resolve(downloadPath);
        })
        .on('error', function (error) {
          reject(error);
        });
    });
  });
}

function getFileURL(tradingPair: string, date: string) {
  return {
    fileURL: `https://data.binance.vision/data/spot/daily/klines/${tradingPair}/5m/${tradingPair}-5m-${date}.zip`,
    fileName: `${tradingPair}-5m-${date}.zip`,
  };
}

async function downloadAndUnzip(tradingPair: string, date: string) {
  const { fileURL, fileName } = getFileURL(tradingPair, date);
  logger.info(`Download file from ${fileURL}, Filename is ${fileName}`);
  await downloadFile(fileURL, `./${fileName}`);
  await compressing.zip.uncompress(`./${fileName}`, './');
  return fileName.replace(path.extname(fileName), '.csv');
}

async function getHistoryFromCSV(filePath: string, assetId: AssetId) {
  if (!fs.existsSync(filePath)) throw new Error('Input file does not exist');
  const readStream = fs.createReadStream(filePath);
  const rl = readline.createInterface(readStream);
  const items: (typeof historyPrice.$inferInsert)[] = [];
  for await (const line of rl) {
    // 1546300800000,3701.23000000,3703.72000000,3695.00000000,3696.32000000,85.57218100,1546301099999,316520.64154366,576,52.84793100,195469.93866310,0
    const [time, price] = line.split(',');
    if (!time || !price) continue;
    items.push({
      assetId,
      price,
      time: new Date(Number(time)),
      dataSource: 'binance',
    });
  }
  return items;
}

async function initHistoryPrice(assetId: AssetId, date: string) {
  const tradingPair: string | undefined = assetInfo[assetId].tradingPair;
  if (!tradingPair) throw new Error(`Unknown asset in binance ${assetId}`);
  try {
    const csvFile = await downloadAndUnzip(tradingPair, date);
    const historyItems = await getHistoryFromCSV(csvFile, assetId);
    await db.insert(historyPrice).values(historyItems).onConflictDoNothing();
  } catch (error) {
    logger.error(
      // eslint-disable-next-line @typescript-eslint/no-base-to-string
      `init ${NATIVE_ASSETS[assetId]} history price error with ${typeof error === 'object' && error && 'toString' in error ? error.toString() : ''}, please check`,
    );
  }
}

async function getDateRange(assetId: AssetId): Promise<[string, string]> {
  const latestBTCPriceFormBinance = await db
    .select()
    .from(historyPrice)
    .where(and(eq(historyPrice.assetId, assetId), eq(historyPrice.dataSource, 'binance')))
    .orderBy(desc(historyPrice.time))
    .limit(1);
  const firstBTCPriceFormCoinmarket = await db
    .select()
    .from(historyPrice)
    .where(and(eq(historyPrice.assetId, assetId), eq(historyPrice.dataSource, 'coinmarket')))
    .orderBy(asc(historyPrice.time))
    .limit(1);
  return [
    latestBTCPriceFormBinance[0]
      ? dayjs(latestBTCPriceFormBinance[0].time).utc().add(1, 'day').format(DATE_FORMAT)
      : assetInfo[assetId].initPriceFirstDate,
    firstBTCPriceFormCoinmarket[0]
      ? dayjs(firstBTCPriceFormCoinmarket[0].time).utc().subtract(1, 'day').format(DATE_FORMAT)
      : dayjs().utc().format(DATE_FORMAT),
  ];
}

export async function initHistoryFromBinance(assetId: AssetId) {
  // eslint-disable-next-line prefer-const
  let [startDate, endDate] = await getDateRange(assetId);
  logger.info(`${NATIVE_ASSETS[assetId]} history price missing from ${startDate} to ${endDate}`);
  while (startDate < endDate) {
    logger.info(`insert ${NATIVE_ASSETS[assetId]}: ${startDate} price into historyPirce`);
    await initHistoryPrice(assetId, startDate);
    startDate = dayjs(startDate).add(1, 'day').format(DATE_FORMAT);
  }
}
