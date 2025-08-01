import { config } from '@ckb-lumos/lumos';
import { createConfig, type ScriptConfig } from '@ckb-lumos/lumos/config';

import { env } from '~/env';

export const TESTNET = createConfig({
  PREFIX: config.TESTNET.PREFIX,
  SCRIPTS: {
    ...config.TESTNET.SCRIPTS,
    XUDT: {
      CODE_HASH: '0x50bd8d6680b8b9cf98b73f3c08faf8b2a21914311954118ad6609be6e78a1b95',
      HASH_TYPE: 'data1',
      TX_HASH: '0xbf6fb538763efec2a70a6a3dcb7242787087e1030c4e7d86585bc63a9d337f5f',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    XUDT_RLS: config.TESTNET.SCRIPTS.XUDT,
    SPORE_CLUSTER: {
      CODE_HASH: 'code',
      HASH_TYPE: 'data1',
      TX_HASH: '0x49551a20dfe39231e7db49431d26c9c08ceec96a29024eef3acc936deeb2ca76',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    UNIQUE: {
      CODE_HASH: '0x8e341bcfec6393dcd41e635733ff2dca00a6af546949f70c57a706c0f344df8b',
      HASH_TYPE: 'type',
      TX_HASH: '0xff91b063c78ed06f10a1ed436122bd7d671f9a72ef5f5fa28d05252c17cf4cef',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    BTC_TIME: {
      CODE_HASH: '0x00cdf8fab0f8ac638758ebf5ea5e4052b1d71e8a77b9f43139718621f6849326',
      HASH_TYPE: 'type',
      TX_HASH: '0xde0f87878a97500f549418e5d46d2f7704c565a262aa17036c9c1c13ad638529',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    SPORE: {
      CODE_HASH: '0x685a60219309029d01310311dba953d67029170ca4848a4ff638e57002130a0d',
      HASH_TYPE: 'data1',
      TX_HASH: '0x5e8d2a517d50fd4bb4d01737a7952a1f1d35c8afc77240695bb569cd7d9d5a1f',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    OMIGA_DEX: {
      CODE_HASH: '0x493510d54e815611a643af97b5ac93bfbb45ddc2aae0f2dceffaf3408b4fcfcd',
      HASH_TYPE: 'type',
      TX_HASH: '0xc17040a3723df8f27c344d5e86e254f1d27e1181a5484cb3722416ef09d246ec',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    RGBPP: {
      CODE_HASH: '0x61ca7a4796a4eb19ca4f0d065cb9b10ddcf002f10f7cbb810c706cb6bb5c3248',
      HASH_TYPE: 'type',
      TX_HASH: '0xf1de59e973b85791ec32debbba08dff80c63197e895eb95d67fc1e9f6b413e00',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
  },
});

export const MAINNET = createConfig({
  PREFIX: config.MAINNET.PREFIX,
  SCRIPTS: {
    ...config.MAINNET.SCRIPTS,
    XUDT_RLS: config.TESTNET.SCRIPTS.XUDT,
    SPORE: {
      CODE_HASH: '0x4a4dce1df3dffff7f8b2cd7dff7303df3b6150c9788cb75dcf6747247132b9f5',
      HASH_TYPE: 'data1',
      TX_HASH: '0x96b198fb5ddbd1eed57ed667068f1f1e55d07907b4c0dbd38675a69ea1b69824',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    SPORE_CLUSTER: {
      CODE_HASH: '0x7366a61534fa7c7e6225ecc0d828ea3b5366adec2b58206f2ee84995fe030075',
      HASH_TYPE: 'data1',
      TX_HASH: '0xe464b7fb9311c5e2820e61c99afc615d6b98bdefbe318c34868c010cbd0dc938',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    UNIQUE: {
      CODE_HASH: '0x2c8c11c985da60b0a330c61a85507416d6382c130ba67f0c47ab071e00aec628',
      HASH_TYPE: 'data1',
      TX_HASH: '0x67524c01c0cb5492e499c7c7e406f2f9d823e162d6b0cf432eacde0c9808c2ad',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    BTC_TIME: {
      CODE_HASH: '0x70d64497a075bd651e98ac030455ea200637ee325a12ad08aff03f1a117e5a62',
      HASH_TYPE: 'type',
      TX_HASH: '0x6257bf4297ee75fcebe2654d8c5f8d93bc9fc1b3dc62b8cef54ffe166162e996',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    OMIGA_DEX: {
      CODE_HASH: '0xab0ede4350a201bd615892044ea9edf12180189572e49a7ff3f78cce179ae09f',
      HASH_TYPE: 'type',
      TX_HASH: '0xaab4fef7338c7108d4d2507c29122768126f9303f173db9f6ef59b9af84186b7',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
    RGBPP: {
      CODE_HASH: '0xbc6c568a1a0d0a09f6844dc9d74ddb4343c32143ff25f727c59edf4fb72d6936',
      HASH_TYPE: 'type',
      TX_HASH: '0x04c5c3e69f1aa6ee27fb9de3d15a81704e387ab3b453965adbe0b6ca343c6f41',
      INDEX: '0x0',
      DEP_TYPE: 'code',
    },
  },
});

export const LUMOS_CONFIG = env.NEXT_PUBLIC_IS_MAINNET ? MAINNET : TESTNET;

export const SPORE_LIST: ScriptConfig[] = [
  {
    CODE_HASH: '0x685a60219309029d01310311dba953d67029170ca4848a4ff638e57002130a0d',
    HASH_TYPE: 'data1',
    TX_HASH: '0x5e8d2a517d50fd4bb4d01737a7952a1f1d35c8afc77240695bb569cd7d9d5a1f',
    INDEX: '0x0',
    DEP_TYPE: 'code',
  },
  {
    CODE_HASH: '0x5e063b4c0e7abeaa6a428df3b693521a3050934cf3b0ae97a800d1bc31449398',
    HASH_TYPE: 'data1',
    TX_HASH: '0x06995b9fc19461a2bf9933e57b69af47a20bf0a5bc6c0ffcb85567a2c733f0a1',
    INDEX: '0x0',
    DEP_TYPE: 'code',
  },
  {
    CODE_HASH: '0xbbad126377d45f90a8ee120da988a2d7332c78ba8fd679aab478a19d6c133494',
    HASH_TYPE: 'data1',
    TX_HASH: '0xfd694382e621f175ddf81ce91ce2ecf8bfc027d53d7d31b8438f7d26fc37fd19',
    INDEX: '0x0',
    DEP_TYPE: 'code',
  },
];

// https://testnet.explorer.nervos.org/xudt/0x45b32a2bc4285d0a09678eb11960ddc8707bc2779887a09d482e9bfe9a2cdf52
const RUST_TESTNET = {
  codeHash: '0x1142755a044bf2ee358cba9f2da187ce928c91cd4dc8692ded0337efa677d21a',
  hashType: 'type',
};

// https://explorer.nervos.org/xudt/0x71ff665b40ba044b1981ea9a8965189559c8e01e8cdfa34a3cc565e1f870a95c
const RUST_MAINNET = {
  codeHash: '0x26a33e0815888a4a0614a0b7d09fa951e0993ff21e55905510104a0b1312032b',
  hashType: 'type',
};

export const RUSD = env.NEXT_PUBLIC_IS_MAINNET ? RUST_MAINNET : RUST_TESTNET;

export const PROTOCOLS = ['native_ckb', 'native_btc', 'sudt', 'xudt', 'spore_cluster', 'spore'] as const;
