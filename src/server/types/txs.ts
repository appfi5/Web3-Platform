import { type z } from 'zod';

import { type assetInfo, type btcTxDetail, type ckbTxDetail } from '~/server/api/routers/zod-helper/txs';

export type CkbTxDetail = z.infer<typeof ckbTxDetail> & { assetInfo: z.infer<typeof assetInfo> };
export type BtcTxDetail = z.infer<typeof btcTxDetail> & { assetInfo: z.infer<typeof assetInfo> };
