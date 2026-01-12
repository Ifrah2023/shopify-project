// import dotenv from "dotenv";
// dotenv.config();

// import { shopifyClient } from "./shopify.js";

// const storeA = shopifyClient(
//   process.env.STORE_A_DOMAIN,
//   process.env.STORE_A_TOKEN
// );

// const storeB = shopifyClient(
//   process.env.STORE_B_DOMAIN,
//   process.env.STORE_B_TOKEN
// );

// /**
//  * Fetch customers from Store A
//  */
// export async function fetchStoreAMembers() {
//   const res = await storeA.get("/customers.json?limit=10");

//   console.log("📦 Total customers fetched:", res.data.customers.length);

//   res.data.customers.forEach((c, index) => {
//     const tags = c.tags
//       ? c.tags.split(",").map(t => t.trim().toLowerCase())
//       : [];

//     const isMember = tags.includes("member");

//     console.log(
//       `👤 ${index + 1}. ${c.email || "NO EMAIL"} | ${c.first_name || ""} ${c.last_name || ""}`
//     );
//     console.log(
//       `   🏷️ Tags: [${tags.join(", ")}] → Member: ${isMember ? "YES ✅" : "NO ❌"}`
//     );
//   });

//   return res.data.customers;
// }

// export async function inviteToStoreB(customer) {
//   if (!customer.email) return;

//   const tags = customer.tags || "";

//   const existingCustomer = await findCustomerInStoreB(customer.email);

//   /* 🟢 CASE 1: Customer already exists → UPDATE TAGS */
//   if (existingCustomer) {
//     await updateStoreBCustomerTags(existingCustomer.id, tags);

//     console.log(
//       `🔁 Tags updated for existing customer: ${customer.email} → [${tags}]`
//     );
//     return;
//   }

//   /* 🟢 CASE 2: Customer does not exist → CREATE + INVITE */
//   await storeB.post("/customers.json", {
//     customer: {
//       email: customer.email,
//       first_name: customer.first_name,
//       last_name: customer.last_name,
//       tags: tags,
//       send_email_invite: true
//     }
//   });

//   console.log(
//     `📩 Invite sent (new customer) with tags [${tags}]: ${customer.email}`
//   );
// }


// async function findCustomerInStoreB(email) {
//   const res = await storeB.get(
//     `/customers/search.json?query=email:${email}`
//   );

//   return res.data.customers.length > 0
//     ? res.data.customers[0]
//     : null;
// }

// async function updateStoreBCustomerTags(customerId, tags) {
//   console.log("🛠️ Updating Store B customer:", customerId);
//   console.log("🛠️ New tags:", tags);

//   const res = await storeB.put(`/customers/${customerId}.json`, {
//     customer: {
//       id: customerId,
//       tags: tags
//     }
//   });

//   console.log("✅ Shopify response:", res.status);
// }

// export async function syncSingleCustomerToStoreB(customerId) {
//   // 🔁 Fresh customer fetch from Store A
//   const res = await storeA.get(`/customers/${customerId}.json`);
//   const customer = res.data.customer;

//   if (!customer.email) return;

//   // 🔍 Check if exists in Store B
//   const search = await storeB.get(
//     `/customers/search.json?query=email:${customer.email}`
//   );

//   if (search.data.customers.length > 0) {
//     const existing = search.data.customers[0];

//     // 🔁 UPDATE tags / name
//     await storeB.put(`/customers/${existing.id}.json`, {
//       customer: {
//         id: existing.id,
//         first_name: customer.first_name,
//         last_name: customer.last_name,
//         tags: customer.tags || ""
//       }
//     });

//     console.log(`🔁 Store B updated: ${customer.email}`);
//     return;
//   }

//   // 🆕 CREATE + INVITE
//   await storeB.post("/customers.json", {
//     customer: {
//       email: customer.email,
//       first_name: customer.first_name,
//       last_name: customer.last_name,
//       tags: customer.tags || "",
//       send_email_invite: true
//     }
//   });

//   console.log(`📩 Store B invited: ${customer.email}`);
// }

// export async function syncMembers() {
//   const customers = await fetchStoreAMembers();

//   for (const customer of customers) {
//     const tags = customer.tags
//       ? customer.tags.toLowerCase()
//       : "";

//     if (!tags.includes("member")) continue;

//     await inviteToStoreB(customer);
//   }

//   return customers.length;
// }

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
  let processed = 0;

  for (const customer of customers) {
    const tags = (customer.tags || "").toLowerCase();

    if (!tags.includes("member")) continue;

    await syncSingleCustomerToStoreB(customer.id);
    processed++;
  }

  return processed;
}