import dotenv from 'dotenv';
dotenv.config();

/**
 * Centralized configuration and environment parsing for the project.
 * Import this to get validated, typed config values instead of reading process.env directly.
 */

const STORES = (process.env.STORES || 'A,B').split(',').map(s => s.trim().toUpperCase());
const PRIMARY_STORE = (process.env.PRIMARY_STORE || 'A').trim().toUpperCase();
const ALLOW_INVITES = process.env.ALLOW_INVITES === 'true';
const MEMBER_TAG = (process.env.MEMBER_TAG || 'member').toLowerCase();
const CONCURRENCY = Math.max(Number(process.env.CONCURRENCY || 3), 1);
const MAX_RETRIES = Math.max(Number(process.env.MAX_RETRIES || 3), 1);

const SHOPIFY_API_VERSION = process.env.SHOPIFY_API_VERSION || '2025-01';
const SHOPIFY_TIMEOUT_MS = Math.max(1000, Number(process.env.SHOPIFY_TIMEOUT_MS || 15000));
const USER_AGENT = process.env.USER_AGENT || 'shopify-bridge/1.0';

function getStores() {
  const map = {};
  for (const key of STORES) {
    const domain = process.env[`STORE_${key}_DOMAIN`];
    const token = process.env[`STORE_${key}_TOKEN`];
    if (domain && token) {
      map[key] = { domain, token, key };
    }
  }
  return map;
}

function validate() {
  const configured = getStores();
  if (!STORES.includes(PRIMARY_STORE)) {
    throw new Error(`PRIMARY_STORE (${PRIMARY_STORE}) must be one of STORES: ${STORES.join(',')}`);
  }
  if (!configured[PRIMARY_STORE]) {
    throw new Error(`Primary store ${PRIMARY_STORE} is not configured. Ensure STORE_<KEY>_DOMAIN and STORE_<KEY>_TOKEN env vars are set.`);
  }
  return true;
}

export default {
  STORES,
  PRIMARY_STORE,
  ALLOW_INVITES,
  MEMBER_TAG,
  CONCURRENCY,
  MAX_RETRIES,
  SHOPIFY_API_VERSION,
  SHOPIFY_TIMEOUT_MS,
  USER_AGENT,
  getStores,
  validate
};
