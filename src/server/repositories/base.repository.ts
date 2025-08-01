import { type PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { type Kysely } from 'kysely';

import { ch as ch_, type Database } from '../ch';
import type * as schema from '../db/schema';

export class Repository {
  constructor(
    protected readonly db: PostgresJsDatabase<typeof schema>,
    protected readonly ch: Kysely<Database> = ch_,
  ) {}
}
