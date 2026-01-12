import axios from "axios";

export function shopifyClient(store, token) {
  return axios.create({
    baseURL: `https://${store}/admin/api/2025-01`,
    headers: {
      "X-Shopify-Access-Token": token,
      "Content-Type": "application/json"
    }
  });
}
