import * as fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Low } from 'lowdb';
import { JSONFile } from 'lowdb/node';
import { stringify } from 'superjson';

export { noopLogger } from './internal';
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function snapshotify<F extends (...args: any[]) => Promise<any>>(
  fn: F,
  { namespace }: { namespace: string },
): F {
  const __dirname = dirname(fileURLToPath(import.meta.url));

  const decorated = async function (...args: unknown[]): Promise<unknown> {
    const dbPath = join(__dirname, '.test-cache', namespace, ...args.map((arg) => String(arg))) + '.json';
    if (!fs.existsSync(dirname(dbPath))) {
      fs.mkdirSync(dirname(dbPath), { recursive: true });
    }
    const db = new Low<Record<string, unknown>>(new JSONFile(dbPath), {});
    await db.read();
    const key = stringify(args);

    if (!(key in db.data)) {
      db.data[key] = await fn(...args);
      await db.write();
    }

    return db.data[key];
  };

  Object.defineProperty(decorated, 'name', { value: `Snapshot_${fn.name}`, writable: false });
  return decorated as F;
}
