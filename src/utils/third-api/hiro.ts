import { env } from '~/env';

type ValueType = string | number | boolean;
type HiroPaginationResponse<D> = {
  limit: number;
  offset: number;
  total: number;
  results: D[];
};
type StringJoinWithColon = `${string}:${string}`;

function joinSearchParams<P extends ValueType | Record<string, ValueType | ValueType[]>>(p: P) {
  if (typeof p === 'object') {
    return Object.entries(p)
      .map((v) => `${v[0]}=${encodeURIComponent(Array.isArray(v[1]) ? JSON.stringify(v[1]) : v[1])}`)
      .join('&');
  }
  return '';
}
function hiroAPIWrapper<P extends ValueType | Record<string, ValueType | ValueType[]>, R>(
  url: string | ((params: P) => string),
) {
  return async (params: P) => {
    let requestUrl: string;
    if (typeof url === 'function') {
      requestUrl = `${env.HIRO_API}${url(params)}`;
    } else {
      requestUrl = `${env.HIRO_API}${url}?${joinSearchParams(params)}}`;
    }
    const result = await fetch(requestUrl, {
      method: 'GET',
    });
    if (!result.ok)
      throw new Error(`Hiro response with status ${result.status}, ${result.statusText}, request url: ${requestUrl}`);
    return (await result.json()) as R;
  };
}

export const getBRC20Tokens = hiroAPIWrapper<
  {
    ticker: string[];
    offset?: number;
    limit?: number;
  },
  HiroPaginationResponse<{
    id: string;
    number: number;
    block_height: number;
    tx_id: string;
    address: string;
    ticker: string;
    max_supply: string;
    mint_limit: string;
    decimals: number;
    deploy_timestamp: number;
    minted_supply: string;
    tx_count: number;
    self_mint: boolean;
  }>
>('/ordinals/v1/brc-20/tokens');

export const getBRC20Token = hiroAPIWrapper<
  string,
  {
    token: {
      id: string;
      number: number;
      block_height: number;
      tx_id: string;
      address: string;
      ticker: string;
      max_supply: string;
      mint_limit: string;
      decimals: number;
      deploy_timestamp: number;
      minted_supply: string;
      tx_count: number;
      self_mint: boolean;
    };
    supply: {
      max_supply: string;
      minted_supply: string;
      holders: number;
    };
  }
>((ticker) => `/ordinals/v1/brc-20/tokens/${ticker}`);

type BRC20_Operation = 'transfer' | 'transfer_send';
export const getBRC20Activity = hiroAPIWrapper<
  {
    ticker: string[];
    operation: BRC20_Operation[];
    block_height?: number;
    address?: string;
    limit?: number;
    offset?: number;
  },
  HiroPaginationResponse<{
    operation: BRC20_Operation;
    ticker: string;
    inscription_id: string;
    block_height: 872703;
    block_hash: string;
    tx_id: string;
    location: string;
    address: string;
    timestamp: number;
    transfer: {
      amount: string;
      from_address: string;
    };
  }>
>('/ordinals/v1/brc-20/activity');

export const getBRC20Balance = hiroAPIWrapper<
  {
    ticker: string[];
    block_height?: number;
    address: string;
    limit?: number;
    offset?: number;
  },
  HiroPaginationResponse<{
    ticker: string;
    available_balance: string;
    transferrable_balance: string;
    overall_balance: string;
  }>
>((p) => `/v1/brc-20/balances/${p.address}?${joinSearchParams(p)}`);

export const getBRC20TokenHolders = hiroAPIWrapper<
  {
    ticker: string;
    limit?: number;
    offset?: number;
  },
  HiroPaginationResponse<{
    address: string;
    overall_balance: string;
  }>
>((p) => `/ordinals/v1/brc-20/tokens/${p.ticker}/holders?${joinSearchParams(p)}`);

interface RunesActivity {
  operation: 'receive' | 'send';
  location: {
    block_hash: string;
    block_height: number;
    tx_id: string;
    tx_index: number;
    timestamp: number;
    vout: number;
    output: StringJoinWithColon;
  };
  address: string;
  receiver_address?: string;
  amount: string;
}

interface RunesInfo {
  id: StringJoinWithColon;
  name: string;
  spaced_name: string;
}

type Etching = string; // Any properties in Rune ID, Rune number, Rune name, Rune name with spacers

export const getRunesActivity = hiroAPIWrapper<
  {
    etching: Etching;
    offset?: number;
    limit?: number;
  },
  HiroPaginationResponse<RunesActivity>
>((p) => `/v1/etchings/${p.etching}/activity?${joinSearchParams(p)}`);

export const getRunesActivityForAnAddress = hiroAPIWrapper<
  {
    etching: Etching;
    address?: string;
    offset?: number;
    limit?: number;
  },
  HiroPaginationResponse<RunesActivity>
>((p) => `/runes/v1/etchings/${p.etching}/activity/${p.address}?${joinSearchParams(p)}`);

export const getRunesActivityInBlock = hiroAPIWrapper<
  {
    block: number | string; // block number or block hash
    offset?: number;
    limit?: number;
  },
  HiroPaginationResponse<
    RunesActivity & {
      rune: RunesInfo;
    }
  >
>((p) => `/runes/v1/blocks/${p.block}/activity?${joinSearchParams(p)}`);

export const getRunesActivityInTx = hiroAPIWrapper<
  {
    tx_id: string;
    offset?: number;
    limit?: number;
  },
  HiroPaginationResponse<
    RunesActivity & {
      rune: RunesInfo;
    }
  >
>((p) => `/runes/v1/transactions/${p.tx_id}/activity?${joinSearchParams(p)}`);

export const getAddressBalance = hiroAPIWrapper<
  {
    address: string;
    offset?: number;
    limit?: number;
  },
  HiroPaginationResponse<{
    rune: RunesInfo;
    balance: string;
    address: string;
  }>
>((p) => `/runes/v1/addresses/${p.address}/balances?${joinSearchParams(p)}`);

export const getRunesHolderBalance = hiroAPIWrapper<
  {
    etching: Etching;
    address: string;
  },
  {
    balance: string;
    address: string;
  }
>((p) => `/runes/v1/etchings/${p.etching}/holders/${p.address}?${joinSearchParams(p)}`);

export const getRunesHolders = hiroAPIWrapper<
  {
    etching: Etching;
    offset?: number;
    limit?: number;
  },
  HiroPaginationResponse<{
    balance: string;
    address: string;
  }>
>((p) => `/runes/v1/etchings/${p.etching}/holders?${joinSearchParams(p)}`);
