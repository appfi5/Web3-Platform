import { type Script } from '@ckb-lumos/lumos';
import { blockchain, bytes, table, Uint32, Uint128BE } from '@ckb-lumos/lumos/codec';
import { type CKBComponents } from '@ckb-lumos/lumos/rpc';
import { computeScriptHash } from '@ckb-lumos/lumos/utils';
import BigNumber from 'bignumber.js';

import { NATIVE_ASSETS } from '~/constants';
import { LUMOS_CONFIG, MAINNET, RUSD, TESTNET } from '~/lib/constant';
import { type AssetProtocolEnum } from '~/server/db/schema';
import { decodeUdtData } from '~/utils/xudt';

import { type ResolvedInput, type ResolvedOutput } from './types';

type ScriptTemplate = { CODE_HASH: string; HASH_TYPE: string } | { codeHash: string; hashType: string };

export function isScriptOf(script: Script | undefined, template: ScriptTemplate): boolean {
  if (!script) return false;

  if ('CODE_HASH' in template) {
    return script.codeHash === template.CODE_HASH && script.hashType === template.HASH_TYPE;
  }
  return script.codeHash === template.codeHash && script.hashType === template.hashType;
}

function hasKeys<K extends string>(x: unknown, keys: K[]): x is Record<K, unknown> {
  if (!x || typeof x !== 'object') return false;
  return keys.every((key) => key in x);
}

export function isScript(input: unknown): input is Script {
  if (!input) return false;

  return hasKeys(input, ['codeHash', 'hashType', 'args']);
}

export const hexifyScript = (script: Script) => bytes.hexify(blockchain.Script.pack(script));

const SporeData = table(
  {
    contentType: blockchain.Bytes,
    content: blockchain.Bytes,
    clusterId: blockchain.BytesOpt,
  },
  ['contentType', 'content', 'clusterId'],
);

export function getAssetInfo(cell: ResolvedInput | ResolvedOutput):
  | {
      id: string;
      parentId?: string;
      tags: string[];
      value?: bigint;
      protocols: AssetProtocolEnum[];
      meta?: object;
      decimals?: number;
    }
  | undefined {
  if (!cell.cellOutput.type) {
    return { id: NATIVE_ASSETS.CKB, tags: [], value: BigInt(cell.cellOutput.capacity), protocols: ['native_ckb'] };
  }

  switch (cell.cellOutput.type?.codeHash) {
    case LUMOS_CONFIG.SCRIPTS.SUDT.CODE_HASH:
      return {
        id: computeScriptHash(cell.cellOutput.type),
        tags: [],
        value: decodeUdtData(cell.data),
        protocols: ['sudt'],
      };
    case LUMOS_CONFIG.SCRIPTS.XUDT_RLS.CODE_HASH:
    case LUMOS_CONFIG.SCRIPTS.XUDT.CODE_HASH:
    case RUSD.codeHash:
      return {
        id: computeScriptHash(cell.cellOutput.type),
        tags: [],
        value: decodeUdtData(cell.data),
        protocols: ['xudt'],
      };
    case LUMOS_CONFIG.SCRIPTS.SPORE.CODE_HASH:
      const { clusterId } = SporeData.unpack(cell.data);
      return {
        id: cell.cellOutput.type.args,
        tags: [],
        parentId: clusterId,
        value: BigInt(1),
        meta: { typeHash: computeScriptHash(cell.cellOutput.type) },
        protocols: ['spore'],
        decimals: 0,
      };
    case LUMOS_CONFIG.SCRIPTS.SPORE_CLUSTER.CODE_HASH:
      // meta typeHash is used for explorer API parameter if needs
      return {
        id: cell.cellOutput.type.args,
        tags: [],
        meta: { typeHash: computeScriptHash(cell.cellOutput.type) },
        protocols: ['spore_cluster'],
        decimals: 0,
      };
    default:
      break;
  }
}

export function decodeOmigaDexArgs(args: string) {
  const data = args.startsWith('0x') ? args.slice(2) : args;

  if (data.length < 132) {
    throw new Error('The length of dex lock args must be longer than 66bytes');
  }

  const ownerLockHexLen = Uint32.unpack(`0x${data.slice(0, 8)}`) * 2;
  const ownerLock = blockchain.Script.unpack(`0x${data.substring(0, ownerLockHexLen)}`) as CKBComponents.Script;

  if (data.length < ownerLockHexLen + 34) {
    throw new Error('The length of dex lock args is invalid');
  }

  const setup = parseInt(data.substring(ownerLockHexLen, ownerLockHexLen + 2), 16);
  const totalValue = Uint128BE.unpack(`0x${data.substring(ownerLockHexLen + 2, ownerLockHexLen + 34)}`);

  return {
    ownerLock,
    setup,
    totalValue,
  };
}

export function getSporeVolume(input?: ResolvedOutput, output?: ResolvedOutput) {
  if (
    output &&
    [MAINNET.SCRIPTS.OMIGA_DEX, TESTNET.SCRIPTS.OMIGA_DEX].some((v) => isScriptOf(output.cellOutput.lock, v))
  ) {
    const { totalValue } = decodeOmigaDexArgs(output.cellOutput.lock.args);
    return totalValue;
  }
  if (
    input &&
    [MAINNET.SCRIPTS.OMIGA_DEX, TESTNET.SCRIPTS.OMIGA_DEX].some((v) => isScriptOf(input.cellOutput.lock, v))
  ) {
    const { totalValue, ownerLock } = decodeOmigaDexArgs(input.cellOutput.lock.args);
    if (
      output &&
      bytes.hexify(blockchain.Script.pack(output.cellOutput.lock)) === bytes.hexify(blockchain.Script.pack(ownerLock))
    ) {
      // output's lock is equal ownerlock, it means removed from shelves
      return undefined;
    }
    return totalValue;
  }
  return undefined;
}

export function setMaxForOverflow(max: BigNumber, value?: BigNumber | string | number) {
  return BigNumber(value ?? 0).gt(max) ? max : value;
}
