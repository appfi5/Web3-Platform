'use client';

import JSONGrid from '@redheadphone/react-json-grid';
import clsx from 'clsx';
import { ArrowUpRight } from 'iconoir-react';
import { useState } from 'react';

import { Button } from '~/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '~/components/ui/dialog';

import DownloadIcon from './download.svg';
import ExpandIcon from './expand.svg';
import ShrinkIcon from './shrink.svg';

export function ViewRawData({ title, data }: { title: string; data: object }) {
  const [isExpand, setIsExpand] = useState<boolean>(false);

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)]);
    const link = document.createElement('a');
    link.download = `tx-${title}.json`;
    link.href = URL.createObjectURL(blob);
    document.body.append(link);
    link.click();
    link.remove();
  };

  return (
    <Dialog>
      <DialogTrigger>
        <Button className="rounded-[16px] text-[12px] h-8" variant="outline">
          View raw data <ArrowUpRight height={16} width={16} />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[80%]">
        <DialogHeader className="flex flex-row justify-between">
          <DialogTitle>Raw Data</DialogTitle>
        </DialogHeader>
        <div className="absolute right-10 top-[14px] flex gap-3">
          <ExpandIcon className="cursor-pointer hover:opacity-80" onClick={() => setIsExpand(true)} />
          <ShrinkIcon className="cursor-pointer hover:opacity-80" onClick={() => setIsExpand(false)} />
          <DownloadIcon className="cursor-pointer hover:opacity-80" onClick={handleDownload} />
        </div>

        <div className={clsx('overflow-scroll w-[100%] max-h-[80vh]', isExpand ? 'block' : 'hidden')}>
          <JSONGrid data={data} defaultExpandDepth={5} />
        </div>
        <div className={clsx('overflow-scroll w-[100%] max-h-[80vh]', isExpand ? 'hidden' : 'block')}>
          <JSONGrid data={data} defaultExpandDepth={1} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
