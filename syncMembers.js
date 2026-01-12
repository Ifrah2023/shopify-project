import dotenv from "dotenv";
dotenv.config();

import { shopifyClient } from "./shopify.js";

/* ======================================================
   SHOPIFY CLIENTS
====================================================== */

const storeA = shopifyClient(
  process.env.STORE_A_DOMAIN,
  process.env.STORE_A_TOKEN
);

const storeB = shopifyClient(
  process.env.STORE_B_DOMAIN,
  process.env.STORE_B_TOKEN
);

/* ======================================================
   FETCH LIMITED MEMBERS FROM STORE A (TEST / BULK)
====================================================== */

export async function fetchStoreAMembers() {
  const res = await storeA.get("/customers.json?limit=10");
  console.log("📦 Total customers fetched:", res.data.customers.length);
  return res.data.customers;
}

/* ======================================================
   FIND CUSTOMER IN STORE B BY EMAIL
====================================================== */

async function findCustomerInStoreB(email) {
  const res = await storeB.get(
    `/customers/search.json?query=email:${email}`
  );

  return res.data.customers.length > 0
    ? res.data.customers[0]
    : null;
}

/* ======================================================
   UPDATE STORE B CUSTOMER (SAFE)
====================================================== */

async function updateStoreBCustomer(existing, customerFromA) {
  const mergedTags = Array.from(
    new Set(
      `${existing.tags || ""},${customerFromA.tags || ""}`
        .split(",")
        .map(t => t.trim())
        .filter(Boolean)
    )
  ).join(",");

  await storeB.put(`/customers/${existing.id}.json`, {
    customer: {
      id: existing.id,
      first_name: customerFromA.first_name,
      last_name: customerFromA.last_name,
      tags: mergedTags
    }
  });

  console.log(`🔁 Store B UPDATED: ${customerFromA.email}`);
}

/* ======================================================
   CREATE + INVITE CUSTOMER IN STORE B
====================================================== */

async function createStoreBCustomer(customer) {
  await storeB.post("/customers.json", {
    customer: {
      email: customer.email,
      first_name: customer.first_name,
      last_name: customer.last_name,
      tags: customer.tags || "",
      send_email_invite: true
    }
  });

  console.log(`📩 Store B CREATED & INVITED: ${customer.email}`);
}

/* ======================================================
   🔥 CORE FUNCTION — WEBHOOK REAL-TIME SYNC
====================================================== */

export async function syncSingleCustomerToStoreB(customerId) {
  try {
    /* 1️⃣ Fresh fetch from Store A */
    const res = await storeA.get(`/customers/${customerId}.json`);
    const customer = res.data.customer;

    if (!customer || !customer.email) {
      console.log("⚠️ No email found — skipping");
      return;
    }

    /* 2️⃣ Find in Store B */
    const existing = await findCustomerInStoreB(customer.email);

    if (existing) {
      await updateStoreBCustomer(existing, customer);
      return;
    }

    /* 3️⃣ Create if not exists */
    await createStoreBCustomer(customer);

  } catch (err) {
    console.error(
      "❌ syncSingleCustomerToStoreB failed:",
      err.response?.data || err.message
    );
  }
}

export async function disableCustomerInStoreBByCustomerId(customerId) {
  try {
    // 🔁 Fetch LAST snapshot from Store A (still accessible briefly)
    const res = await storeA.get(`/customers/${customerId}.json`);
    const customer = res.data.customer;

    if (!customer || !customer.email) {
      console.log("⚠️ Deleted customer email not retrievable");
      return;
    }

    const search = await storeB.get(
      `/customers/search.json?query=email:${customer.email}`
    );

    if (!search.data.customers.length) {
      console.log(`⚠️ Store B customer not found for ${customer.email}`);
      return;
    }

    const existing = search.data.customers[0];

    const updatedTags = Array.from(
      new Set(
        `${existing.tags || ""},deleted-from-store-a`
          .split(",")
          .map(t => t.trim())
          .filter(Boolean)
      )
    ).join(",");

    await storeB.put(`/customers/${existing.id}.json`, {
      customer: {
        id: existing.id,
        state: "disabled",
        tags: updatedTags
      }
    });

    console.log(`🚫 Store B customer DISABLED: ${customer.email}`);
  } catch (err) {
    console.error(
      "❌ Failed to disable Store B customer:",
      err.response?.data || err.message
    );
  }
}

/* ======================================================
   BULK SYNC — ONLY MEMBERS (MANUAL RUN)
====================================================== */

export async function syncMembers() {
  const customers = await fetchStoreAMembers();
  const results = [];

  for (const customer of customers) {
    const tags = (customer.tags || "").toLowerCase();

    if (!tags.includes("member")) continue;

    await syncSingleCustomerToStoreB(customer.id);

    results.push({
      id: customer.id,
      email: customer.email,
      tags: customer.tags,
      synced: true
    });
  }

  return results;
}
