import React, { type FC, useCallback } from 'react';

import { Card } from '~/components/ui/card';
import { Link } from '~/i18n/navigation';
import { SearchResultType } from '~/server/api/routers/zod-helper/search';

import { type SearchData } from '../hooks/useSearchData';
import { getLink } from '../utils/getLink';
import HighLightWords from './HighLightWords';

const SearchResultItemCard: FC<{
  idx: number;
  selectedSearchResultIndex: number | undefined;
  handleSelectSearchResult: (v: SearchData) => void;
  searchResultItem: SearchData;
  searchWords: string;
}> = ({ idx, selectedSearchResultIndex, handleSelectSearchResult, searchResultItem, searchWords }) => {
  const renderDescription = useCallback(() => {
    switch (searchResultItem.type) {
      case SearchResultType.TokenList:
        return 'Show the XUDT Token List';
      default:
        return (
          <HighLightWords
            searchWords={searchResultItem.type === SearchResultType.Block ? `#${searchWords}` : searchWords}
            trunk={
              searchResultItem.type === SearchResultType.Address ||
              searchResultItem.type === SearchResultType.Transaction
            }
            words={searchResultItem.matched}
          />
        );
    }
  }, [searchResultItem.type, searchWords, searchResultItem.matched]);

  return (
    <Card
      className={`bg-card rounded-xl p-3 ${idx === selectedSearchResultIndex ? 'border-primary' : ''} hover:border-primary`}
      onClick={() => handleSelectSearchResult(searchResultItem)}
    >
      <Link href={getLink(searchResultItem) ?? '/home'}>
        <div className="text-sm">{renderDescription()}</div>
        <div className="flex flex-wrap gap-2">
          {searchResultItem.tags.map((tag, index) => (
            <span className="text-xs text-foreground bg-accent p-1 rounded-sm" key={index}>
              {tag}
            </span>
          ))}
        </div>
      </Link>
    </Card>
  );
};

export default SearchResultItemCard;
