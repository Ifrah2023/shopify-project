import { getPrimaryStoreClient, getSecondaryStoreClients } from "./shopify.js";
import { Logger } from "./config/logger.js";
import config from "./config/config.js";

const logger = new Logger("SyncMembers");

// has require function (robust)
function getRequiredTags() {
  // Support comma-separated MEMBER_TAG env var; fallback to 'member'
  return (config.MEMBER_TAG || 'member')
    .split(",")
    .map(t => t.trim().toLowerCase())
    .filter(Boolean);
}

function hasRequiredTag(tags = "") {
  try {
    const tagList = (tags || "")
      .split(",")
      .map(t => t.trim().toLowerCase())
      .filter(Boolean);

    const requiredTags = getRequiredTags();

    if (!requiredTags.length) return false;

    return requiredTags.some(required => tagList.includes(required));
  } catch (err) {
    logger.error("hasRequiredTag failed:", err.message);
    return false;
  }
}


/* ======================================================
   VALIDATION UTILITIES
====================================================== */

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || "");
}

function validateCustomer(customer) {
  if (!customer) {
    logger.warn("Customer is null or undefined");
    return false;
  }

  if (!customer.id) {
    logger.warn("Customer missing ID");
    return false;
  }

  if (!customer.email || !isValidEmail(customer.email)) {
    logger.warn(`Invalid email: ${customer.email}`);
    return false;
  }

  return true;
}


/* ======================================================
   PRIMARY STORE OPERATIONS
====================================================== */

export async function fetchPrimaryStoreMembers(limit = 10) {
  const primaryClient = getPrimaryStoreClient();
  const res = await primaryClient.get(`/customers.json?limit=${limit}`);
  return res.data?.customers || [];
}

async function getPrimaryStoreCustomer(customerId) {
  const primaryClient = getPrimaryStoreClient();
  const res = await primaryClient.get(`/customers/${customerId}.json`);
  return res.data.customer;
}

/* ======================================================
   SECONDARY STORE OPERATIONS
====================================================== */

async function findCustomerInSecondaryStore(storeClient, email) {
  const res = await storeClient.get(
    `/customers/search.json?query=email:${encodeURIComponent(email)}`
  );
  return res.data.customers.length ? res.data.customers[0] : null;
}

async function updateSecondaryStoreCustomer(storeClient, storeId, existing, customer) {
  if (!hasRequiredTag(customer.tags)) {
    logger.info(`Skipping update in ${storeId}: not a member`);
    return;
  }

  await storeClient.put(`/customers/${existing.id}.json`, {
    customer: {
      id: existing.id,
      email: customer.email,
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      tags: customer.tags
    }
  });

  logger.success(`Updated customer in ${storeId}: ${customer.email}`);
}

async function createSecondaryStoreCustomer(storeClient, storeId, customer) {
  if (!customer.tags || !hasRequiredTag(customer.tags)) {
  logger.warn(`⛔ CREATE BLOCKED: ${customer.email}`);
  return;
}

  // if (!hasRequiredTag(customer.tags)) {
  //   logger.info(`Skipping create in ${storeId}: not a member`);
  //   return;
  // }

  await storeClient.post("/customers.json", {
    customer: {
      email: customer.email,
      first_name: customer.first_name || "",
      last_name: customer.last_name || "",
      tags: customer.tags,
      send_email_invite: true
    }
  });

  logger.success(`Created customer in ${storeId}: ${customer.email}`);
}

async function disableSecondaryStoreCustomer(storeClient, storeId, existing, email) {
  await storeClient.put(`/customers/${existing.id}.json`, {
    customer: {
      id: existing.id,
      state: "disabled",
      tags: "deleted-from-primary"
    }
  });

  logger.success(`Disabled customer in ${storeId}: ${email}`);
}

/* ======================================================
   CORE SYNC (WEBHOOK)
====================================================== */

// export async function syncCustomerToAllStores(customerId) {
//   const primaryCustomer = await getPrimaryStoreCustomer(customerId);

