import { createHmac } from 'node:crypto';

import { scheduler } from 'timers/promises';

import { env } from '~/env';

function verifyOkxEnv() {
  if (!env.OKX_URL || !env.OKX_API_KEY || !env.OKX_SECRET_KEY || !env.OKX_PASSPHRASE) {
    throw new Error(`Missing okx envronment, please check`);
  }
}

function getHeader(method: 'GET' | 'POST', apiUrl: string, stringBody?: string) {
  verifyOkxEnv();
  const date = new Date(); // Get the current time
  const timestamp = date.toISOString(); // Convert the current time to the desired format
  return {
    'Content-Type': 'application/json',
    'OK-ACCESS-KEY': env.OKX_API_KEY!,
    'OK-ACCESS-SIGN': createHmac('sha256', env.OKX_SECRET_KEY!)
      .update(timestamp + method + apiUrl + (stringBody ?? ''))
      .digest('base64'),
    'OK-ACCESS-TIMESTAMP': timestamp,
    'OK-ACCESS-PASSPHRASE': env.OKX_PASSPHRASE!,
  };
}

type OKXResponse<D> = {
  code: number;
  data: D;
  msg: string;
};

function okxAPIWrapper<P extends Record<string, string | number | boolean> | void, R>(
  url: string,
  method: 'GET' | 'POST' = 'GET',
) {
  return async (params: P) => {
    let requestUrl = url;
    let body;
    if (params) {
      if (method === 'GET') {
        requestUrl += `?${Object.entries(params)
          .map((v) => `${v[0]}=${encodeURIComponent(v[1])}`)
          .join('&')}`;
      } else {
        body = JSON.stringify(params);
      }
    }
    const result = await fetch(`${env.OKX_URL}${requestUrl}`, {
      method,
      headers: getHeader(method, requestUrl, body),
      body,
    });
    if (!result.ok)
      throw new Error(
        `OKX API response with status ${result.status}, ${result.statusText}. Request url: ${requestUrl}`,
      );
    const unpackedResult = (await result.json()) as OKXResponse<R>;
    if (unpackedResult.code !== 0) throw new Error(`Request ${requestUrl} with error ${unpackedResult.msg}`);
    return unpackedResult.data;
  };
}

export enum TimeType {
  _24Hours = 1,
  _7D,
  _30D,
  All,
}

/**
 * 
 {
    collectionUrl: 'https://www.okx.com/web3/marketplace/runes/token/DOG•GO•TO•THE•MOON/840000:3',
    deployedTime: 1713571767,
    divisibility: 5,
    endBlock: null,
    marketData: {
      floorPrice: '6.329',
      holders: 100505,
      marketCap: '6381.291331974140116623',
      salesCount: 829,
      totalVolume: '5.94682965',
      usdFloorPrice: '0.005990626344',
      usdMarketCap: '604012197.220147468942786793',
      usdTotalVolume: '562888.83495924',
      volumeGains: '-0.063834'
    },
    maxMintNumber: '100000000000',
    mintedNumber: '100000000000',
    name: 'DOG•GO•TO•THE•MOON',
    runesId: '840000:3',
    spaceName: 'DOGGOTOTHEMOON',
    startBlock: 840000,
    symbol: '🐕'
  }
*/
export interface RuneInfo {
  collectionUrl: string;
  deployedTime: number;
  divisibility: number;
  endBlock: number | null;
  marketData: {
    floorPrice: string;
    holders: number;
    marketCap: string;
    salesCount: number;
    totalVolume: string;
    usdFloorPrice: string;
    usdMarketCap: string;
    usdTotalVolume: string;
    volumeGains: string;
  };
  maxMintNumber: string;
  mintedNumber: string;
  name: string;
  runesId: string;
  spaceName: string;
  startBlock: number;
  symbol: string;
}

export const getHotCollection = okxAPIWrapper<
  {
    timeType?: TimeType; // default _24Hours
    cursor?: string;
    limit?: number; // default 10
  } | void,
  {
    cursor?: string;
    items: RuneInfo[];
  }
>('/api/v5/mktplace/nft/runes/get-hot-collection');

export const getRunesDetail = okxAPIWrapper<
  {
    runesId: string; // eg: 840000:3, 840000:28
  },
  {
    cursor?: string;
    items: RuneInfo[];
  }
>('/api/v5/mktplace/nft/runes/get-hot-collection');

