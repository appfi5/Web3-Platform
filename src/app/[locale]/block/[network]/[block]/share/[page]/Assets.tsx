import { type ComponentProps } from 'react';

import AssetIcon from '~/components/search/components/AssetIcon';
import { api } from '~/trpc/og-client';

import { localeNumberString, shannonToCkb } from '../utils';

export const Assets = async ({
  blockHash,
}: ComponentProps<'div'> & {
  blockHash: string;
}) => {
  const data = await api.v0.blocks.assetChangeList.query({
    blockHash,
    page: 1,
    pageSize: 5,
    orderDirection: 'desc',
  });

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        flex: 1,
        padding: '8px 12px',
        background: '#171A1F',
        borderRadius: '12px',
        gap: '8px',
      }}
    >
      <span style={{ color: '#999' }}>Top 5 Tokens</span>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'space-between',
          padding: '12px 0',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: '#999' }}>No.</span>
          {data.result.map((item, index) => (
            <div key={index} style={{ display: 'flex', padding: '4px 8px', height: '36px', alignItems: 'center' }}>
              {index + 1}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: '#999' }}>Name</span>
          {data.result.map((item, index) => (
            <div
              key={index}
              style={{ display: 'flex', padding: '4px 8px', height: '36px', alignItems: 'center', color: '#E5FF5A' }}
            >
              <AssetIcon icon={item.asset?.icon} symbol={item.asset?.symbol ?? ''} />
              {/* {trunkLongStr(item.address, 10)} */}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: '#999' }}>Asset</span>
          {data.result.map((item, index) => (
            <div
              key={index}
              style={{
                padding: '4px 8px',
                display: 'flex',
                flexDirection: 'row',
                gap: '16px',
                height: '36px',
                alignItems: 'center',
              }}
            >
              {item.tags.map((tag) => (
                <div
                  className="mr-2 bg-accent rounded-sm px-2 py-1 text-sm"
                  key={tag}
                  style={{
                    color: '#fafafa',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '4px',
                    backgroundColor: '#23272C',
                    padding: '2px 8px',
                  }}
                >
                  {tag}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '4px 8px',
          }}
        >
          <span style={{ color: '#999' }}>Amount</span>
          {data.result.map((item, index) => {
            const isNegative = item.amount < 0n;
            const amount = isNegative ? -item.amount : item.amount;
            const color = isNegative ? '#FF2929' : '#17B830';
            return (
              <div
                key={index}
                style={{ display: 'flex', padding: '4px 8px', height: '36px', alignItems: 'center', color }}
              >
                {isNegative ? '-' : '+'} {localeNumberString(shannonToCkb(amount.toString()), 8)}
              </div>
            );
          })}
        </div>

        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '4px 8px',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#999' }}>Volume</span>
          {data.result.map((item, index) => {
            const isNegative = item.amountUsd && item.amountUsd < 0;
            const amountUsd = Math.abs(item.amountUsd ?? 0);
            const color = isNegative ? '#FF2929' : '#17B830';
            return (
              <div
                key={index}
                style={{ display: 'flex', padding: '4px 8px', height: '36px', alignItems: 'center', color }}
              >
                {/* <span style={{ padding: '4px 8px', lineHeight: '17px', color }} key={index}> */}
                {isNegative ? '-' : '+'} $ {localeNumberString(amountUsd, 2)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
