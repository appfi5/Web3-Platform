import Link from 'next/link';
import React, { type FC } from 'react';

import { trunkLongStr } from '~/utils/utility';

export function sanitizeAddress(payload: { address?: string; isBlockReward?: boolean }) {
  if (payload.isBlockReward) {
    return { address: 'BlockReward', formattedAddress: 'BlockReward', isLink: false };
  }
  if (payload.address) {
    return { address: payload.address, formattedAddress: trunkLongStr(payload.address), isLink: true };
  }
  return { address: 'UNKNOWN', formattedAddress: 'UNKNOWN', isLink: false };
}

const SanitizedAddressLink: FC<{
  isBlockReward?: boolean;
  address?: string;
}> = ({ isBlockReward, address }) => {
  const { formattedAddress, isLink } = sanitizeAddress({ isBlockReward, address });

  if (isLink) {
    return (
      <Link
        className="inconsolata hover:opacity-80"
        href={`/address/${address}`}
        rel="noreferrer noopener"
        target="_blank"
      >
        {formattedAddress}
      </Link>
    );
  }

  return formattedAddress;
};

export default SanitizedAddressLink;
