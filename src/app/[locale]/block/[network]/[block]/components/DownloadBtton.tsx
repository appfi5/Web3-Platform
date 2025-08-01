'use client';
import { type Network } from '~/server/api/routers/zod-helper';
import { api, type RouterOutputs } from '~/trpc/react';

import DownloadIcon from './download.svg';

export default function DownloadButton({
  network,
  blockInfo,
}: {
  network: Network;
  blockInfo: NonNullable<RouterOutputs['v0']['blocks']['detail']>;
}) {
  const trpcUtils = api.useUtils();

  const saveDataAsJSON = async () => {
    const data = await trpcUtils.v0.blocks.raw.fetch({
      network,
      blockHash: blockInfo.hash,
    });

    if (data) {
      const jsonBlob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(jsonBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${blockInfo.hash}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  };

  return (
    <button
      className="cursor-pointer flex items-center justify-center gap-[4px] bg-[#23272C] p-[8px] rounded-[4px] text-[#999] hover:text-primary"
      onClick={saveDataAsJSON}
    >
      <span className="text-[14px]">Download Block</span>
      <DownloadIcon />
    </button>
  );
}
