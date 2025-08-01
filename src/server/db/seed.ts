import { syncAssetAndTagsFromAirtable } from '~/aggregator/airtable/sync';

syncAssetAndTagsFromAirtable().subscribe(() => {
  console.log('💨 Sync data from Airtable success');
  process.exit(0);
});
