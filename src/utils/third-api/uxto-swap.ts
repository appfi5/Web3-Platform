import { env } from '~/env';

type UTXOSwapResponse<D> = {
  data: D;
  code: number;
  message: string;
};

type Asset = {
  decimals: number;
  name: string;
  price: string;
  reserve: StringNumber;
  symbol: string;
  typeCellDep: {
    depType: string;
    outPoint: {
      txHash: string;
      index: number;
    };
  } | null;
  typeHash: string;
  typeScript: {
    args: string;
    codeHash: string;
    hashType: string;
  } | null;
};

type StringNumber = string;

function APIWrapper<P extends object, R>(url: string, method: 'GET' | 'POST') {
  return async (params: P) => {
    const urlParams =
      method === 'GET'
        ? `?${Object.entries(params)
            .map((v) => `${v[0]}=${v[1]}`)
            .join('&')}`
        : '';
    const result = await fetch(`${env.UTXO_SWAP_API_PREFIX}${url}${urlParams}`, {
      method,
      headers:
        method === 'POST'
          ? {
              'content-type': 'application/json',
            }
          : {},
      body: method === 'POST' ? JSON.stringify(params) : undefined,
    });
    if (!result.ok) throw new Error(`response with status ${result.status}, ${result.statusText}`);
    return (await result.json()) as UTXOSwapResponse<R>;
  };
}

export const sequencerPools = APIWrapper<
  { pageNo: number; pageSize: number; searchKey: string },
  {
    list: {
      assetX: Asset;
      assetY: Asset;
      basedAsset: number;
      batchId: number;
      dayApr: StringNumber;
      dayFees: StringNumber;
      dayTxsCount: StringNumber;
      dayVolume: StringNumber;
      dayVolumeChangeRate: StringNumber;
      feeRate: number;
      protocolLpAmount: StringNumber;
      totalLpSupply: StringNumber;
      tvl: StringNumber;
      tvlChangeRate: StringNumber;
      typeHash: string;
    }[];
    totalCount: number;
  }
>('/api/v1/sequencer/pools', 'POST');

export enum CandlestickType {
  FourHour,
  OneDay,
  SevenDay,
  ThirtyDay,
  All,
}
export const candlestick = APIWrapper<
  {
    asset_x_type_hash: string;
    asset_y_type_hash: string;
    candlestickType: CandlestickType;
  },
  {
    list: {
      time: number;
      dayVolume: StringNumber;
      otherAssetAmount: StringNumber;
      otherAssetSymbol: string;
      basedAssetAmount: StringNumber;
      basedAssetSymbol: string;
    }[];
  }
>('/api/v1/sequencer/pool/candlestick', 'POST');
