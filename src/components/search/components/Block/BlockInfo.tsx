import Link from 'next/link';
import { type Dispatch, type FC, type SetStateAction, useCallback } from 'react';

import AddressAvatar from '~/components/AddressAvatar';
import { Card } from '~/components/ui/card';
import { type Network } from '~/server/api/routers/zod-helper';
import { type RouterOutputs } from '~/trpc/react';
import { dayjs, trunkLongStr } from '~/utils/utility';

import Btc from '../../icon/btc.svg';
import CKBBg from '../../icon/ckb-bg.svg';
import Committed from '../../icon/committed.svg';
import Expand from '../../icon/expand.svg';
import Previous from '../../icon/previous.svg';

const BlockInfo: FC<{
  block: RouterOutputs['v0']['blocks']['detail'] | undefined;
  blockNumber: number;
  setBlockNumber: Dispatch<SetStateAction<number>>;
  min: number;
  max: number;
  network: Network;
}> = ({ block, blockNumber, setBlockNumber, min, max, network }) => {
  const onChangeBlockNumber = useCallback(
    (toPrevious?: boolean) => {
      setBlockNumber((v) => {
        if (toPrevious && min < v) return v - 1;
        if (!toPrevious && max > v) return v + 1;
        return v;
      });
    },
    [min, max, setBlockNumber],
  );
  return (
    <>
      <div className="flex items-center text-base">
        Block
        <div className="inline-flex text-xs ml-4 gap-1 text-muted-foreground">
          <Previous
            className={`size-4 cursor-pointer ${min >= blockNumber ? '' : '[&_path]:hover:stroke-primary'}`}
            onClick={() => onChangeBlockNumber(true)}
          />
          #{blockNumber}
          <Previous
            className={`rotate-180 size-4 cursor-pointer ${max <= blockNumber ? '' : '[&_path]:hover:stroke-primary'}`}
            onClick={() => onChangeBlockNumber()}
          />
        </div>
        <Link
          className="flex items-center ml-auto"
          href={`/block/${network.toLowerCase()}/${blockNumber}`}
          target="_blank"
          rel="noreferrer noopener"
        >
          <Expand className="size-5 hover:opacity-80" />
        </Link>
      </div>
      <Card className="p-3 relative text-sm bg-accent mb-2 mt-2">
        <div className="text-muted-foreground mb-2">Status</div>
        <div className="flex items-center gap-1 mb-2">
          <Committed />
          Confirmed {dayjs(Number(block?.time)).fromNow()}
        </div>
        <div className="text-muted-foreground mb-2">Miner</div>
        <div className="flex items-center gap-1">
          <AddressAvatar address={block?.miner} network={network} />
          <span className="inconsolata">{trunkLongStr(block?.miner)}</span>
        </div>
        {network === 'ckb' && <CKBBg className="absolute right-0 top-0 w-16 h-16" />}
        {network === 'btc' && <Btc className="absolute right-0 top-0 w-16 h-16" />}
      </Card>
    </>
  );
};

export default BlockInfo;
