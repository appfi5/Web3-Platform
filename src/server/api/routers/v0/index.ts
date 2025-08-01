import { activityRouter } from './activity';
import { addressRouter } from './address';
import { assetRouter } from './asset';
import { blocksRouter } from './blocks';
import { feedRouter } from './feed';
import { quoteRouter } from './quote';
import { searchRouter } from './search';
import { statisticsRouter } from './statistics';
import { txsRouter } from './txs';

export const v0 = {
  asset: assetRouter,
  activity: activityRouter,
  feed: feedRouter,
  blocks: blocksRouter,
  search: searchRouter,
  quote: quoteRouter,
  txs: txsRouter,
  address: addressRouter,
  statistics: statisticsRouter,
};
