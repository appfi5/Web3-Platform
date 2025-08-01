import ecc from '@bitcoinerlab/secp256k1';
import { type Script } from '@ckb-lumos/lumos';
import { blockchain, bytes } from '@ckb-lumos/lumos/codec';
import { omnilock } from '@ckb-lumos/lumos/common-scripts';
import { addressToScript, encodeToAddress } from '@ckb-lumos/lumos/helpers';
import { address, initEccLib, networks } from 'bitcoinjs-lib';
import { isAddress as isEthAddress } from 'ethers';

import { env } from '~/env';
import { isValidBTCAddress } from '~/utils/bitcoin';
import { toHexNo0x, toHexWith0x } from '~/utils/bytes';
import { hexifyScript, scriptToAddress } from '~/utils/utility';

import { LUMOS_CONFIG } from './constant';

export const encodeOmnilock = (ethAddress: string) => {
  const lockScript = omnilock.createOmnilockScript(
    {
      auth: { flag: 'ETHEREUM', content: ethAddress },
    },
    { config: LUMOS_CONFIG },
  );
  return lockScript;
};

export const encodeOmnilockAddress = (ethAddress: string) => {
  const lockScript = encodeOmnilock(ethAddress);

  const address = encodeToAddress(lockScript, { config: LUMOS_CONFIG });

  return address;
};

export const isCKBAddress = (address: string) => {
  try {
    addressToScript(address, { config: LUMOS_CONFIG });
    return true;
  } catch {
    return false;
  }
};

type Addresses = Partial<Record<'ckb' | 'eth' | 'btc', string>>;

export const getAddresses = (original: string): Addresses => {
  const addresses: Addresses = {};

  if (!original) return addresses;

  switch (true) {
    case isEthAddress(original): {
      addresses.eth = original;
      try {
        addresses.ckb = encodeOmnilockAddress(original);
      } catch {
        // ignore
      }
      break;
    }
    case isValidBTCAddress(original): {
      addresses.btc = original;
      break;
    }
    case isCKBAddress(original): {
      addresses.ckb = original;
      break;
    }
    default: {
      // ignore
    }
  }
  return addresses;
};

export const getAddressNetwork = (address: string): 'BTC' | 'CKB' | undefined => {
  if (isCKBAddress(address)) {
    return 'CKB';
  }

  if (isValidBTCAddress(address)) {
    return 'BTC';
  }

  return undefined;
};

export const formatAddress = (address: string) => {
  const { ckb, btc } = getAddresses(address);
  if (ckb) {
    return hexifyScript(
      addressToScript(address, {
        config: LUMOS_CONFIG,
      }),
    );
  }

  if (btc) return btc;

  throw new Error('This address is invalid or not yet supported');
};

export function remove0x(str: string) {
  return str ? (str.startsWith('0x') ? str.slice(2) : str) : '';
}

initEccLib(ecc);

export const UNKNOWN = 'UNKNOWN';

export const addressConvert = {
  toPG(lockOrAddress: string, network: 'ckb' | 'btc') {
    switch (network) {
      case 'ckb':
        return addressToScript(lockOrAddress, { config: LUMOS_CONFIG });
      case 'btc':
        return lockOrAddress;
      default:
        return lockOrAddress;
    }
  },
  toCH(lockOrAddress: Script | string, networkType?: 'ckb' | 'btc') {
    if (typeof lockOrAddress === 'object') return bytes.hexify(blockchain.Script.pack(lockOrAddress));
    const network = networkType ?? (lockOrAddress.startsWith('ckb') || lockOrAddress.startsWith('ckt') ? 'ckb' : 'btc');
    try {
      switch (network) {
        case 'ckb':
          return bytes.hexify(blockchain.Script.pack(addressToScript(lockOrAddress, { config: LUMOS_CONFIG })));
        case 'btc':
          return bytes.hexify(
            address.toOutputScript(lockOrAddress, env.NEXT_PUBLIC_IS_MAINNET ? networks.bitcoin : networks.testnet),
          );
        default:
          return lockOrAddress;
      }
    } catch {}
    return lockOrAddress;
  },
  fromCH(hex: string, network?: 'ckb' | 'btc') {
    if (!network) {
      try {
        return scriptToAddress(blockchain.Script.unpack(bytes.hexify(toHexWith0x(hex))));
      } catch {}
      try {
        return address.fromOutputScript(
          Buffer.from(toHexNo0x(hex), 'hex'),
          env.NEXT_PUBLIC_IS_MAINNET ? networks.bitcoin : networks.testnet,
        );
      } catch {}
      return UNKNOWN;
    }
    try {
      switch (network) {
        case 'ckb':
          return scriptToAddress(blockchain.Script.unpack(bytes.hexify(toHexWith0x(hex))));
        case 'btc':
          return address.fromOutputScript(
            Buffer.from(toHexNo0x(hex), 'hex'),
            env.NEXT_PUBLIC_IS_MAINNET ? networks.bitcoin : networks.testnet,
          );
        default:
          return UNKNOWN;
      }
    } catch {}
    return UNKNOWN;
  },
};
