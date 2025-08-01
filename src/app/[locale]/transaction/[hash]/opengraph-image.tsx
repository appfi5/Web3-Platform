import { ImageResponse } from 'next/og';
import { getTranslations } from 'next-intl/server';

import { type BtcTxDetail, type CkbTxDetail } from '~/server/types/txs';
import { api } from '~/trpc/og-client';
import { dayjs, fetchImgByUrl, formatDuration, localeNumberString, shannonToCkb, trunkLongStr } from '~/utils/og';

export const runtime = 'edge';

export const alt = 'MagickBase';
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

type BasicInfoKey = 'blockHeight' | 'timestamp' | 'transactionFee' | 'feeRate' | 'status' | 'age' | 'cycles';

type AdvancedInfoKey = 'position' | 'inputValue' | 'outputValue' | 'version' | 'cellBase' | 'coinBase' | 'lockTime';

export default async function Image({ params: { locale, hash } }: { params: { locale: string; hash: string } }) {
  const tx = await api.v0.txs.detail.query({ txHash: hash });

  if (!tx) return null;

  const { network } = tx;

  const txHash = network === 'btc' ? hash.replace('0x', '') : hash;

  const t = await getTranslations({ locale });

  const montserratRegular = fetch(new URL('../../../../../public/font/Montserrat-Regular.ttf', import.meta.url)).then(
    (res) => res.arrayBuffer(),
  );
  const montserratMedium = fetch(new URL('../../../../../public/font/Montserrat-Medium.ttf', import.meta.url)).then(
    (res) => res.arrayBuffer(),
  );
  const montserratBold = fetch(new URL('../../../../../public/font/Montserrat-Bold.ttf', import.meta.url)).then((res) =>
    res.arrayBuffer(),
  );

  const bgSrc = await fetchImgByUrl(new URL('../../../../../public/seo/bg.png', import.meta.url));
  const logoSrc = await fetchImgByUrl(new URL('../../../../../public/seo/logo.png', import.meta.url));
  const checkedSrc = await fetchImgByUrl(new URL('../../../../../public/seo/checked.png', import.meta.url));

  let basicInfo = {
    blockHeight: '-',
    timestamp: '-',
    transactionFee: '-',
    feeRate: '-',
    status: <span>-</span>,
    age: '-',
    cycles: '-',
  };

  const localOffset = dayjs().utcOffset() / 60;
  basicInfo = {
    blockHeight: `${tx.blockNumber}` || '-',
    timestamp: dayjs(tx.submittedTime)
      .utcOffset(localOffset * 60)
      .format(`YYYY.MM.DD HH:mm:ss [(UTC ${localOffset >= 0 ? '+' : ''}${localOffset})]`),
    transactionFee:
      network === 'btc'
        ? `${localeNumberString(tx.transactionFee)} sats`
        : `${shannonToCkb(tx.transactionFee || 0)} ${tx.assetInfo.symbol}`,
    feeRate: `${localeNumberString(tx.feeRate, 2)} ${network === 'btc' ? 'sat/vB' : 'shannons/kB'}`,
    status: (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          color: '#FAFAFA',
        }}
      >
        {tx.txStatus === 'committed' ? (
          <div
            style={{
              display: 'flex',
              gap: '4px',
            }}
          >
            <img alt="checked" height={18} src={checkedSrc} width={18} />
            <span>Confirmed</span>
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">{dayjs(tx.committedTime).fromNow()}</span>
          </div>
        ) : (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <span>{tx.txStatus}</span>
            <span className="whitespace-nowrap overflow-hidden text-ellipsis">{dayjs(tx.submittedTime).fromNow()}</span>
          </div>
        )}
      </div>
    ),
    age: formatDuration(dayjs.duration(dayjs().diff(dayjs(tx.submittedTime)))),
    cycles: network === 'ckb' ? localeNumberString((tx as CkbTxDetail).cycles || '') : '-',
  };

  let advancedInfo = {
    position: '-',
    inputValue: '-',
    outputValue: '-',
    version: '-',
    cellBase: '-',
    coinBase: '-',
    lockTime: '-',
  };
  if (tx) {
    let lockTime = 'No Lock Time';
    if (tx.lockTime) {
      if (network === 'btc') {
        lockTime = localeNumberString(tx.lockTime);
      } else {
        lockTime = dayjs(tx.lockTime).format('YYYY/MM/DD HH:mm:ss');
      }
    }
    advancedInfo = {
      position: `${tx.position}`,
      inputValue: `$ ${localeNumberString(tx.inputAmountUsd, 2)}`,
      outputValue: `$ ${localeNumberString(tx.outputAmountUsd, 2)}`,
      version: `${tx.version}`,
      cellBase: network === 'ckb' ? ((tx as CkbTxDetail)?.isCellBase ? 'Yes' : 'No') : '-',
      coinBase: network === 'btc' ? ((tx as BtcTxDetail)?.isCoinBase ? 'Yes' : 'No') : '-',
      lockTime,
    };
  }

  const basicInfoLabels =
    network === 'btc'
      ? ['Block height', 'Timestamp', 'Transaction Fee', 'Fee Rate', 'Status', 'Age']
      : ['Block height', 'Timestamp', 'Transaction Fee', 'Fee Rate', 'Status', 'Age', 'Cycles'];

  const basicInfoKeys: BasicInfoKey[] =
    network === 'btc'
      ? ['blockHeight', 'timestamp', 'transactionFee', 'feeRate', 'status', 'age']
      : ['blockHeight', 'timestamp', 'transactionFee', 'feeRate', 'status', 'age', 'cycles'];

  const advancedInfoLabels =
    network === 'btc'
      ? ['Position', 'Input Value', 'Output Value', 'Version', 'CoinBase', 'LockTime']
      : ['Position', 'Input Value', 'Output Value', 'Version', 'CellBase', 'LockTime'];

  const advancedInfoKeys: AdvancedInfoKey[] =
    network === 'btc'
      ? ['position', 'inputValue', 'outputValue', 'version', 'coinBase', 'lockTime']
      : ['position', 'inputValue', 'outputValue', 'version', 'cellBase', 'lockTime'];

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
                {network === 'ckb' ? 'CKB' : 'Bitcoin'} {t('TransactionPage.Transaction')}
              </p>
              <p
                style={{
                  fontFamily: 'MontserratMedium',
                }}
              >
                {trunkLongStr(txHash, 6)}
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
              marginTop: '16px',
              display: 'flex',
              gap: '8px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                padding: '20px 12px',
                background: '#171A1F',
                borderRadius: '12px',
              }}
            >
              <p
                style={{
                  fontSize: '15px',
                  fontFamily: 'MontserratMedium',
                  margin: 0,
                }}
              >
                Basic Information
              </p>
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
                  {basicInfoLabels.map((item) => (
                    <p
                      key={item}
                      style={{
                        margin: '16px 0 0',
                        color: '#999999',
                        height: '18px',
                      }}
                    >
                      {item}
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
                  {basicInfoKeys.map((key) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '16px',
                        height: '18px',
                      }}
                    >
                      {basicInfo[key]}
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
                padding: '20px 12px',
                background: '#171A1F',
                borderRadius: '12px',
              }}
            >
              <p
                style={{
                  fontSize: '15px',
                  fontFamily: 'MontserratMedium',
                  margin: 0,
                }}
              >
                Advanced Information
              </p>
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
                  {advancedInfoLabels.map((item) => (
                    <p
                      key={item}
                      style={{
                        margin: '16px 0 0',
                        color: '#999999',
                        height: '18px',
                      }}
                    >
                      {item}
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
                  {advancedInfoKeys.map((key) => (
                    <div
                      key={key}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        marginTop: '16px',
                        height: '18px',
                      }}
                    >
                      {advancedInfo[key]}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              marginTop: '16px',
              padding: '20px 12px',
              background: '#171A1F',
              borderRadius: '12px',
            }}
          >
            {network === 'ckb' && (
              <div
                style={{
                  display: 'flex',
                }}
              >
                <p
                  style={{
                    width: '210px',
                    color: '#999999',
                    margin: 0,
                  }}
                >
                  Related Capacity
                </p>
                <p
                  style={{
                    margin: 0,
                  }}
                >
                  {localeNumberString(shannonToCkb((tx as CkbTxDetail)?.relatedCapacityAmount || 0))}{' '}
                  {tx?.assetInfo.symbol} ($
                  {localeNumberString((tx as CkbTxDetail)?.relatedCapacityAmountUsd || 0, 2)})
                </p>
              </div>
            )}
            <div
              style={{
                display: 'flex',
                marginTop: '16px',
              }}
            >
              <p
                style={{
                  width: '210px',
                  color: '#999999',
                  margin: 0,
                }}
              >
                Total Value
              </p>
              <p
                style={{
                  margin: 0,
                }}
              >
                $ {localeNumberString(tx?.totalAmountUsd || 0, 2)}
              </p>
            </div>
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
