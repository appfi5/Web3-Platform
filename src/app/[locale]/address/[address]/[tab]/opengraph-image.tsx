import BigNumber from 'bignumber.js';
import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';
import * as R from 'remeda';

import { NATIVE_ASSETS } from '~/constants';
import { api } from '~/trpc/og-client';
import { type RouterOutputs } from '~/trpc/react';
import {
  dayjs,
  fetchImgByUrl,
  formatWithDecimal,
  localeNumberString,
  parseNumericAbbr,
  shannonToCkb,
  trunkLongStr,
} from '~/utils/og';

export const runtime = 'edge';

export const alt = 'MagickBase';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

const getAssetNetwork = (assetInfo: RouterOutputs['v0']['address']['assets'][0]['assetInfo']) => {
  if (assetInfo?.parentId === NATIVE_ASSETS.BTC || assetInfo?.id === NATIVE_ASSETS.BTC) {
    return 'BTC';
  }

  return 'CKB';
};

export default async function Image({
  params: { locale, address, tab },
}: {
  params: { locale: string; address: string; tab: string };
}) {
  const t = await getTranslations({ locale });

  const assets = await api.v0.address.assets.query({ address });
  const historyAsset = await api.v0.address.dailyUsdSnapshot.query({ address, recentDays: 3 }).catch(() => []);
  const protocals = await api.v0.address.protocals.query({ address }).catch(() => []);
  const { result: transactions } = await api.v0.address.transactions.query({ address });
  const { result: liveCells } = await api.v0.address.utxos.query({ address, pageSize: 5 }).catch(() => {
    return {
      result: [],
    };
  });

  const historyMap = historyAsset
    ? historyAsset.reduce(
        (acc: Record<string, BigNumber>, cur) => {
          const currentCur = acc[cur.date];
          if (currentCur) {
            return {
              ...acc,
              [cur.date]: currentCur.plus(new BigNumber(cur.amountUsd)),
            };
          }
          return {
            ...acc,
            [cur.date]: new BigNumber(cur.amountUsd),
          };
        },
        {} as Record<string, BigNumber>,
      )
    : {};

  const chartData = Object.entries(historyMap)
    .map(([date, value]) => ({ date, value: value.toNumber() }))
    .sort((a, b) => a.date.localeCompare(b.date));

  const totalValueByChain = R.pipe(
    assets,
    R.groupBy((i) => getAssetNetwork(i.assetInfo)),
    R.entries(),
    R.map(
      ([network, assets]) =>
        [network, assets.reduce((acc, cur) => acc.plus(cur.amountUsd ?? 0), BigNumber(0))] as const,
    ),
  );

  const montserratRegular = fetch(
    new URL('../../../../../../public/font/Montserrat-Regular.ttf', import.meta.url),
  ).then((res) => res.arrayBuffer());
  const montserratBold = fetch(new URL('../../../../../../public/font/Montserrat-Bold.ttf', import.meta.url)).then(
    (res) => res.arrayBuffer(),
  );

  const bgSrc = await fetchImgByUrl(new URL('../../../../../../public/seo/bg.png', import.meta.url));
  const logoSrc = await fetchImgByUrl(new URL('../../../../../../public/seo/logo.png', import.meta.url));
  const filterSrc = await fetchImgByUrl(new URL('../../../../../../public/seo/filter.png', import.meta.url));
  const sortSrc = await fetchImgByUrl(new URL('../../../../../../public/seo/sort.png', import.meta.url));
  const btcSrc = await fetchImgByUrl(new URL('../../../../../../public/seo/btc.png', import.meta.url));
  const ckbSrc = await fetchImgByUrl(new URL('../../../../../../public/seo/ckb.png', import.meta.url));
  const ckbBgSrc = await fetchImgByUrl(new URL('../../../../../../public/seo/ckbBg.png', import.meta.url));

  const NetworkIcon = {
    CKB: ckbSrc,
    BTC: btcSrc,
    ckb: ckbSrc,
    btc: btcSrc,
  };

  const chartURL =
    'https://quickchart.io/chart?width=1060&height=150&chart=' +
    encodeURIComponent(
      JSON.stringify({
        type: 'line',
        data: {
          labels: chartData.map((item) => item.date),
          datasets: [
            {
              label: '',
              data: chartData.map((item) => item.value),
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

  const getOverviewDom = () => {
    const chartURL2 =
      'https://quickchart.io/chart?width=556&height=248&chart=' +
      encodeURIComponent(
        JSON.stringify({
          type: 'doughnut',
          data: {
            labels: assets.map((item) => item.assetInfo?.symbol),
            datasets: [
              {
                data: assets.map((item) => item.amountUsd),
                backgroundColor: ['#F66060', '#6074F6', '#FDCB5D', '#51DA92', '#51B9DA', '#BD60F6'],
              },
            ],
          },
          options: {
            plugins: {
              datalabels: {
                display: false,
              },
            },
            responsive: true,
            legend: {
              display: true,
              position: 'left',
              align: 'center',
              labels: {
                fontColor: '#F5F5F5',
                fontSize: 16,
                boxWidth: 20,
              },
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

    return (
      <div
        style={{
          display: 'flex',
          borderRadius: '16px',
          marginTop: '8px',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            background: '#171A1F',
            borderRadius: '12px',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '14px 44px',
          }}
        >
          <img alt="Chart" src={chartURL2} width="100%" />
        </div>
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            background: '#171A1F',
            borderRadius: '12px',
            padding: '12px',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '32px',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#999999',
              paddingTop: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Chain
              <img height={20} src={filterSrc} width={20} />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Token
              <img height={20} src={filterSrc} width={20} />
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Amount
            </div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
              }}
            >
              By Value
              <img height={20} src={sortSrc} width={20} />
            </div>
          </div>
          {assets.slice(0, 5).map((item) => (
            <div
              key={item.assetId}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#FAFAFA',
                background: '#23272C',
                width: '100%',
                height: '32px',
                borderRadius: '4px',
                padding: '0 4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: '200px',
                }}
              >
                <img height={28} src={NetworkIcon[getAssetNetwork(item.assetInfo)]} width={28} />
                {item.assetInfo?.symbol}
              </div>
              <div
                style={{
                  display: 'flex',
                  flex: 1,
                }}
              >
                {localeNumberString(item.assetAmount || 0, 4)}
              </div>
              <span>$ {localeNumberString(item.amountUsd || 0)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getProtocolsDom = () => {
    return (
      <div
        style={{
          display: 'flex',
          borderRadius: '16px',
          marginTop: '8px',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            background: '#171A1F',
            borderRadius: '12px',
            padding: '12px',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '32px',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#999999',
              paddingTop: '4px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '120px',
                gap: '4px',
                alignItems: 'center',
              }}
            >
              <span>Chain</span>
              <div
                style={{
                  display: 'flex',
                  padding: '4px 8px',
                  border: '1px solid #333333',
                  borderRadius: '8px',
                  color: '#FAFAFA',
                }}
              >
                All
              </div>
            </div>
            <span>By Value</span>
          </div>
          {protocals.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#FAFAFA',
                background: '#1C2024',
                width: '100%',
                height: '49px',
                borderRadius: '4px',
                padding: '0 4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: '30%',
                }}
              >
                <img height={16} src={ckbSrc} width={16} />
                <span>{item.type === 'nervos_dao' ? 'Nervos DAO' : 'Protocol not yet supported'}</span>
              </div>
              <div
                style={{
                  display: 'flex',
                }}
              >
                Deposit Time: {dayjs(item.depositTimestamp).format('YYYY.MM.DD HH:mm')}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: '30%',
                  justifyContent: 'flex-end',
                }}
              >
                $ {localeNumberString(item.amountUsd)} <img height={49} src={ckbBgSrc} />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getTransactionsDom = () => {
    return (
      <div
        style={{
          display: 'flex',
          borderRadius: '16px',
          marginTop: '8px',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            background: '#171A1F',
            borderRadius: '12px',
            padding: '12px',
            gap: '8px',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '32px',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#999999',
              paddingTop: '4px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '120px',
                gap: '4px',
                alignItems: 'center',
              }}
            >
              <span>Chain</span>
              <div
                style={{
                  display: 'flex',
                  padding: '4px 8px',
                  border: '1px solid #333333',
                  borderRadius: '8px',
                  color: '#FAFAFA',
                }}
              >
                All
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                width: '120px',
                gap: '4px',
                alignItems: 'center',
                flex: 1,
              }}
            >
              <span>Token</span>
              <div
                style={{
                  display: 'flex',
                  padding: '4px 8px',
                  border: '1px solid #333333',
                  borderRadius: '8px',
                  color: '#FAFAFA',
                }}
              >
                All
              </div>
            </div>
            <div
              style={{
                display: 'flex',
                width: '80px',
              }}
            >
              Asset
            </div>
            <div
              style={{
                display: 'flex',
                width: '80px',
                flex: 1,
              }}
            >
              Change
            </div>
            <span>By Value</span>
          </div>
          {transactions.slice(0, 4).map((tx, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#FAFAFA',
                background: '#1C2024',
                width: '100%',
                height: '49px',
                borderRadius: '4px',
                padding: '0 4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: '100px',
                }}
              >
                <img height={16} src={NetworkIcon[tx.network] ?? NetworkIcon.CKB} width={16} />
                <span>{tx.network} Chain</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: '120px',
                }}
              >
                <span>From</span>
                <img height={20} src={NetworkIcon[tx.network] ?? NetworkIcon.CKB} width={20} />
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: '120px',
                  position: 'relative',
                }}
              >
                {tx.toAddresses.length > 0 && <span>To</span>}
                {tx.toAddresses.slice(0, 3).map((to, i) => (
                  <img
                    height={20}
                    key={to}
                    src={ckbSrc}
                    style={{
                      position: 'absolute',
                      top: '-4px',
                      left: `${26 + 15 * i}px`,
                    }}
                    width={20}
                  />
                ))}
                {tx.toAddresses.length > 3 && (
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      borderRadius: '100%',
                      background: '#FFFFFF',
                      color: '#222222',
                      position: 'absolute',
                      top: '-4px',
                      left: `${26 + 15 * 3}px`,
                      height: '20px',
                      width: '20px',
                      fontSize: '10px',
                      fontFamily: 'MontserratBold',
                    }}
                  >
                    +{tx.toAddresses.length - 3}
                  </div>
                )}
              </div>
              {tx.changes.map((change, item) => {
                const assetInfo = tx.assets.find((asset) => asset.id === change.assetId);
                return (
                  <div
                    key={item}
                    style={{
                      display: 'flex',
                      background: '#23272C',
                      padding: '4px',
                      borderRadius: '4px',
                      alignItems: 'center',
                      gap: '4px',
                      width: '180px',
                    }}
                  >
                    <img
                      height={20}
                      src={assetInfo?.id === NATIVE_ASSETS.CKB ? ckbSrc : assetInfo?.icon || ''}
                      width={20}
                    />

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        minWidth: '144px',
                      }}
                    >
                      <span>{assetInfo?.symbol}</span>
                      <p
                        style={{
                          margin: 0,
                          fontSize: '12px',
                        }}
                      >
                        {assetInfo && assetInfo.decimals !== null
                          ? parseNumericAbbr(formatWithDecimal(change.amount, assetInfo.decimals), 2)
                          : '--'}
                        <span
                          style={{
                            fontSize: '10px',
                            marginTop: '2px',
                            marginLeft: '4px',
                          }}
                        >
                          ${change.amountUsd}
                        </span>
                      </p>
                    </div>
                  </div>
                );
              })}

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px',
                  width: '30%',
                  alignItems: 'flex-end',
                }}
              >
                <span>
                  (Block {tx.blockNumber.toLocaleString()}) {dayjs(tx.time).fromNow()}
                </span>
                <span style={{ color: '#E5FF5A' }}>{trunkLongStr(tx.txHash)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const getUtxoDom = () => {
    return (
      <div
        style={{
          display: 'flex',
          borderRadius: '16px',
          marginTop: '8px',
          gap: '8px',
        }}
      >
        <div
          style={{
            display: 'flex',
            flex: 1,
            flexDirection: 'column',
            background: '#171A1F',
            borderRadius: '12px',
            padding: '12px',
            gap: '8px',
          }}
        >
          <span
            style={{
              color: '#FAFAFA',
              fontSize: '14px',
            }}
          >
            CKB Address Info （Live Cell）
          </span>
          <div
            style={{
              display: 'flex',
              gap: '32px',
              justifyContent: 'space-between',
              fontSize: '13px',
              color: '#999999',
              paddingTop: '4px',
            }}
          >
            <div
              style={{
                display: 'flex',
                width: '40px',
              }}
            >
              No.
            </div>
            <div
              style={{
                display: 'flex',
                width: '120px',
              }}
            >
              Token
            </div>
            <div
              style={{
                display: 'flex',
                width: '120px',
              }}
            >
              Block Height
            </div>
            <div
              style={{
                display: 'flex',
                width: '200px',
              }}
            >
              OutPoint
            </div>
            <div
              style={{
                display: 'flex',
                width: '140px',
              }}
            >
              Amount
            </div>
            <div
              style={{
                display: 'flex',
                width: '140px',
              }}
            >
              Capacity(CKB)
            </div>
          </div>
          {liveCells.map((item, index) => (
            <div
              key={index}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '14px',
                color: '#FAFAFA',
                background: '#1C2024',
                width: '100%',
                height: '32px',
                borderRadius: '4px',
                padding: '0 4px',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  width: '40px',
                }}
              >
                {index + 1}
              </div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  width: '120px',
                }}
              >
                <img
                  height={24}
                  src={item.tokenInfo?.symbol === NATIVE_ASSETS.CKB ? ckbSrc : item.tokenInfo?.icon || logoSrc}
                  width={24}
                />
                {item.tokenInfo ? item.token : 'Unknown'}
              </div>
              <div
                style={{
                  display: 'flex',
                  color: '#E5FF5A',
                  width: '120px',
                }}
              >
                #{item.blockHeight.toLocaleString()}
              </div>
              <div
                style={{
                  display: 'flex',
                  color: '#E5FF5A',
                  width: '200px',
                }}
              >
                {trunkLongStr(item.outPoint)}
              </div>
              <div
                style={{
                  display: 'flex',
                  width: '140px',
                }}
              >
                {localeNumberString(item.amount)}
              </div>
              <div
                style={{
                  display: 'flex',
                  width: '140px',
                }}
              >
                {localeNumberString(shannonToCkb(item.capacity), 2)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

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
                  color: '#999999',
                }}
              >
                Address:
              </p>
              <p
                style={{
                  fontFamily: 'MontserratMedium',
                }}
              >
                {trunkLongStr(address, 6)}
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
              {process.env.NEXT_PUBLIC_IS_MAINNET === 'true' ? 'Mainnet' : 'Testnet'}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              height: '220px',
              background: '#171A1F',
              borderRadius: '12px',
              padding: '14px',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                gap: '8px',
              }}
            >
              {totalValueByChain.map(([network, totalValue]) => (
                <div
                  key={network}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '8px',
                    borderRadius: '8px',
                    gap: '4px',
                    background: '#23272C',
                  }}
                >
                  <img src={NetworkIcon[network]} width={24} />$ {totalValue.toFormat(2, BigNumber.ROUND_FLOOR)}
                </div>
              ))}
            </div>
            <img alt="Chart" src={chartURL} width="100%" />
          </div>

          {tab === 'overview' && getOverviewDom()}
          {tab === 'protocols' && getProtocolsDom()}
          {tab === 'transactions' && getTransactionsDom()}
          {tab === 'utxo' && getUtxoDom()}
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
