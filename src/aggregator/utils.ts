import { type ColumnBaseConfig, sql } from 'drizzle-orm';
import { type PgColumn } from 'drizzle-orm/pg-core';
import * as R from 'remeda';

export async function chunkSql<T, R>(chunkFn: (v: T[]) => Promise<R>, data: T[], chunk = 100) {
  const chunks = R.chunk(data, chunk);
  const r: R[] = [];
  for (const chunk of chunks) {
    r.push(await chunkFn(chunk));
  }
  return r.flat();
}

export function increment<T extends ColumnBaseConfig<'string', 'PgNumeric'> | ColumnBaseConfig<'number', 'PgInteger'>>(
  column: PgColumn<T>,
) {
  return sql`${column} + ${sql.raw(`EXCLUDED.${column.name}`)}`;
}

export function decrement<T extends ColumnBaseConfig<'string', 'PgNumeric'> | ColumnBaseConfig<'number', 'PgInteger'>>(
  column: PgColumn<T>,
) {
  return sql`${column} - ${sql.raw(`EXCLUDED.${column.name}`)}`;
}
