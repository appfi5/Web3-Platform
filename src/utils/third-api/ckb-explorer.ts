import { env } from '~/env';

type CKBExplorerResponse<D> = {
  data: D;
};

export type ExtraInfo = {
  amount: string;
  decimal: string;
  published: boolean;
  symbol: string;
  type_hash?: string;
  collection?: {
    type_hash: string;
  };
};

export type DisplayInput = {
  id: string;
  from_cellbase: boolean;
  capacity: string;
  occupied_capacity: string;
  address_hash: string;
  cell_index: number;
  cell_type: string;
  extra_info?: ExtraInfo;
};

export type DisplayOutput = {
  id: string;
  capacity: string;
  occupied_capacity: string;
  address_hash: string;
  status: string;
  cell_index: number;
  base_reward?: string;
  commit_reward?: string;
  proposal_reward?: string;
  secondary_reward?: string;
  extra_info?: ExtraInfo;
  scriptpubkey?: string;
  scriptpubkey_address?: string;
  scriptpubkey_asm?: string;
  scriptpubkey_type?: string;
};

export type Attributes = {
  is_cellbase: boolean;
  tx_status: string;
  display_inputs: DisplayInput[];
  display_outputs: DisplayOutput[];
  transaction_fee: string;
  version: string;
  block_number: string;
  bytes: number;
  cycles: number;
  is_rgb_transaction: boolean;
};

function getQueryParams<P extends Exclude<object, null>>(p: P) {
  return `?${Object.entries(p)
    .map((v) => `${v[0]}=${v[1]}`)
    .join('&')}`;
}

function ckbExplorerAPIWrapper<P extends object | void | string | number, R>(url: string, method: 'GET' | 'POST') {
  return async (params: P) => {
    let urlParams = '';
    if (typeof params === 'string' || typeof params === 'number') {
      urlParams = `/${params}`;
    } else {
      urlParams =
        method === 'GET' && params !== null && params !== undefined
          ? getQueryParams(params as Exclude<P, void | null | string | number>)
          : '';
    }

    const result = await fetch(`${env.CKB_EXPLORER_API_PREFIX}${url}${urlParams}`, {
      method,
      headers: {
        'content-type': 'application/vnd.api+json',
        Accept: 'application/vnd.api+json',
      },
      body: method === 'POST' ? JSON.stringify(params) : undefined,
    });
    if (!result.ok) throw new Error(`response with status ${result.status}, ${result.statusText}`);
    return (await result.json()) as CKBExplorerResponse<R>;
  };
}

export const search = ckbExplorerAPIWrapper<
  { q: string },
  {
    id: string;
    type: string;
    attributes: {
      block_hash: string;
    };
  }
>('/v1/suggest_queries', 'GET');

export const getBlock = ckbExplorerAPIWrapper<
  string | number,
  {
    id: string;
    type: string;
    attributes: {
      transactions_root: string;
      reward_status: string;
      received_tx_fee_status: string;
      miner_message: string;
      number: string;
      start_number: string;
      length: string;
      version: string;
      proposals_count: string;
      uncles_count: string;
      timestamp: string;
      reward: string;
      cell_consumed: string;
      total_transaction_fee: string;
      transactions_count: string;
      total_cell_capacity: string;
      received_tx_fee: string;
      epoch: string;
      block_index_in_epoch: string;
      nonce: string;
      difficulty: string;
      miner_reward: string;
      size: number;
      largest_block: number;
      cycles: number;
      block_hash: string;
      miner_hash: string;
    };
  }
>('/v1/blocks', 'GET');

export const getTx = ckbExplorerAPIWrapper<
  string,
  {
    id: string;
    type: string;
    attributes: Attributes;
  }
>('/v1/transactions', 'GET');

export const getBlocks = ckbExplorerAPIWrapper<
  { page: number; pageSize: number },
  {
    type: 'block_list';
    attributes: {
      miner_hash: string;
      number: string;
      timestamp: string;
      reward: string;
      transactions_count: string;
      live_cell_changes: string;
    };
  }[]
>('/v1/blocks', 'GET');
