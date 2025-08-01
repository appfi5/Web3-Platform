import { type Script } from '@ckb-lumos/lumos';
import { blockchain, type BytesLike } from '@ckb-lumos/lumos/codec';
import { encodeToAddress, parseAddress } from '@ckb-lumos/lumos/helpers';

import { LUMOS_CONFIG } from '~/lib/constant';

type Network = 'ckb' | 'btc' | 'ckb-testnet';

interface AddressService {
  /**
   * @deprecated please migrate to bytes
   * @param value
   * @param network
   */
  toAddress(value: Script, network?: Network): string;
  toAddress(value: BytesLike, network?: Network): string;

  fromAddress(address: string, network?: Network): Uint8Array;
}

export function createAddressService(): AddressService {
  return {
    toAddress: (value, network) => {
      if (!value) {
        throw new Error('Value is required');
      }

      if (typeof value === 'object' && 'codeHash' in value) {
        return encodeToAddress(value, { config: LUMOS_CONFIG });
      }

      if (network === 'ckb' || network === 'ckb-testnet') {
        return encodeToAddress(blockchain.Script.unpack(value), { config: LUMOS_CONFIG });
      }

      if (!network) {
        try {
          return encodeToAddress(blockchain.Script.unpack(value), { config: LUMOS_CONFIG });
        } catch {
          // do nothing
        }
      }

      throw new Error(`Not supported network: ${network}`);
    },

    fromAddress: (address, network) => {
      if (network === 'ckb' || network === 'ckb-testnet') {
        return blockchain.Script.pack(parseAddress(address, { config: LUMOS_CONFIG }));
      }

      if (!network) {
        try {
          return blockchain.Script.pack(parseAddress(address, { config: LUMOS_CONFIG }));
        } catch {
          // do nothing
        }
      }

      throw new Error(`Not supported network: ${network}`);
    },
  };
}
