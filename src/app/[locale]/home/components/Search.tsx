'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Input } from '~/components/ui/input';
import { ToggleGroup, ToggleGroupItem } from '~/components/ui/toggle-group';
import { api } from '~/trpc/react';
import { NATIVE_ASSETS } from '~/utils/const';

export type FilterParams = {
  assetId?: string;
  tokens?: string[];
  assetTags?: string[];
  keywords?: string;
};

const coinOptions = [
  { label: 'BTC', value: NATIVE_ASSETS.BTC },
  { label: 'CKB', value: NATIVE_ASSETS.CKB },
];

const toggleGroupItemClassName =
  'font-normal bg-border h-[21px] text-[14px] hover:bg-border hover:text-foreground data-[state=on]:bg-border data-[state=on]:text-primary data-[state=on]:border-primary border-[1px]';

export default function Search({ onChange }: { onChange: ({ assetId }: FilterParams) => void }) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const ref = useRef<HTMLDivElement>(null);
  const [inputVal, setInputVal] = useState('');

  const [coins, setCoins] = useState<string[]>([]);
  const [hotTokens, setHotTokens] = useState<string[]>([]);
  const [hotCategorys, setHotCategorys] = useState<string[]>([]);

  const { data: hotTokenList } = api.v0.feed.hotAssets.useQuery();
  const { data: hotCategoryList } = api.v0.feed.hotAssetTags.useQuery();

  const hotTokenOptions = useMemo(() => {
    return (hotTokenList ?? []).map((item) => ({ label: item.name, value: item.id }));
  }, [hotTokenList]);

  const categoryOptions = useMemo(() => {
    return (hotCategoryList ?? []).map((item) => ({ label: item.label, value: item.label }));
  }, [hotCategoryList]);

  const handleApply = useCallback(() => {
    const params: FilterParams = {};
    params.assetId = coins.length === 1 ? coins[0] : '';
    params.tokens = hotTokens;
    params.assetTags = hotCategorys;
    params.keywords = inputVal;
    onChange(params);
  }, [coins, hotTokens, hotCategorys, inputVal, onChange]);

  const onDocumentClick = useCallback((e: MouseEvent) => {
    if (e.target instanceof Node && !ref.current?.contains(e.target)) {
      setIsOpen(false);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('click', onDocumentClick, false);
    return () => document.removeEventListener('click', onDocumentClick, false);
  }, [onDocumentClick]);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter') {
      setIsOpen(false);
      handleApply();
    }
  };

  useEffect(() => {
    handleApply();
  }, [coins, hotTokens, hotCategorys]);

  return (
    <div className="relative" onKeyDown={handleKeyDown} ref={ref}>
      <div className="relative w-[120px]">
        <Image alt="search" className="absolute top-[6px] left-3" height={20} src="/img/search.svg" width={20} />
        <Input
          className="pl-[34px] rounded-[40px] h-[32px] text-[14px] bg-transparent focus-visible:ring-offset-0"
          onChange={(e) => setInputVal(e.target.value)}
          onFocus={() => setIsOpen(true)}
          value={inputVal}
        />
      </div>

      {isOpen && (
        <div className="top-10 right-0 p-4 absolute min-w-[300px] bg-[#101215] z-10 rounded-[16px] border-[1px] border-border">
          <p className="pt-[16px] text-[14px] text-secondary font-medium">Coin</p>
          <ToggleGroup className="justify-start mt-[10px]" onValueChange={setCoins} type="multiple" value={coins}>
            {coinOptions.map((item) => (
              <ToggleGroupItem className={toggleGroupItemClassName} key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <p className="pt-[16px] text-[14px] text-secondary font-medium">Hot Token</p>
          <ToggleGroup
            className="justify-start mt-[10px]"
            onValueChange={setHotTokens}
            type="multiple"
            value={hotTokens}
          >
            {hotTokenOptions.map((item) => (
              <ToggleGroupItem className={toggleGroupItemClassName} key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>

          <p className="pt-[16px] text-[14px] text-secondary font-medium">Hot Category</p>
          <ToggleGroup
            className="justify-start mt-[10px]"
            onValueChange={setHotCategorys}
            type="multiple"
            value={hotCategorys}
          >
            {categoryOptions.map((item) => (
              <ToggleGroupItem className={toggleGroupItemClassName} key={item.value} value={item.value}>
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      )}
    </div>
  );
}
