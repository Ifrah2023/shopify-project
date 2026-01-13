// import axios from "axios";
// import https from "https";
// import config from "./config/config.js";

// /**
//  * Create a preconfigured Shopify axios client with safer defaults.
//  * - API version/timeout/user-agent come from `config`
//  * - keeps connections alive (Agent keepAlive)
//  * - lightweight 429 retry (one attempt based on Retry-After)
//  */
// export function shopifyClient(store, token) {
//   const apiVersion = config.SHOPIFY_API_VERSION;
//   const timeout = config.SHOPIFY_TIMEOUT_MS;
//   const userAgent = config.USER_AGENT;

//   const httpsAgent = new https.Agent({ keepAlive: true, maxSockets: 10 });

//   const client = axios.create({
//     baseURL: `https://${store}/admin/api/${apiVersion}`,
//     timeout,
//     headers: {
//       "X-Shopify-Access-Token": token,
//       "Content-Type": "application/json",
//       "User-Agent": userAgent
//     },
//     httpsAgent,
//     maxRedirects: 3
//   });

//   // Simple response interceptor to handle 429 Retry-After header (single retry)
//   client.interceptors.response.use(
//     response => response,
//     async error => {
//       const status = error.response?.status;
//       const config = error.config || {};

//       // Only retry once to avoid endless loops
//       if (status === 429 && !config.__retryCount) {
//         const retryAfter = Number(error.response.headers["retry-after"] || 1);
//         config.__retryCount = 1;
//         const backoffMs = Math.min(30000, retryAfter * 1000 + Math.random() * 200);
//         await new Promise(resolve => setTimeout(resolve, backoffMs));
//         return client.request(config);
//       }

//       // Normalize error: ensure error.response is available and attach safe info
//       const safe = {
//         status: error.response?.status,
//         url: config.url,
//         method: config.method,
//         data: error.response?.data ? (typeof error.response.data === 'object' ? error.response.data : String(error.response.data).slice(0, 1000)) : undefined
//       };

//       const err = new Error(`Shopify request failed (${safe.method || 'UNKNOWN'} ${safe.url}) status=${safe.status}`);
//       err.response = error.response;
//       err.safeInfo = safe;
//       err.cause = error;
//       return Promise.reject(err);
//     }
//   );

//   return client;
// }

import config from "./config/config.js";
import axios from "axios";

const { STORES, PRIMARY_STORE } = config;

/**
 * Create Shopify REST client
 */
export function shopifyClient(domain, token) {
  return axios.create({
    baseURL: `https://${domain}/admin/api/2025-01`,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json"
    }
  });
}

/**
 * PRIMARY store client
 */
export function getPrimaryStoreClient() {
  const stores = config.getStores();
  const primary = stores[PRIMARY_STORE];

  if (!primary) {
    throw new Error("Primary store not configured");
  }

  return shopifyClient(primary.domain, primary.token);
}

/**
 * SECONDARY store clients
 */
export function getSecondaryStoreClients() {
  const stores = config.getStores();

  return Object.keys(stores)
    .filter(key => key !== PRIMARY_STORE)
    .map(key => ({
      storeId: key,
      domain: stores[key].domain,
      client: shopifyClient(stores[key].domain, stores[key].token)
    }));
}
