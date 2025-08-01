import { type ComponentProps } from 'react';

import { Link } from '~/i18n/navigation';
import { localeNumberString } from '~/utils/utility';

import LeftButton from './left-button.svg';
import RightButton from './right-button.svg';

export const BlockNumber = ({
  blockNumber,
  network,
  latestBlock,
}: ComponentProps<'div'> & { blockNumber: number; network: string; latestBlock: number }) => {
  return (
    <div className="flex items-center">
      {blockNumber > 0 ? (
        <Link className="cursor-pointer" href={`/block/${network}/${blockNumber - 1}` as never}>
          <LeftButton></LeftButton>
        </Link>
      ) : (
        <LeftButton />
      )}
      <div className="text-[14px] text-[#999]">{localeNumberString(blockNumber)}</div>

      {blockNumber < latestBlock ? (
        <Link className="cursor-pointer" href={`/block/${network}/${blockNumber + 1}` as never}>
          <RightButton />
        </Link>
      ) : (
        <RightButton />
      )}
    </div>
  );
};
