'use client';

import { useCallback, useEffect, useState } from 'react';

import { useIsMobile } from '~/hooks/useIsMobile';
import { useRouter } from '~/i18n/navigation';
import { cn } from '~/lib/utils';

import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../ui/dialog';
import KeyboardShortcutsTutorial from './components/KeyboardShortcutsTutorial';
import SearchInput from './components/SearchInput';
import SearchResultItemCard from './components/SearchResultItemCard';
import SearchResultPreview from './components/SearchResultPreview';
import SearchTrigger from './components/SearchTrigger';
import { type SearchData, useSearchData } from './hooks/useSearchData';
import { getLink } from './utils/getLink';

export default function Search() {
  const isMobileStyle = useIsMobile();
  const [open, setOpen] = useState(false);
  const {
    selectedSearchResultItem,
    searchData,
    refetch,
    isLoading,
    searchWords,
    setSearchWords,
    selectedSearchResultIndex,
    setSelectedSearchResultIndex,
  } = useSearchData();
  const router = useRouter();

  const handleSelectSearchResult = useCallback(
    (result: SearchData | undefined) => {
      if (!result || !open) return;
      const linkUrl = getLink(result);
      if (linkUrl) {
        setOpen(false);
        router.push(linkUrl);
      }
    },
    [router, open],
  );
  const handleSelectCurrentSearchResult = useCallback(() => {
    handleSelectSearchResult(selectedSearchResultItem);
  }, [handleSelectSearchResult, selectedSearchResultItem]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        return;
      }
      switch (e.key) {
        case 'k':
        case 'K':
          if (e.metaKey || e.ctrlKey) {
            e.preventDefault();
            setOpen((open) => !open);
          }
          break;
        case 'ArrowUp':
          setSelectedSearchResultIndex((v) => (v && v >= 1 ? v - 1 : v));
          break;
        case 'ArrowDown':
          setSelectedSearchResultIndex((v) => (v !== undefined && v + 1 < (searchData?.length ?? 0) ? v + 1 : v));
          break;
        case 'Enter':
          handleSelectCurrentSearchResult();
        default:
          break;
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, [searchData, handleSelectCurrentSearchResult, selectedSearchResultItem]);
  useEffect(() => {
    if (searchData?.length) {
      setSelectedSearchResultIndex(0);
    }
  }, [searchData]);

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <SearchTrigger isMobileStyle={!!isMobileStyle} />
      <DialogContent
        className={cn(
          'bg-background pt-0 px-4 pb-4 border-border overflow-hidden rounded-2xl',
          'w-[90vw] md:w-[80vw] md:max-w-[800px] h-[80vh] md:max-h-[534px]',
          '2xl:w-[80vw] 2xl:max-w-[1200px] 2xl:h-[80vh] 2xl:max-h-[800px]',
        )}
        hiddenClose
      >
        <DialogTitle className="hidden">Search</DialogTitle>
        <DialogDescription className="hidden">Search</DialogDescription>
        <div className="flex flex-col w-full h-full overflow-hidden">
          <SearchInput
            loadSearchResult={refetch}
            onChangeSearchWords={setSearchWords}
            onSelectSearchResult={handleSelectCurrentSearchResult}
            searchWords={searchWords}
          />
          <div className="flex-1 flex flex-col md:flex-row gap-2 overflow-y-auto md:overflow-hidden">
            <div className="md:flex-[2] shrink-0 w-full md:w-unset flex flex-col overflow-hidden">
              <div className="flex-1 py-3 flex flex-col overflow-hidden">
                <div className="flex flex-col gap-2 grow overflow-y-auto">
                  {searchData?.map((v, idx) => (
                    <SearchResultItemCard
                      handleSelectSearchResult={handleSelectSearchResult}
                      idx={idx}
                      key={idx}
                      searchResultItem={v}
                      searchWords={searchWords}
                      selectedSearchResultIndex={selectedSearchResultIndex}
                    />
                  ))}
                </div>
              </div>
              {!isLoading && !isMobileStyle && <KeyboardShortcutsTutorial />}
            </div>
            <SearchResultPreview selectedSearchResultItem={selectedSearchResultItem} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
