import { type Script } from '@ckb-lumos/lumos';

import { LUMOS_CONFIG, RUSD, SPORE_LIST } from '~/lib/constant';

type ScriptTemplate = { CODE_HASH: string; HASH_TYPE: string } | { codeHash: string; hashType: string };

export function isScriptOf(script: Script | undefined, template: ScriptTemplate): boolean {
  if (!script) return false;

  if ('CODE_HASH' in template) {
    return script.codeHash === template.CODE_HASH && script.hashType === template.HASH_TYPE;
  }
  return script.codeHash === template.codeHash && script.hashType === template.hashType;
}

export function isUdt(script: Script): boolean {
  return (
    isScriptOf(script, LUMOS_CONFIG.SCRIPTS.XUDT_RLS) ||
    isScriptOf(script, LUMOS_CONFIG.SCRIPTS.XUDT) ||
    isScriptOf(script, RUSD)
  );
}

export function isSudt(script: Script): boolean {
  return isScriptOf(script, LUMOS_CONFIG.SCRIPTS.SUDT);
}

export function isSpore(script: Script): boolean {
  return [LUMOS_CONFIG.SCRIPTS.SPORE, ...SPORE_LIST].some((v) => isScriptOf(script, v));
}

export type CellType = 'NORMAL' | 'DOB' | 'SUDT' | 'XUDT';
export function getCellType(script?: Script): CellType {
  if (!script) return 'NORMAL';
  if (isSpore(script)) return 'DOB';
  if (isSudt(script)) return 'SUDT';
  if (isUdt(script)) return 'XUDT';
  return 'NORMAL';
}
