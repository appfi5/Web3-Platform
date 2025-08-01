import { SearchResultType } from '~/server/api/routers/zod-helper/search';

import { type SearchData } from '../hooks/useSearchData';

export const getLink = (triggerData: SearchData) => {
  switch (triggerData.type) {
    case SearchResultType.Address:
      return `/address/${triggerData.property.uid}`;
    case SearchResultType.Block:
      return `/block/${triggerData.property.network.toLowerCase()}/${triggerData.property.number}`;
    case SearchResultType.Transaction:
      return `/transaction/${triggerData.property.hash}`;
    case SearchResultType.Chart:
      return triggerData.property.link ?? '/charts';
    case SearchResultType.Token:
      return `/asset/${triggerData.property.uid}`;
    case SearchResultType.Chain:
    case SearchResultType.TokenList:
      return '/home';
    default:
      break;
  }
};
