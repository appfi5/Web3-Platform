import Image from 'next/image';
import { type FC } from 'react';

const AssetIcon: FC<{ assetIcon?: string | null }> = ({ assetIcon }) => {
  if (!assetIcon) return null;
  return <Image alt="icon" height={20} src={assetIcon} width={20} />;
};

export default AssetIcon;
