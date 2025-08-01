import { readFileSync } from 'node:fs';

import { type Config } from 'drizzle-kit';

export default {
  schema: './src/server/db/schema.ts',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
    ssl: process.env.DATABASE_CA_FILE ? { ca: readFileSync(process.env.DATABASE_CA_FILE) } : undefined,
  },
  tablesFilter: ['web3platform_*'],
  migrations: {
    table: 'web3platform_migrations', // `__drizzle_migrations` by default
    schema: 'public', // used in PostgreSQL only, `drizzle` by default
  },
} satisfies Config;
