import { ImageResponse } from 'next/og';

import { type Network } from '~/server/api/routers/zod-helper';
import { api } from '~/trpc/og-client';

import StatusOKIcon from '../../components/status-ok.svg';
import { dayjs, localeNumberString, shannonToCkb, trunkLongStr } from '../utils';
import { Addresses } from './Addresses';
import { Assets } from './Assets';
import { Overview } from './Overview';

export const runtime = 'edge';

export const alt = 'MagickBase';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image({
  params: { network, block, page },
}: {
  params: { locale: string; network: Network; block: string; page: string };
}) {
  const blockInfo = await api.v0.blocks.detail.query({
    network,
    hashOrHeight: block,
  });

  const montserratRegular = fetch(new URL('public/font/Montserrat-Regular.ttf', import.meta.url)).then((res) =>
    res.arrayBuffer(),
  );
  const montserratMedium = fetch(new URL('public/font/Montserrat-Medium.ttf', import.meta.url)).then((res) =>
    res.arrayBuffer(),
  );
  const montserratBold = fetch(new URL('public/font/Montserrat-Bold.ttf', import.meta.url)).then((res) =>
    res.arrayBuffer(),
  );

  const bgBuffer = await fetch(new URL('public/seo/bg.png', import.meta.url)).then((res) => res.arrayBuffer());
  const bgSrc = `data:image/png;base64,${Buffer.from(bgBuffer).toString('base64')}`;
  const logoBuffer = await fetch(new URL('public/seo/logo.png', import.meta.url)).then((res) => res.arrayBuffer());
  const logoSrc = `data:image/png;base64,${Buffer.from(logoBuffer).toString('base64')}`;
  const left = [
    {
      content: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <StatusOKIcon />
          <span>Confirmed {dayjs(blockInfo?.time).fromNow()}</span>
        </div>
      ),
      title: 'Status',
    },
    { content: <span>{dayjs(blockInfo?.time).format('YYYY-MM-DD HH:mm:ss')}</span>, title: 'Time' },
    { content: <span>{localeNumberString(blockInfo?.weight ?? 0)}</span>, title: 'Weight' },
    { content: <span>{localeNumberString(blockInfo?.size ?? 0)} Bytes</span>, title: 'Size' },
  ];

  const right = [
    { content: <span>{trunkLongStr(blockInfo?.miner, 10)}</span>, title: 'Miner' },
    { content: <span>{blockInfo?.difficulty}</span>, title: 'Difficulty' },
    {
      content: (
        <span>{`${localeNumberString(shannonToCkb(blockInfo?.blockReward?.amount ?? 0))} ${network.toUpperCase()} ($${localeNumberString(blockInfo?.blockReward?.amountUsd ?? 0, 2)})`}</span>
      ),
      title: 'Block Reward',
    },
    {
      content: (
        <span>
          {`${localeNumberString(shannonToCkb(blockInfo?.txFee?.amount ?? 0))} ${network.toUpperCase()} ($${localeNumberString(blockInfo?.txFee?.amountUsd ?? 0, 2)})`}
        </span>
      ),
      title: 'Fee Reward',
    },
  ];

  let content: JSX.Element | null = null;
  switch (page) {
    case 'addresses':
      content = await Addresses({ blockHash: blockInfo?.hash ?? '' });
      break;
    case 'assets':
      content = await Assets({ blockHash: blockInfo?.hash ?? '' });
      break;
    case 'overview':
      content = await Overview({
        network,
        blockHash: blockInfo?.hash ?? '',
        overview: {
          token: blockInfo?.token ?? { count: 0, totalAmountUsd: '0' },
          txCount: blockInfo?.txCount ?? '0',
          txAmount: blockInfo?.txAmount ?? { amount: '0', amountUsd: '0' },
          txFee: blockInfo?.txFee ?? { amount: '0', amountUsd: '0' },
        },
      });
      break;
  }

  return new ImageResponse(
    (
      <div
        style={{
          background: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
          color: '#FAFAFA',
          fontFamily: 'MontserratRegular',
        }}
      >
        <img alt="bg" height="100%" src={bgSrc} width="100%" />
        <div
          style={{
            position: 'absolute',
            top: '24px',
            left: '24px',
            right: '24px',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#101214',
            border: '1px solid #222222',
            borderRadius: '16px',
            padding: '16px',
            fontSize: '14px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '8px',
              justifyContent: 'center',
              alignItems: 'center',
              backgroundColor: '#101214',
              height: '26px',
            }}
          >
            <div
              style={{
                display: 'flex',
                position: 'absolute',
                gap: '4px',
                left: '0',
              }}
            >
              <img alt="logo" height={40} src={logoSrc} width={40} />
              <p
                style={{
                  fontSize: '12px',
                  fontFamily: 'MontserratBold',
                }}
              >
                Magickbase
              </p>
            </div>
            <div
              style={{
                display: 'flex',
                gap: '4px',
                alignItems: 'center',
                fontFamily: 'MontserratMedium',
              }}
            >
              {network === 'btc' ? 'Bitcoin' : network.toUpperCase()} Block{' '}
              {localeNumberString(blockInfo?.height || '')}
            </div>
            <div
              style={{
                display: 'flex',
                fontSize: '12px',
                padding: '4px 12px',
                position: 'absolute',
                right: '0',
                background: '#171A1F',
                borderRadius: '2px',
              }}
            >
              {process.env.NEXT_PUBLIC_IS_MAINNET === 'true' ? 'Mainnet' : 'Testnet'}
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flex: 1,
                padding: '12px 12px',
                background: '#171A1F',
                borderRadius: '12px',
                gap: '8px',
              }}
            >
              <span
                style={{
                  fontSize: '16px',
                  lineHeight: '20px',
                  fontFamily: 'MontserratMedium',
                  margin: 0,
                }}
              >
                Hash
              </span>
              <span
                style={{
                  color: '#999999',
                  lineHeight: '20px',
                }}
              >
                {blockInfo?.hash}
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'row',
                flex: 1,
                gap: '8px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  padding: '12px',
                  background: '#171A1F',
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '40%',
                    }}
                  >
                    {left.map(({ title }) => (
                      <p
                        key={title}
                        style={{
                          margin: '16px 0 0',
                          color: '#999999',
                          height: '18px',
                        }}
                      >
                        {title}
                      </p>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '40%',
                    }}
                  >
                    {left.map(({ content }, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          marginTop: '16px',
                          height: '18px',
                        }}
                      >
                        {content}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  flex: 1,
                  padding: '12px',
                  background: '#171A1F',
                  borderRadius: '12px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '40%',
                    }}
                  >
                    {right.map(({ title }) => (
                      <p
                        key={title}
                        style={{
                          margin: '16px 0 0',
                          color: '#999999',
                          height: '18px',
                        }}
                      >
                        {title}
                      </p>
                    ))}
                  </div>
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      width: '40%',
                    }}
                  >
                    {right.map(({ content }, index) => (
                      <div
                        key={index}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          marginTop: '16px',
                          height: '18px',
                        }}
                      >
                        {content}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              width: '100%',
              height: '1px',
              backgroundColor: '#333',
              margin: '24px 0 0 0',
            }}
          />
          {content}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        {
          name: 'MontserratRegular',
          data: await montserratRegular,
          style: 'normal',
          weight: 400,
        },
        {
          name: 'MontserratMedium',
          data: await montserratMedium,
          style: 'normal',
          weight: 500,
        },
        {
          name: 'MontserratBold',
          data: await montserratBold,
          style: 'normal',
          weight: 600,
        },
      ],
    },
  );
}
