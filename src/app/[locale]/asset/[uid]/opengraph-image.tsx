import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

import { api } from '~/trpc/og-client';
import { cssstring } from '~/utils/cssstring';
import { fetchImgByUrl, localeNumberString } from '~/utils/og';

import { formatCurrency, formatNumber } from '../format';

export const runtime = 'edge';

export const alt = 'MagickBase';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params: { locale, uid } }: { params: { locale: string; uid: string } }) {
  const t = await getTranslations({ locale });

  const assetInfo = await api.v0.asset.detail.query({ assetId: uid });
  const priceData = await api.v0.quote.last7DayPrice.query({ assetId: uid });
  const marketData = await api.v0.quote.latest.query({ assetId: uid });

  const montserratRegular = fetch(new URL('../../../../../public/font/Montserrat-Regular.ttf', import.meta.url)).then(
    (res) => res.arrayBuffer(),
  );
  const montserratBold = fetch(new URL('../../../../../public/font/Montserrat-Bold.ttf', import.meta.url)).then((res) =>
    res.arrayBuffer(),
  );

  const bgSrc = await fetchImgByUrl(new URL('../../../../../public/seo/bg.png', import.meta.url));
  const logoSrc = await fetchImgByUrl(new URL('../../../../../public/seo/logo.png', import.meta.url));
  const ckbSrc = await fetchImgByUrl(new URL('../../../../../public/seo/ckb.png', import.meta.url));
  const upSrc = await fetchImgByUrl(new URL('../../../../../public/seo/up.png', import.meta.url));
  const downSrc = await fetchImgByUrl(new URL('../../../../../public/seo/down.png', import.meta.url));

  const chartURL =
    'https://quickchart.io/chart?width=1060&height=320&chart=' +
    encodeURIComponent(
      JSON.stringify({
        type: 'line',
        data: {
          labels: priceData.map((item) => item.time),
          datasets: [
            {
              label: '',
              data: priceData.map((item) => item.price),
              borderColor: '#E5FF5A',
              borderWidth: 1,
              fill: true,
              backgroundColor: 'rgba(229, 255, 90, 0.1)',
              tension: 0.4,
              pointRadius: 0,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: {
            legend: false,
          },
          scales: {
            xAxes: [
              {
                display: false,
              },
            ],
            yAxes: [
              {
                display: false,
              },
            ],
          },
        },
      }),
    );

  if (!assetInfo || !marketData) return null;

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
              height: '48px',
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
              }}
            >
              <img height={28} src={assetInfo.symbol === 'CKB' ? ckbSrc : assetInfo.icon || ''} width={28} />
              <span
                style={{
                  fontSize: '16px',
                  fontFamily: 'MontserratBold',
                }}
              >
                {assetInfo.symbol}
              </span>
              <div
                style={{
                  display: 'flex',
                  gap: '4px',
                  overflow: 'hidden',
                }}
              >
                {assetInfo.tags.slice(0, 4).map((tag) => (
                  <p
                    key={tag.label}
                    style={{
                      ...cssstring(tag.style ?? ''),
                      margin: 0,
                      padding: '2px 8px',
                      background: '#23272C',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}
                  >
                    {tag.label}
                  </p>
                ))}
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 12px',
                position: 'absolute',
                right: '0',
              }}
            >
              <span
                style={{
                  fontSize: '18px',
                  fontFamily: 'MontserratBold',
                  color: '#E5FF5A',
                }}
              >
                $ {formatCurrency(assetInfo.price)}
              </span>
              <p
                style={{
                  margin: 0,
                  color: (marketData.priceChange24h ?? 0) < 0 ? '#FF2929' : '#17B830',
                }}
              >
                {localeNumberString(marketData.priceChange24h || 0, 2)}%
                <img src={(marketData.priceChange24h ?? 0) < 0 ? downSrc : upSrc} width={16} />
              </p>
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              background: '#171A1F',
              borderRadius: '12px',
              padding: '16px 12px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                borderRadius: '16px',
              }}
            >
              <span style={{ color: '#999999', marginBottom: '8px' }}>Description</span>
              <span>{assetInfo.description}</span>

              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderRadius: '2px',
                  marginTop: '16px',
                  padding: '16px',
                  background: '#1C2024',
                  height: '50px',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    gap: '32px',
                  }}
                >
                  <span>Market cap</span>
                  <span>{formatCurrency(marketData.marketCap, { average: true })}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    width: '2px',
                    height: '16px',
                    background: '#333333',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    gap: '32px',
                  }}
                >
                  <span
                    style={{
                      color: '#999999',
                    }}
                  >
                    Volume (24H)
                  </span>
                  <span>{formatCurrency(marketData.tradingVolume24h, { average: true })}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    width: '2px',
                    height: '16px',
                    background: '#333333',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    gap: '32px',
                  }}
                >
                  <span
                    style={{
                      color: '#999999',
                    }}
                  >
                    Supply
                  </span>
                  <span>{formatNumber(marketData.totalSupply, { average: true })}</span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    width: '2px',
                    height: '16px',
                    background: '#333333',
                  }}
                />
                <div
                  style={{
                    display: 'flex',
                    gap: '32px',
                  }}
                >
                  <span
                    style={{
                      color: '#999999',
                    }}
                  >
                    Holders
                  </span>
                  <span>{formatNumber(assetInfo.holderCount)}</span>
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              height: '344px',
              background: '#171A1F',
              borderRadius: '12px',
              marginTop: '16px',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <img alt="Chart" height="320" src={chartURL} width="1060" />
          </div>
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
          name: 'MontserratBold',
          data: await montserratBold,
          style: 'normal',
          weight: 600,
        },
      ],
    },
  );
}
