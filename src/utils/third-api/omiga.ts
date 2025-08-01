import { type HashType } from '@ckb-lumos/lumos';

import { env } from '~/env';

type OmigaResponse<D> = {
  data: D;
  code: number;
  message: string;
};

function APIWrapper<P extends object, R>(url: string, method: 'GET' | 'POST') {
  return async (params: P) => {
    const urlParams =
      method === 'GET'
        ? `?${Object.entries(params)
            .map((v) => `${v[0]}=${v[1]}`)
            .join('&')}`
        : '';
    const result = await fetch(`${env.OMIGA_API_PREFIX}${url}${urlParams}`, {
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
    return (await result.json()) as OmigaResponse<R>;
  };
}

export const xudtTokenList = APIWrapper<
  { page_index: number; limit: number; sort?: string },
  {
    details: {
      type_hash: string;
      symbol: string;
      name: string | null;
      decimal: number;
      rebase_supply: number;
      addresses_count: number;
      udt_type: string;
      floor_price: string;
      block_timestamp: number;
      ckb_usd: number;
      change_24h: string;
      volume_24h: number;
      count_24h: number;
      total_volumn: number;
      total_sales: number;
      list_count: number;
      market_cap: number;
      is_duplicate: boolean;
    }[];
    page_count: number;
    page_index: number;
  }
>('/api/v1/markets/token_list', 'GET');

export const getNftList = APIWrapper<
  { page_index: number; limit: number; sort: string; udt_type: string },
  {
    details: {
      type_hash: string;
      symbol: string;
      name: string;
      items_count: number;
      holders_count: number;
      udt_type: string;
      description: string;
      floor_price: number;
      block_timestamp: string;
      ckb_usd: number;
      change_24h: number;
      volume_24h: number;
      count_24h: number;
      total_volumn: number;
      total_sales: number;
      list_count: number;
      market_cap: number;
      is_duplicate: boolean;
    }[];
    page_count: number;
    page_index: number;
  }
>('/api/v1/nfts/nft_list', 'GET');

export const getDobSellOrders = APIWrapper<
  { page_index: number; limit: number; type_hash: string },
  {
    details: {
      type_hash: string;
      amount: number;
      price: number;
      ckb_usd: number;
      capacity: number;
      total_value: number;
      address: string;
      tx_hash: string;
      tx_output_index: number;
      spore: {
        id: string;
        code_hash: string;
        hash_type: HashType;
        args: string;
        udt_type: string;
        data: {
          content_type: string;
          content: string;
          cluster_id: string;
        };
        dob_data: null;
        cluster: {
          id: string;
          name: string;
          description: string;
          holders_count: number;
          floor_price: number;
          is_duplicate: boolean;
          items_count: number;
        };
      };
      udt_type: string;
    }[];
    page_count: number;
    page_index: number;
  }
>('/api/v1/nfts/sell_orders', 'GET');
