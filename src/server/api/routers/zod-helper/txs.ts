import { z } from 'zod';

export const assetInfo = z.object({
  id: z.string().optional().describe('Asset ID'),
  icon: z.string().optional().describe('Asset icon'),
  symbol: z.string().optional().describe('Asset symbol'),
  name: z.string().optional().describe('Asset name'),
  decimals: z.number().optional().describe('Asset decimal places'),
});

const baseInputOutput = z.object({
  id: z.string(),
  addressHash: z.string().optional().describe('Address hash'),
  assetId: z.string().describe('Asset ID'),
  icon: z.string().describe('Asset icon'),
  symbol: z.string().optional().describe('Asset symbol'),
  decimal: z.union([z.number(), z.string()]).describe('Asset decimal places').optional(),
  amount: z.string().describe('Asset amount'),
  amountUsd: z.string().describe('Asset amount in USD'),
});

export const ckbTxDetail = z.object({
  network: z.literal('ckb'),
  hash: z.string().describe('Transaction hash'),
  blockHash: z.string().nullable().optional().describe('Block hash'),
  committedTime: z.date().nullable().optional().describe('Block commit time'),
  submittedTime: z.date().describe('Transaction submission time'),
  feeRate: z.union([z.string(), z.number()]).describe('Transaction fee rate'),
  position: z.number().describe('Position index of the transaction within the block'),
  isCellBase: z.boolean().optional().describe('Whether it is a cellbase transaction'),
  lockTime: z.number().optional().describe('Transaction lock time'),
  txStatus: z.string().describe('Transaction status'),
  transactionFee: z.string().describe('Transaction fee'),
  blockNumber: z.string().describe('Block number'),
  cycles: z.number().optional().describe('Transaction cycles'),
  version: z.string().describe('Version'),
  relatedCapacityAmount: z.string().describe('Sum of Out put cell capacity amount'),
  relatedCapacityAmountUsd: z.string().describe('Sum of Out put cell capacity amount in USD'),
  inputAmountUsd: z.string().describe('Total input amount in USD'),
  outputAmountUsd: z.string().describe('Total output amount in USD'),
  totalAmountUsd: z.string().describe('max(inputAmountUsd, outputAmountUsd) in USD'),
  inputs: z.array(
    baseInputOutput.extend({
      capacityAmount: z.string().describe('Capacity amount'),
    }),
  ),
  outputs: z.array(
    baseInputOutput.extend({
      capacityAmount: z.string().describe('Capacity amount'),
      baseReward: z.string().optional().describe('Base reward amount'),
      commitReward: z.string().optional().describe('Commit reward amount'),
      proposalReward: z.string().optional().describe('Proposal reward amount'),
      secondaryReward: z.string().optional().describe('Secondary reward amount'),
    }),
  ),
});

export const btcTxDetail = z.object({
  network: z.literal('btc'),
  hash: z.string().describe('Transaction hash'),
  blockHash: z.string().nullable().optional().describe('Block hash'),
  committedTime: z.date().nullable().optional().describe('Block commit time'),
  submittedTime: z.date().describe('Transaction submission time'),
  feeRate: z.union([z.string(), z.number()]).describe('Transaction fee rate'),
  position: z.number().describe('Position index of the transaction within the block'),
  isCoinBase: z.boolean().optional().describe('Whether it is a coinbase transaction'),
  lockTime: z.number().optional().describe('Transaction lock time'),
  txStatus: z.string().describe('Transaction status'),
  transactionFee: z.string().describe('Transaction fee'),
  blockNumber: z.string().describe('Block number'),
  version: z.string().describe('Transaction version'),
  inputAmountUsd: z.string().describe('Total input amount in USD'),
  outputAmountUsd: z.string().describe('Total output amount in USD'),
  totalAmountUsd: z.string().describe('max(inputAmountUsd, outputAmountUsd) in USD'),
  inputs: z.array(
    baseInputOutput.extend({
      scriptsigAsm: z.string().optional().describe('Input script assembly'),
    }),
  ),
  outputs: z.array(
    baseInputOutput.extend({
      scriptPubkey: z.string().optional().describe('Script public key'),
      scriptPubkeyAddress: z.string().optional().describe('Script public key address'),
      scriptPubkeyAsm: z.string().optional().describe('Script public key assembly'),
      scriptPubkeyType: z.string().optional().describe('Script public key type'),
    }),
  ),
});

export const ckbRawTx = z.object({
  version: z.string().describe('Transaction version'),
  cell_deps: z.array(
    z.object({
      out_point: z.object({
        tx_hash: z.string().describe('Dependent transaction hash'),
        index: z.string().describe('Dependent transaction output index'),
      }),
      dep_type: z.enum(['code', 'dep_group']).describe('Dependency type'),
    }),
  ),
  header_deps: z.array(z.string()).describe('Header dependencies list'),
  inputs: z.array(
    z.object({
      previous_output: z.object({
        tx_hash: z.string().describe('Input transaction hash'),
        index: z.string().describe('Input transaction output index'),
      }),
      since: z.string().describe('Since value'),
    }),
  ),
  outputs: z.array(
    z.object({
      capacity: z.string().describe('Cell capacity'),
      lock: z.object({
        code_hash: z.string().describe('Lock script code hash'),
        hash_type: z.string().describe('Lock script hash type'),
        args: z.string().describe('Lock script arguments'),
      }),
      type: z
        .object({
          code_hash: z.string().describe('Type script code hash'),
          hash_type: z.string().describe('Type script hash type'),
          args: z.string().describe('Type script arguments'),
        })
        .optional()
        .nullable(),
    }),
  ),
  outputs_data: z.array(z.string()).describe('Output data list'),
  witnesses: z.array(z.string()).describe('Witness data list'),
});

export const btcRawTx = z.object({
  txid: z.string().describe('Transaction ID'),
  version: z.number().describe('Transaction version'),
  size: z.number().describe('Transaction size'),
  weight: z.number().describe('Transaction weight'),
  locktime: z.number().describe('Lock time'),
  status: z.object({
    confirmed: z.boolean().describe('Whether the transaction is confirmed'),
    block_height: z.number().describe('Block height'),
    block_hash: z.string().describe('Block hash'),
    block_time: z.number().describe('Block time'),
  }),
  fee: z.number().optional().describe('Transaction fee'),
  vin: z.array(
    z.object({
      txid: z.string().describe('Input transaction ID'),
      vout: z.number().describe('Input transaction output index'),
      is_coinbase: z.boolean().describe('Whether it is a coinbase transaction'),
      scriptsig_asm: z.string().describe('Input script assembly'),
      prevout: z
        .object({
          scriptpubkey: z.string().describe('Script public key'),
          scriptpubkey_address: z.string().describe('Script public key address'),
          scriptpubkey_asm: z.string().describe('Script public key assembly'),
          scriptpubkey_type: z.string().describe('Script public key type'),
          value: z.number().describe('Output value'),
        })
        .nullable()
        .optional(),
    }),
  ),
  vout: z.array(
    z.object({
      scriptpubkey: z.string().describe('Script public key'),
      scriptpubkey_address: z.string().optional().describe('Script public key address'),
      scriptpubkey_asm: z.string().describe('Script public key assembly'),
      scriptpubkey_type: z.string().describe('Script public key type'),
      value: z.number().describe('Output value'),
    }),
  ),
});
