import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

import { fetchImgByUrl } from '~/utils/og';

export const runtime = 'edge';

export const alt = 'MagickBase';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default async function Image({ params: { locale } }: { params: { locale: string } }) {
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const montserratRegular = fetch(new URL('../../../../public/font/Montserrat-Regular.ttf', import.meta.url)).then(
    (res) => res.arrayBuffer(),
  );
  const montserratBold = fetch(new URL('../../../../public/font/Montserrat-Bold.ttf', import.meta.url)).then((res) =>
    res.arrayBuffer(),
  );

  const bgSrc = await fetchImgByUrl(new URL('../../../../public/seo//homeBg.png', import.meta.url));

  return new ImageResponse(
    (
      <div
        style={{
          background: 'black',
          width: '100%',
          height: '100%',
          display: 'flex',
          color: '#E5FF5A',
        }}
      >
        <img alt="bg" height="100%" src={bgSrc} width="100%" />
        <div
          style={{
            position: 'absolute',
            bottom: '56px',
            left: '51px',
            display: 'flex',
            flexDirection: 'column',
            fontFamily: 'MontserratRegular',
          }}
        >
          <p
            style={{
              width: '700px',
              wordBreak: 'break-word',
              fontSize: '56px',
              fontFamily: 'MontserratBold',
            }}
          >
            {t('aboutUs.ogImage.title')}
          </p>
          <p
            style={{
              marginTop: '16px',
              width: '575px',
              wordBreak: 'break-word',
              fontSize: '14px',
            }}
          >
            {t('aboutUs.ogImage.description')}
          </p>
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
