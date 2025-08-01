import { type TransactionDetail, type Vin, type Vout } from '~/aggregator/btc/api';
import { type tx } from '~/server/db/schema';
import { type Chain } from '~/utils/const';
import { type Attributes, type DisplayInput, type DisplayOutput } from '~/utils/third-api/ckb-explorer';

export type Asset = {
  assetId: string;
  icon: string;
  symbol: string;
  decimal: number | string;
  amount: string;
  value: string;
};

export type InputOutput = (
  | DisplayInput
  | DisplayOutput
  | {
      id: string;
      address_hash: string;
      capacity?: string;
    }
) &
  Asset;

export type TxDetails = typeof tx.$inferInsert & {
  chain: Chain;
  timestamp: number;
  feeRate: string | number;

  position: number;
  inputValue: string;
  outputValue: string;
  isCoinBase: boolean;
  lockTime?: number;

  inputs: InputOutput[];
  outputs: InputOutput[];

  nativeTokenAmount: string;
  nativeTokenValue: string;
  totalValue: string;

  attributes:
    | Attributes
    | {
        transaction: TransactionDetail;
        vins: Vin[];
        vouts: Vout[];
      };
} & (
    | Attributes
    | {
        is_cellbase: boolean;
        tx_status: string;
        transaction_fee: string;
        block_number: number;
        bytes?: string;
        cycles?: number;
        version: number;
        size?: number;
      }
  );
