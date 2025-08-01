import Fuse from 'fuse.js';
import { useEffect, useMemo, useState } from 'react';

import { chartMenus } from '~/app/[locale]/charts/ChartsTab';
import { SearchResultType } from '~/server/api/routers/zod-helper/search';
import { api, type RouterOutputs } from '~/trpc/react';

export type SearchData =
  | NonNullable<RouterOutputs['v0']['search']['query']>[number]
  | {
      type: typeof SearchResultType.Chart;
      property: {
        name: string;
        link: string;
      };
      tags: string[];
      matched: string;
    }
  | {
      type: typeof SearchResultType.TokenList;
      property: {
        name?: string;
      };
      tags: string[];
      matched: string;
    }
  | {
      type: typeof SearchResultType.BitcoinStatisticsStatus;
      property: {
        name?: string;
      };
      tags: string[];
      matched: string;
    };

const fuse = new Fuse(chartMenus.map((i) => i.charts).flat(), { keys: ['title'], threshold: 0, ignoreLocation: true });

export const useSearchData = () => {
  const [selectedSearchResultIndex, setSelectedSearchResultIndex] = useState<number | undefined>();
  const [searchWords, setSearchWords] = useState('');
  const [searchData, setSearchData] = useState<SearchData[]>([]);
  const [chartResult, setChartResult] = useState<SearchData[]>([]);
  const {
    data: queryResult,
    refetch,
    isLoading,
  } = api.v0.search.query.useQuery({ q: searchWords }, { enabled: false });
  const { data: ckbLatestMarket } = api.v0.blocks.latest.useQuery(
    { network: 'ckb' },
    {
      refetchInterval: 5000,
    },
  );
  const [defaultSearchData, setDefaultSearchData] = useState<SearchData[]>([
    {
      type: SearchResultType.Chart,
      property: { name: 'Balance Distribution', link: '/charts/balance-distribution' },
      tags: ['Chart'],
      matched: 'Show the chart about CKB Distribution',
    },
    {
      type: SearchResultType.TokenList,
      property: {},
      tags: ['Token List', 'CKB'],
      matched: 'Show the XUDT Token List',
    },
    {
      type: SearchResultType.Block,
      property: {
        number: 0,
        hash: '',
        network: 'ckb',
      },
      tags: [],
      matched: 'Show the Latest Block',
    },
    {
      type: SearchResultType.BitcoinStatisticsStatus,
      property: {},
      tags: [],
      matched: 'Show the Bitcoin Statistic Status',
    },
  ]);

  useEffect(() => {
    if (ckbLatestMarket) {
      setDefaultSearchData((prev) => {
        const newData = [...prev];
        const block = newData.find((item) => item.type === SearchResultType.Block);
        if (block) {
          block.property = {
            number: ckbLatestMarket.height,
            hash: '',
            network: 'ckb',
          };
          block.tags = ['Block', 'CKB'];
        }
        return newData;
      });
    }
  }, [ckbLatestMarket]);
  useEffect(() => {
    if (!searchWords || /^\s*$/.test(searchWords)) {
      setChartResult([]);
      return;
    }
    const chartResult = fuse.search(searchWords);
    setChartResult(
      chartResult.map((i) => ({
        type: SearchResultType.Chart,
        property: { name: i.item.title, link: i.item.link },
        tags: ['Chart'],
        matched: i.item.title,
      })),
    );
  }, [searchWords]);
  useEffect(() => {
    if ((queryResult && queryResult.length > 0) || !/^\s*$/.test(searchWords) || chartResult.length > 0) {
      setSearchData([...chartResult, ...(queryResult ?? [])]);
      setSelectedSearchResultIndex(0);
    } else {
      setSearchData(defaultSearchData);
      setSelectedSearchResultIndex(0);
    }
  }, [queryResult, searchWords, chartResult]);

  const selectedSearchResultItem = useMemo(
    () => (selectedSearchResultIndex !== undefined ? searchData?.[selectedSearchResultIndex] : undefined),
    [selectedSearchResultIndex, searchData],
  );

  return {
    selectedSearchResultItem,
    searchData,
    refetch,
    isLoading,
    searchWords,
    setSearchWords,
    selectedSearchResultIndex,
    setSelectedSearchResultIndex,
  };
};
