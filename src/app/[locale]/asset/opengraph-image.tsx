import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

import { NATIVE_ASSETS } from '~/constants';
import { api } from '~/trpc/og-client';
import { cssstring } from '~/utils/cssstring';
import { dayjs, fetchImgByUrl, localeNumberString, parseNumericAbbr } from '~/utils/og';

export const runtime = 'edge';

export const alt = 'MagickBase';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale });

  const { result: data } = await api.v0.asset.list.query({
    page: 1,
    pageSize: 10,
  });

  const montserratRegular = fetch(new URL('../../../../public/font/Montserrat-Regular.ttf', import.meta.url)).then(
    (res) => res.arrayBuffer(),
  );
  const montserratBold = fetch(new URL('../../../../public/font/Montserrat-Bold.ttf', import.meta.url)).then((res) =>
    res.arrayBuffer(),
  );

  const bgSrc = await fetchImgByUrl(new URL('../../../../public/seo/bg.png', import.meta.url));
  const logoSrc = await fetchImgByUrl(new URL('../../../../public/seo/logo.png', import.meta.url));
  const ckbSrc = await fetchImgByUrl(new URL('../../../../public/seo/ckb.png', import.meta.url));

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
              <p
                style={{
                  fontSize: '16px',
                  fontFamily: 'MontserratBold',
                }}
              >
                {t('metadata.asset.top10')}
              </p>
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
              {dayjs(Date.now()).format(`YYYY.MM.DD HH:mm:ss [(UTC +8)]`)}
            </div>
          </div>

          <div
            style={{
              marginTop: '16px',
              display: 'flex',
              flexDirection: 'column',
              background: '#171A1F',
              borderRadius: '16px',
              padding: '12px 14px 20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                borderRadius: '16px',
                color: '#999999',
              }}
            >
              <p
                style={{
                  margin: 0,
                  width: '50px',
                }}
              >
                No.
              </p>
              <p
                style={{
                  margin: 0,
                  width: '160px',
                }}
              >
                Name
              </p>
              <p
                style={{
                  margin: 0,
                  flex: 1,
                }}
              >
                Tags
              </p>
              <p
                style={{
                  margin: 0,
                  width: '140px',
                }}
              >
                Price
              </p>
              <p
                style={{
                  margin: 0,
                  width: '120px',
                }}
              >
                24H Change
              </p>
              <p
                style={{
                  margin: 0,
                  width: '100px',
                }}
              >
                Volume(24H)
              </p>
            </div>

            {data.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex',
                  color: '#FAFAFA',
                  height: '36px',
                  alignItems: 'center',
                  marginTop: '8px',
                  background: i % 2 ? '#1C2024' : 'transparent',
                  gap: '4px',
                }}
              >
                <p
                  style={{
                    margin: 0,
                    width: '50px',
                  }}
                >
                  {i + 1}
                </p>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    width: '160px',
                    gap: '8px',
                  }}
                >
                  <img height={28} src={item.id === NATIVE_ASSETS.CKB ? ckbSrc : item.icon || ''} width={28} />
                  {item.name}
                </div>
                <div
                  style={{
                    display: 'flex',
                    gap: '4px',
                    overflow: 'hidden',
                    flex: 1,
                  }}
                >
                  {item.tags.map((tag) => (
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
                <p
                  style={{
                    margin: 0,
                    width: '140px',
                  }}
                >
                  $ {localeNumberString(item.price || 0, 4)}
                </p>
                <p
                  style={{
                    margin: 0,
                    width: '120px',
                    color: (item.priceChange24h ?? 0) < 0 ? '#FF2929' : '#17B830',
                  }}
                >
                  {localeNumberString(item.priceChange24h || 0, 2)}%
                </p>
                <p
                  style={{
                    margin: 0,
                    width: '100px',
                  }}
                >
                  $ {parseNumericAbbr(item.tradingVolume24h || 0, 2)}
                </p>
              </div>
            ))}
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
