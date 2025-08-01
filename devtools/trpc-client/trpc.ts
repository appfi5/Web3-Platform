// do not forget to do these steps before building the trpc schema
// 1. comment the errorFormatter in src/server/api/trpc.ts
// 2. change the `.context<typeof createTRPCContext>()` to `.context<any>` in src/server/api/trpc.ts
// this is because we don't need export the context and errorFormatter in the schema for the client

export { type AppRouter as TRPCRouter } from '~/server/api/root';
