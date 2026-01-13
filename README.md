# Shopify Bridge

Lightweight utility to sync customers between multiple Shopify stores.

## Features ✅

- Multi-store support (configure stores via environment variables)
- Selectable primary source store (`PRIMARY_STORE`) — store A can be the primary
- Safe create/update flows with tag merging and optional invite opt-in
- Retries with exponential backoff on rate limits and transient errors
- Bulk sync with configurable concurrency

---

## Environment variables (required / recommended) 🔧

Create a `.env` (never commit secrets):

- `STORES` (default: `A,B`) — comma-separated store keys used by the app (e.g. `A,B,C`).
- `PRIMARY_STORE` (default: `A`) — which store is considered the source-of-truth.
- `STORE_<KEY>_DOMAIN` — Shopify store domain for each store key (e.g. `STORE_A_DOMAIN`).
- `STORE_<KEY>_TOKEN` — Shopify access token for each store key (e.g. `STORE_A_TOKEN`).
- `ALLOW_INVITES` (`true`|`false`) — if `true`, created customers will receive Shopify invite emails (default: `false`). Use cautiously.
- `MEMBER_TAG` (default: `member`) — tag used to pick customers during bulk sync.
- `CONCURRENCY` (default: `3`) — number of concurrent customer syncs in bulk mode.
- `MAX_RETRIES` (default: `3`) — retry attempts for transient failures.

Important: keep tokens secret and use least-privilege API access where possible.

---

## Sample `.env.example`

See `.env.example` in this repo for a template.

---

## Usage

1. Install dependencies and set environment variables (in `.env`):

   ```bash
   npm install
   ```

2. Run a manual bulk sync:

   - Using node directly:

   ```bash
   node runSync.js --limit=50
   ```

   - Using the provided npm script (recommended):

   ```bash
   npm run sync -- --limit=50
   ```

   Run a single-customer sync by id:

   ```bash
   npm run sync:single -- --id=1234567890
   ```

   Note: `package.json` uses `"type":"module"` so `node runSync.js` works with ESM.

### Programmatic / webhook usage

- To sync a single customer in response to a webhook call, call `syncSingleCustomerAcrossStores(customerId)`.
- To disable a customer across stores when deleted: call `disableCustomerAcrossStoresByCustomerId(customerId)`.

---

## Security & operational notes ⚠️

- Do not enable `ALLOW_INVITES` unless you understand the email flow — better to send invites manually.
- Use a staging store when testing.
- Consider adding structured logging and monitoring for production use.

---

If you'd like, I can add a ready-to-run `runSync.js` script and an `npm` script for convenience. 🔧
