## Usage

1. Comment the routes that you don't want to export to the client in [src/server/api/root.ts](../../src/server/api/root.ts). For example,

```diff
-import { addressRouter } from './routers/address';
+// import { addressRouter } from './routers/address';
-import { assetRouter } from './routers/asset';
+// import { assetRouter } from './routers/asset';
// import { blockRouter } from './routers/block';
...


export const appRouter = createTRPCRouter({
- home: homeRouter,
+ // home: homeRouter,
- block: blockRouter,
+ // block: blockRouter,
- tx: txRouter,
+ // tx: txRouter,
- address: addressRouter,
+ // address: addressRouter,
- asset: assetRouter,
+ // asset: assetRouter,
rgbpp: rgbppRouter,
- explorer: explorerRouter,
+ // explorer: explorerRouter,
  temp: {
    btc: btcRouter,
  },
});
```

2. Mark the context as `any` in [src/server/api/trpc.ts](../../src/server/api/trpc.ts). For example,

```diff
-export const createTRPCContext = async (opts: { req: NextRequest }) => {
+export const createTRPCContext: any = async (opts: { req: NextRequest }) => {

-const t = initTRPC.context<typeof createTRPCContext>
+const t = initTRPC.context<any>().create<any>({
```

3. Build the client.

```sh
npx tsup
```
