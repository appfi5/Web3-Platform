import { parse } from 'csv-parse/sync';
import { readFileSync } from 'fs';
import { chunk } from 'remeda';
import { from, mergeMap, tap } from 'rxjs';
import { parseArgs } from 'util';

import { type Logger } from '~/aggregator/types';
import { airtable } from '~/clients';
import { type Asset } from '~/clients/airtable';

const logger: Logger = console;

// the row number of each chunk
const CHUNK_SIZE = 10;

// the number of parallel to call the Airtable create API
const PARALLEL_REQUEST = 10;

const AIRTABLE_TAG_LABEL_RGBPP = 'RGB++';
const AIRTABLE_TAG_LABEL_LIMITED_SUPPLY = 'Limited Supply';

// the supply limited tag in the csv file, which is exported from CKB explorer
// {rgb++,layer-1-asset,supply-limited}
const CSV_TAG_SUPPLY_LIMITED = 'supply-limited';

// "icon_file","decimal","type_hash","name","symbol","published","description","tags"
// exported UDT from CKB explorer, please contact the CKB Explorer team to get the data
type ExplorerExportUDT = {
  icon_file: string;
  decimal: string;
  type_hash: string;
  name: string;
  symbol: string;
  published: string;
  description: string;
  tags: string;
};

type TagIdMap = Record<'RGB++' | 'Limited Supply', string>;

async function main() {
  const {
    values: { csv: csvPath },
  } = parseArgs({ options: { csv: { type: 'string' } } });

  if (!csvPath) {
    throw new Error('Please provide the csv file path');
  }

  const udts = parse<ExplorerExportUDT>(readFileSync(csvPath), {
    columns: true,
    skip_empty_lines: true,
  });

  let count = 0;

  const tagIdMap: TagIdMap = await airtable
    .table<{ label: string }>('asset_tag')
    .select()
    .all()
    .then((res) => {
      return res.reduce(
        (map, row) =>
          row.fields.label === 'RGB++' || row.fields.label === 'Limited Supply'
            ? { ...map, [row.fields.label]: row.id }
            : map,
        {} as TagIdMap,
      );
    });

  from(
    chunk(
      udts.map<Partial<Asset>>((item) => {
        const parsedDecimals = Number(item.decimal);
        const decimals = parsedDecimals > 0 ? parsedDecimals : item.name || item.symbol ? 0 : undefined;

        return {
          icon: item.icon_file.startsWith('http') ? item.icon_file : undefined,
          decimals,
          id: item.type_hash,
          name: item.name,
          symbol: item.symbol,
          public: item.published === 'true',
          description: item.description,
          tags: [
            // all xUDTs are RGB++ tokens
            tagIdMap[AIRTABLE_TAG_LABEL_RGBPP],
            item.tags.includes(CSV_TAG_SUPPLY_LIMITED) ? tagIdMap[AIRTABLE_TAG_LABEL_LIMITED_SUPPLY] : undefined,
          ].filter((val) => val != null),
        };
      }),
      CHUNK_SIZE,
    ),
  )
    .pipe(
      mergeMap(
        (values) => airtable.table('asset').create(values.map((asset) => ({ fields: asset }))),
        PARALLEL_REQUEST,
      ),
      tap((res) => (count += res.length)),
    )
    .subscribe({
      next: () => {
        logger.info(`Progress${count}/${udts.length}`);
      },
      error: (e) => {
        logger.error(e);
      },
      complete: () => {
        logger.info(`Completed`);
      },
    });
}

void main();