export const getRunesTradeHistory = okxAPIWrapper<
  {
    runesId?: string; // eg: 840000:3, 840000:28
    cursor?: string;
    limit?: number;
    startTime?: number;
    endTime?: number;
  } | void,
  /**
 * 
  amount: '2472.22222222',
  createOn: 1736389893000,
  from: 'bc1pwqndtmsf7ed9ufhk4wre67ew2zdzq923neajt5egnpz0a8au0s8sxv097y',
  name: 'GIZMO•IMAGINARY•KITTEN',
  platformName: 'Magic Eden',
  runesId: '865193:4006',
  status: 1,
  to: 'bc1p55gzd5udqlmtryk6852k5nqchxhsyvn73387mjxux8nm0pq0elksjnhgv4',
  totalPrice: {
    currency: 'BTC',
    currencyUrl: 'https://static.coinall.ltd/cdn/wallet/logo/BTC.png',
    price: '0.00028887',
    satPrice: '28887',
    usdPrice: '27.34558968'
  },
  txHash: 'e5613230c86ca67b832d5523f984c3dbd2b7e88db54e952028a844932e6362fd',
  typeName: 'SALE',
  unitPrice: {
    currency: 'BTC',
    currencyUrl: 'https://static.coinall.ltd/cdn/wallet/logo/BTC.png',
    price: '0.000000116846292134',
    satPrice: '11.684629213493649',
    usdPrice: '0.011061137398572976'
  }
 */
  {
    cursor?: string;
    hasNext: boolean;
    activityList: {
      amount: string;
      createOn: number;
      from: string;
      name: string;
      platformName: string;
      runesId: string;
      status: 1;
      to: string;
      totalPrice: {
        currency: string;
        currencyUrl: string;
        price: string;
        satPrice: string;
        usdPrice: string;
      };
      txHash: string;
      typeName: string;
      unitPrice: {
        currency: string;
        currencyUrl: string;
        price: string;
        satPrice: string;
        usdPrice: string;
      };
    }[];
  }
>('/api/v5/mktplace/nft/runes/trade-history');

export const getOrdiCollections = okxAPIWrapper<
  {
    slug?: string;
    cursor?: string;
    limit?: number; // 默认值 100，最大 300
    isBrc20?: boolean; // 获取全部 BTC NFT 或 Brc20 合集的列表，默认为 Brc20
  } | void,
  {
    cursor?: string;
    data: {
      floorPrice: string;
      inscriptionNumRange: string;
      isBrc20: boolean;
      slug: string;
      totalVolume: string;
      volume24h: string;
    }[];
  }
>('/api/v5/mktplace/nft/ordinals/collections');

export const getOrdiTradeHistory = okxAPIWrapper<
  {
    slug: string;
    cursor?: string;
    limit?: number;
    sort?: string; // 'desc' | 'asc';
    isBrc20?: boolean;
    type?: string; // 默认返回成交数据（SALE、LIST、TRANSFER、CANCEL_LIST、UPDATE_PRICE）
  },
  {
    cursor?: string;
    data: {
      amount: string;
      fromAddress: string;
      inscriptionId: string;
      inscriptionNumber: number;
      isBrc20: boolean;
      orderSource: number;
      orderSourceName: string;
      price: string;
      slug: string;
      timestamp: number;
      toAddress: string;
      type: 'BUY' | 'SALE';
      unitPrice: string;
    }[];
  }
>('/api/v5/mktplace/nft/ordinals/trade-history', 'POST');

export async function getAllRunes() {
  const runes: RuneInfo[] = [];
  const queryRuneParameter = { timeType: TimeType.All, limit: 99 };
  let res = await getHotCollection(queryRuneParameter);
  runes.push(...res.items);
  while (res.cursor && res.items.length) {
    await scheduler.wait(1_000);
    res = await getHotCollection({ ...queryRuneParameter, cursor: res.cursor });
    runes.push(...res.items);
  }
  return runes;
}

export async function getAllBrc20() {
  const brc20s = [];
  const quertBrc20Parameter = { limit: 300 };
  let res = await getOrdiCollections(quertBrc20Parameter);
  brc20s.push(...res.data);
  while (res.cursor && res.data.length) {
    await scheduler.wait(1_000);
    res = await getOrdiCollections({ ...quertBrc20Parameter, cursor: res.cursor });
    brc20s.push(...res.data);
  }
  return brc20s;
}
