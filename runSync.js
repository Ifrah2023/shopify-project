import dotenv from 'dotenv';
dotenv.config();

import {
  syncMembers,
  syncSingleCustomerAcrossStores,
  disableCustomerAcrossStoresByCustomerId
} from './src/config/src/syncMembers.js';

function parseArg(name) {
  const idx = process.argv.findIndex(a => a === name || a.startsWith(`${name}=`));
  if (idx === -1) return null;
  const val = process.argv[idx];
  if (val.includes('=')) return val.split('=')[1];
  return process.argv[idx + 1] || null;
}

function usage() {
  console.log(`Usage:

  # Bulk sync (limit optional)
  node runSync.js --limit=50
  npm run sync -- --limit=50

  # Single-customer sync by id
  node runSync.js --id=123456
  npm run sync:single -- --id=123456

  # Disable a customer across stores by id
  node runSync.js --id=123456 --action=disable
`);
}

(async function main() {
  try {
    const help = process.argv.includes('--help') || process.argv.includes('-h');
    if (help) return usage();

    const id = parseArg('--id');
    const limit = parseArg('--limit') || 50;
    const action = parseArg('--action');

    if (id) {
      if (action === 'disable') {
        console.log(`Disabling customer across stores (id=${id})`);
        await disableCustomerAcrossStoresByCustomerId(id);
        console.log('Done.');
        return;
      }

      console.log(`Syncing single customer across stores (id=${id})`);
      await syncSingleCustomerAcrossStores(id);
      console.log('Done.');
      return;
    }

    console.log(`Running bulk sync (limit=${limit})`);
    const res = await syncMembers(Number(limit));
    console.log('Bulk sync finished:', { processed: res.length });
  } catch (err) {
    console.error('Error during runSync:', err.message || err);
    process.exitCode = 1;
  }
})();