//   if (!validateCustomer(primaryCustomer)) return;
//   if (!hasRequiredTag(primaryCustomer.tags)) {
//     logger.info(`Skipping non-member: ${primaryCustomer.email}`);
//     return;
//   }

//   const secondaryStores = getSecondaryStoreClients();

//   for (const { storeId, client } of secondaryStores) {
//     try {
//       const existing = await findCustomerInSecondaryStore(
//         client,
//         primaryCustomer.email
//       );

//       if (existing) {
//         await updateSecondaryStoreCustomer(
//           client,
//           storeId,
//           existing,
//           primaryCustomer
//         );
//       } else {
//         await createSecondaryStoreCustomer(
//           client,
//           storeId,
//           primaryCustomer
//         );
//       }
//     } catch (err) {
//       logger.error(`Sync failed in ${storeId}`, err.message);
//     }
//   }
// }
export async function syncCustomerToAllStores(customerId) {
  const primaryCustomer = await getPrimaryStoreCustomer(customerId);

  console.log("DEBUG primary tags:", primaryCustomer.tags);

  if (!validateCustomer(primaryCustomer)) return;

  // 🔥 HARD STOP
  if (!primaryCustomer.tags || !hasRequiredTag(primaryCustomer.tags)) {
    logger.warn(`⛔ BLOCKED (not member): ${primaryCustomer.email}`);
      return;
  }

  const secondaryStores = getSecondaryStoreClients();

  for (const { storeId, client } of secondaryStores) {
    try {
      const existing = await findCustomerInSecondaryStore(
        client,
        primaryCustomer.email
      );

      if (existing) {
        await updateSecondaryStoreCustomer(
          client,
          storeId,
          existing,
          primaryCustomer
        );
      } else {
        await createSecondaryStoreCustomer(
          client,
          storeId,
          primaryCustomer
        );
      }
    } catch (err) {
      logger.error(`Sync failed in ${storeId}`, err.message);
    }
  }
}

  



/* ======================================================
   DELETE / DISABLE HANDLER (WEBHOOK)
====================================================== */

export async function disableCustomerInAllStores(customerId) {
  const primaryCustomer = await getPrimaryStoreCustomer(customerId);

  if (!validateCustomer(primaryCustomer)) return;
  if (!hasRequiredTag(primaryCustomer.tags)) return;

  const secondaryStores = getSecondaryStoreClients();

  for (const { storeId, client } of secondaryStores) {
    try {
      const existing = await findCustomerInSecondaryStore(
        client,
        primaryCustomer.email
      );

      if (!existing) continue;

      await disableSecondaryStoreCustomer(
        client,
        storeId,
        existing,
        primaryCustomer.email
      );
    } catch (err) {
      logger.error(`Disable failed in ${storeId}`, err.message);
    }
  }
}

/* ======================================================
   BULK SYNC (MANUAL RUN)
====================================================== */

export async function syncMembersToAllStores(limit = 10) {
  const customers = await fetchPrimaryStoreMembers(limit);
  const results = [];

  for (const customer of customers) {
    if (!validateCustomer(customer)) continue;
    if (!hasRequiredTag(customer.tags)) continue;

    try {
      await syncCustomerToAllStores(customer.id);
      results.push({ email: customer.email, synced: true });
    } catch (err) {
      results.push({ email: customer.email, synced: false });
    }
  }

  logger.success(`Bulk sync completed: ${results.length} members`);
  return results;
}

/* ======================================================
   BACKWARD-COMPATIBLE EXPORTS
   (for server.js imports)
====================================================== */

// syncMembers -> syncMembersToAllStores
export { syncMembersToAllStores as syncMembers };

// fetchStoreAMembers -> fetchPrimaryStoreMembers
export { fetchPrimaryStoreMembers as fetchStoreAMembers };

// syncSingleCustomerToStoreB -> syncCustomerToAllStores
export { syncCustomerToAllStores as syncSingleCustomerToStoreB };

// disableCustomerInStoreBByCustomerId -> disableCustomerInAllStores
export { disableCustomerInAllStores as disableCustomerInStoreBByCustomerId };

// Utilities (public)
export { hasRequiredTag };
