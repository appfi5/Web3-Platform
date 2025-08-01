import React, { type ChangeEvent, type FC, type FormEvent, useCallback, useRef } from 'react';

import SearchSvg from '../icon/search.svg';

const LEAST_SEARCH_WORDS_LEN = 2;

const SearchInput: FC<{
  onSelectSearchResult: () => void;
  onChangeSearchWords: (value: string) => void;
  searchWords: string;
  loadSearchResult: () => Promise<unknown>;
}> = ({ onSelectSearchResult, onChangeSearchWords, searchWords, loadSearchResult }) => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout>>();

  const handleSubmit = useCallback(
    (e: FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      onSelectSearchResult();
    },
    [onSelectSearchResult],
  );
  const handleChangeSearchWords = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      onChangeSearchWords(value);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      const trimedSearchWords = value.trim();
      if (
        trimedSearchWords.length >= LEAST_SEARCH_WORDS_LEN ||
        (trimedSearchWords && Number.isInteger(+trimedSearchWords))
      ) {
        timeoutRef.current = setTimeout(() => {
          // search with current search words
          void loadSearchResult();
        }, 1_000);
      }
    },
    [loadSearchResult],
  );

  return (
    <form className="relative flex items-center gap-2 py-4 border-b-[1px] border-[#23272C]" onSubmit={handleSubmit}>
      <SearchSvg className="size-4" />
      <input
        className="text-sm text-foreground placeholder:text-secondary bg-transparent outline-none w-full"
        onChange={handleChangeSearchWords}
        placeholder="Search for anything here"
        value={searchWords}
      />
      <button className="hidden" type="submit">
        submit
      </button>
    </form>
  );
};

export default SearchInput;
