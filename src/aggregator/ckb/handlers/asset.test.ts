import { createTestSourceService } from '~/aggregator/ckb/test-source-service';

import { decodeUniqueData, prepare } from './asset';

test('decodeUniqueData', () => {
  expect(decodeUniqueData('0x08045365616c045365616c')).toEqual({ decimals: 8, name: 'Seal', symbol: 'Seal' });
});

const ignoreAssetBigInt = (assets: Awaited<ReturnType<typeof prepare>>) => assets.map(({ totalSupply: _, ...v }) => v);

test('prepare asset', async () => {
  const sourceService = createTestSourceService();
  const resolvedBlock = await sourceService.getResolvedBlock(
    '0x8c1ef9bf5b31371f88172bc20f13d239379adfcdda6a13a923085f7820a88afb',
  );
  const assets = await prepare({ block: resolvedBlock! });

  expect(ignoreAssetBigInt(assets)).toEqual([
    {
      id: '0x178fb47b597a56d48b549226aff59f750b4784250c7f40f781b64ef090a8a0a7',
      layer: 2,
      name: 'Seal',
      symbol: 'Seal',
      decimals: 8,
      firstFoundBlock: '0x8c1ef9bf5b31371f88172bc20f13d239379adfcdda6a13a923085f7820a88afb',
      firstMintAt: new Date('2024-04-03T20:19:28.610Z'),
      tags: [],
      meta: undefined,
      parentId: undefined,
      protocols: ['xudt'],
    },
  ]);
});

test('cluster spore', async () => {
  const sourceService = createTestSourceService();
  const resolvedBlock = await sourceService.getResolvedBlock(
    '0x5e480b2c995570e796d1e94c10639722239a70f3de177f101e629bcab33f56fd',
  );
  const assets = await prepare({ block: resolvedBlock! });

  expect(ignoreAssetBigInt(assets)).toEqual([
    {
      id: '0x4ecd33e6f999de2b6ab02576079fc3c8c87469edff1bf0719198e32c4e61b82e',
      meta: { typeHash: '0x8da9db1f3a34aaf5a6e861a39b3648e08c594f2552f2884bc1a4db56ef0b8879' },
      layer: 2,
      name: 'Unknown',
      symbol: 'Unknown',
      firstFoundBlock: '0x5e480b2c995570e796d1e94c10639722239a70f3de177f101e629bcab33f56fd',
      firstMintAt: new Date('2024-10-21T11:29:25.284Z'),
      tags: [],
      protocols: ['spore_cluster'],
      decimals: 0,
    },
  ]);
});

test('spore with cluster', async () => {
  const sourceService = createTestSourceService();
  const resolvedBlock = await sourceService.getResolvedBlock(
    '0x2dff3cd42a97cc9c93c9a0d4afbe55dd53ff34f7658f00d862c39f2963b9b96f',
  );
  const assets = await prepare({ block: resolvedBlock! });

  expect(ignoreAssetBigInt(assets)).toEqual([
    {
      id: '0x0ea54cf8c57f0138b886c6a533bc8fae9e1a7d9d44b7d2583d5cccd0fb5bcb12',
      parentId: '0x4ecd33e6f999de2b6ab02576079fc3c8c87469edff1bf0719198e32c4e61b82e',
      layer: 2,
      name: 'Unknown',
      symbol: 'Unknown',
      firstFoundBlock: '0x2dff3cd42a97cc9c93c9a0d4afbe55dd53ff34f7658f00d862c39f2963b9b96f',
      firstMintAt: new Date('2024-10-23T06:18:12.422Z'),
      tags: [],
      meta: {
        typeHash: '0x5089aaa20647c854d3bdcb93d3dcd46759c61eeed5fea7a32712499a0f91bc22',
      },
      protocols: ['spore'],
      decimals: 0,
    },
    {
      id: '0xb8ea098348759f19ba2466342f6cc3ba6aeb0810076f3d74144c63b7a90f1257',
      parentId: '0x4ecd33e6f999de2b6ab02576079fc3c8c87469edff1bf0719198e32c4e61b82e',
      layer: 2,
      name: 'Unknown',
      symbol: 'Unknown',
      firstFoundBlock: '0x2dff3cd42a97cc9c93c9a0d4afbe55dd53ff34f7658f00d862c39f2963b9b96f',
      firstMintAt: new Date('2024-10-23T06:18:12.422Z'),
      tags: [],
      meta: {
        typeHash: '0x734102f838fa41e5ce9742d72b7feabc99bed007e4a4be63b5b77c529f910e30',
      },
      protocols: ['spore'],
      decimals: 0,
    },
  ]);
});

test('spore without cluster', async () => {
  const sourceService = createTestSourceService();
  const resolvedBlock = await sourceService.getResolvedBlock(
    '0x656522b97a90bf61828e62b7e1bd181f1e6f313de7e60bac3c3bc48c7de90ad8',
  );
  const assets = await prepare({ block: resolvedBlock! });

  expect(ignoreAssetBigInt(assets)).toEqual([
    {
      id: '0xd432a4350481087b86552750f617c16735712846e4e5e19d1ba0cc9b8be0f123',
      layer: 2,
      name: 'Unknown',
      symbol: 'Unknown',
      firstFoundBlock: '0x656522b97a90bf61828e62b7e1bd181f1e6f313de7e60bac3c3bc48c7de90ad8',
      firstMintAt: new Date('2024-01-25T09:41:12.804Z'),
      tags: [],
      parentId: undefined,
      meta: {
        typeHash: '0x204e404bcf8c12a27bb7e59aba34a31a165006349ac7552c310c99a9f4cc21f0',
      },
      protocols: ['spore'],
      decimals: 0,
    },
  ]);
});
