import { type ComponentProps } from 'react';

import { NATIVE_ASSETS } from '~/constants';
import { type BlockDetail, type Network } from '~/server/api/routers/zod-helper';
import { api } from '~/trpc/og-client';

import { localeNumberString, shannonToCkb } from '../utils';

export const Overview = async ({
  network,
  blockHash,
  overview,
}: ComponentProps<'div'> & {
  network: Network;
  blockHash: string;
  overview: {
    txCount: string;
    txAmount: BlockDetail['txAmount'];
    txFee: BlockDetail['txFee'];
    token: BlockDetail['token'];
  };
}) => {
  const data = await api.v0.blocks.assetChangeList
    .query({
      blockHash,
      page: 1,
      pageSize: 6,
      orderDirection: 'desc',
    })
    .then((res) => res.result.filter((item) => item.asset?.id !== NATIVE_ASSETS.CKB));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div
        style={{
          display: 'flex',
          flexDirection: 'row',
          padding: '15px',
          background: '#171A1F',
          borderRadius: '12px',
          justifyContent: 'space-between',
          gap: '8px',
          color: '#999999',
        }}
      >
        <p
          style={{
            margin: 0,
            fontWeight: 600,
          }}
        >
          Total txns
          <span style={{ color: '#FAFAFA', fontWeight: 600, margin: '0 8px' }}>({overview.txCount})</span>
        </p>
        <span>|</span>
        <p
          style={{
            margin: 0,
          }}
        >
          Total amount
          <span style={{ color: '#FAFAFA', fontWeight: 600, margin: '0 8px' }}>
            {`${localeNumberString(shannonToCkb(overview.txAmount.amount.toString() ?? 0))} ${network.toUpperCase()}`}
          </span>
          {`($${localeNumberString(overview.txAmount.amountUsd ?? 0, 2)})`}
        </p>
        <span>|</span>
        <p
          style={{
            margin: 0,
          }}
        >
          Total fees
          <span style={{ color: '#FAFAFA', fontWeight: 600, margin: '0 8px' }}>
            {`${localeNumberString(shannonToCkb(overview.txFee.amount ?? 0))} ${network.toUpperCase()}`}
          </span>
          {`($${localeNumberString(overview.txFee.amountUsd ?? 0, 2)})`}
        </p>
      </div>

      {overview.token.count > 0 && data.length > 0 && (
        <div
          style={{
            display: 'flex',
            height: '165px',
            gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
            gap: '12px',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '12px',
              background: '#171A1F',
              borderRadius: '12px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#999' }}>{overview.token.count} Tokens</span>
            <span style={{ color: '#999' }}>
              $ {localeNumberString(shannonToCkb(overview.token.totalAmountUsd ?? 0), 2)}
            </span>
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              padding: '12px',
              background: '#171A1F',
              borderRadius: '12px',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <span style={{ color: '#999' }}>{data[0]?.asset?.symbol}</span>
          </div>
          {data.length > 1 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '12px',
                background: '#171A1F',
                borderRadius: '12px',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span style={{ color: '#999' }}>{data[1]?.asset?.symbol}</span>
            </div>
          )}
          {data.length > 2 && (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                gap: '8px',
              }}
            >
              {data.length > 2 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    padding: '12px',
                    background: '#171A1F',
                    borderRadius: '12px',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <span style={{ color: '#999' }}>{data[2]?.asset?.symbol}</span>
                </div>
              )}
              {data.length > 3 && (
                <div
                  style={{
                    display: 'flex',
                    flex: 1,
                    flexDirection: 'row',
                    gap: '8px',
                  }}
                >
                  {data.length > 3 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        padding: '12px',
                        background: '#171A1F',
                        borderRadius: '12px',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ color: '#999' }}>{data[3]?.asset?.symbol}</span>
                    </div>
                  )}
                  {data.length > 4 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        padding: '12px',
                        background: '#171A1F',
                        borderRadius: '12px',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ color: '#999' }}>{data[4]?.asset?.symbol}</span>
                    </div>
                  )}
                  {data.length > 5 && (
                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        flex: 1,
                        padding: '12px',
                        background: '#171A1F',
                        borderRadius: '12px',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <span style={{ color: '#999' }}>{data[5]?.asset?.symbol}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
