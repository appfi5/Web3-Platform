import { env } from '~/env';

type CoinMarketResponse<D> = {
  data: D;
  status: {
    timestamp: string;
    error_code: number;
    error_message: string;
    elapsed: number;
    credit_count: number;
    notice: string;
  };
};

function coinmarketAPIWrapper<P extends object, R>(url: string) {
  return async (params: P) => {
    const result = await fetch(
      `${env.COINMARKET_API_PREFIX}${url}?${Object.entries(params)
        .map((v) => `${v[0]}=${v[1]}`)
        .join('&')}`,
      {
        method: 'GET',
        headers: env.COINMARKET_API_KEY
          ? {
              'X-CMC_PRO_API_KEY': env.COINMARKET_API_KEY,
            }
          : {},
      },
    );
    if (!result.ok) throw new Error(`response with status ${result.status}, ${result.statusText}`);
    return (await result.json()) as CoinMarketResponse<R>;
  };
}

export const latestQuotes = coinmarketAPIWrapper<
  { id: string; aux?: string },
  Record<
    string,
    {
      id: number;
      name: string;
      symbol: string;
      slug: string;
      is_active: number;
      is_fiat: number;
      circulating_supply: number;
      total_supply: number;
      max_supply: number | null;
      date_added: string;
      num_market_pairs: number;
      cmc_rank: number;
      last_updated: string;
      tags: string[];
      platform: {
        id: number;
        name: string;
        symbol: string;
        slug: string;
        token_address: string;
      } | null;
      self_reported_circulating_supply: number;
      self_reported_market_cap: number;
      quote: Record<
        string,
        {
          price?: number;
          volume_24h: number;
          volume_change_24h: number;
          percent_change_1h: number;
          percent_change_24h: number;
          percent_change_7d: number;
          percent_change_30d: number;
          market_cap?: number;
          market_cap_dominance: number;
          fully_diluted_market_cap: number;
          last_updated: string;
        }
      >;
    }
  >
>('/v2/cryptocurrency/quotes/latest');
