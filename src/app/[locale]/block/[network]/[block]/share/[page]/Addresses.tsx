import { type ComponentProps } from 'react';

import { api } from '~/trpc/og-client';

import { localeNumberString, shannonToCkb, trunkLongStr } from '../utils';

export const Addresses = async ({
  blockHash,
}: ComponentProps<'div'> & {
  blockHash: string;
}) => {
  const data = await api.v0.blocks.addressChangeList.query({
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
      <span style={{ color: '#999' }}>Top 5 Addresses</span>
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
            <div key={index} style={{ display: 'flex', padding: '4px 8px', height: '28px', alignItems: 'center' }}>
              {index + 1}
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <span style={{ color: '#999' }}>Address</span>
          {data.result.map((item, index) => (
            <div
              key={index}
              style={{ display: 'flex', padding: '4px 8px', height: '28px', alignItems: 'center', color: '#E5FF5A' }}
            >
              {trunkLongStr(item.address, 10)}
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
                height: '28px',
                alignItems: 'center',
              }}
            >
              <span style={{ color: '#E5FF5A' }}>
                {`${`${item.amount >= 0n ? '+' : '-'} ${localeNumberString(shannonToCkb((item.amount > 0n ? item.amount : -item.amount).toString()), 2)}`} `}
              </span>
              <span style={{ color: '#17B830' }}>{`+ ${item.sendTokens} Tokens`}</span>
              <span style={{ color: '#FF2929' }}>{`- ${item.receiveTokens} Tokens`}</span>
            </div>
          ))}
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
          <span style={{ color: '#999' }}>Change</span>
          {data.result.map((item, index) => {
            const isNegative = item.amountUsd?.toString().startsWith('-');
            const amountUsd = Math.abs(item.amountUsd ?? 0);
            const color = isNegative ? '#FF2929' : '#17B830';
            return (
              <div
                key={index}
                style={{ display: 'flex', padding: '4px 8px', height: '28px', alignItems: 'center', color }}
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
