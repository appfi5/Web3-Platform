import React, { type FC } from 'react';

import AssetInfo from '~/app/[locale]/home/components/AssetInfo';
import { NATIVE_ASSETS } from '~/constants';
import { SearchResultType } from '~/server/api/routers/zod-helper/search';

import { type SearchData } from '../hooks/useSearchData';
import Address from './Address';
import Block from './Block';
import Chart from './Chart';
import Token from './Token';
import TokenList from './TokenList';
import Tx from './Tx';

const SearchResultPreview: FC<{
  selectedSearchResultItem: SearchData | undefined;
}> = ({ selectedSearchResultItem }) => {
  return (
    <div className="md:flex-[3] shrink-0 w-full md:w-unset pt-3">
      {selectedSearchResultItem?.type === SearchResultType.Block && (
        <Block
          blockNumber={selectedSearchResultItem.property.number}
          network={selectedSearchResultItem.property.network}
          hash={selectedSearchResultItem.property.hash}
        />
      )}
      {selectedSearchResultItem?.type === SearchResultType.Transaction && (
        <Tx hash={selectedSearchResultItem.property.hash} />
      )}
      {selectedSearchResultItem?.type === SearchResultType.Address && (
        <Address address={selectedSearchResultItem.property.uid} />
      )}
      {selectedSearchResultItem?.type === SearchResultType.TokenList && <TokenList />}
      {selectedSearchResultItem?.type === SearchResultType.BitcoinStatisticsStatus && (
        <AssetInfo assetId={NATIVE_ASSETS.BTC} network="btc" />
      )}
      {selectedSearchResultItem?.type === SearchResultType.Chart && (
        <Chart chartName={selectedSearchResultItem.property.name} />
      )}
      {selectedSearchResultItem?.type === SearchResultType.Token && (
        <Token id={selectedSearchResultItem.property.uid} symbol={selectedSearchResultItem.property.symbol ?? ''} />
      )}
    </div>
  );
};

export default SearchResultPreview;
