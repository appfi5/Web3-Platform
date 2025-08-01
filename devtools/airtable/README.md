# Airtable Init

This documentation is for initializing the Airtable data with a CSV file.

## Quick Start

```bash
AIRTABLE_BASE_ID=...\
AIRTABLE_BEARER_TOKEN=...\
bun init.ts --csv my-csv-path.csv
```

## CSV Format

The CSV [demo.csv](demo.csv) is a sample that is exported from the CKB Explorer. The header includes the following fields:

- `icon_file`
- `decimal`
- `type_hash`
- `name`
- `symbol`
- `published`
- `description`
- `tags`

To export the CSV, please contact the CKB Explorer team.
