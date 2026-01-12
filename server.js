import express from "express";
import dotenv from "dotenv";
import { syncMembers, fetchStoreAMembers,syncSingleCustomerToStoreB, disableCustomerInStoreBByCustomerId } from "./syncMembers.js";

dotenv.config();

const app = express();

/* ======================================================
   🔍 GLOBAL DEBUG (VERY IMPORTANT)
====================================================== */
app.use((req, res, next) => {
  console.log("➡️ Incoming:", req.method, req.url);
  next();
});

/* ======================================================
   ⚠️ WEBHOOKS KE LIYE RAW BODY (MUST COME FIRST)
====================================================== */
app.use("/webhooks", express.raw({ type: "application/json" }));

/* ======================================================
   NORMAL JSON (AFTER WEBHOOKS)
====================================================== */
app.use(express.json());

/* ======================================================
   NORMAL / MANUAL ROUTES
====================================================== */

app.get("/fetch-store-a-customers", async (req, res) => {
  try {
    const customers = await fetchStoreAMembers();
    res.json({
      success: true,
      count: customers.length,
      customers
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
});

app.post("/sync-store-a-to-b", async (req, res) => {
  try {
    const results = await syncMembers();
    res.json({ success: true, processed: results.length, details: results });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/* ======================================================
   WEBHOOK ROUTES (STORE A)
====================================================== */

app.post("/webhooks/customer-create", async (req, res) => {
  const customer = Buffer.isBuffer(req.body)
    ? JSON.parse(req.body.toString())
    : req.body;

  if (!customer || !customer.id || !customer.email) {
    console.log("⚠️ Invalid create webhook payload — ignored");
    return res.sendStatus(200);
  }

  console.log("🟢 WEBHOOK CREATE HIT");
  console.log("📧 Email:", customer.email);
  console.log("🏷️ Tags (webhook):", customer.tags ?? "(not sent)");

  // 🔥 REAL SYNC
  await syncSingleCustomerToStoreB(customer.id);

  res.sendStatus(200);
});

app.post("/webhooks/customer-update", async (req, res) => {
  const customer = Buffer.isBuffer(req.body)
    ? JSON.parse(req.body.toString())
    : req.body;

  console.log("🟡 WEBHOOK UPDATE HIT:", customer.email);

   if (!customer || !customer.id || !customer.email) {
    console.log("⚠️ Empty or invalid webhook payload — ignored");
    return res.sendStatus(200);
  }

  console.log("🟡 WEBHOOK UPDATE HIT:", customer.email);

  // 🔥 THIS IS THE MISSING LINE
  await syncSingleCustomerToStoreB(customer.id);

  res.sendStatus(200);
});

app.post("/webhooks/customer-delete", async (req, res) => {
  const payload = Buffer.isBuffer(req.body)
    ? JSON.parse(req.body.toString())
    : req.body;

  if (!payload || !payload.id) {
    console.log("⚠️ Delete webhook without ID — ignored");
    return res.sendStatus(200);
  }

  console.log("🔴 WEBHOOK DELETE HIT (ID):", payload.id);

  await disableCustomerInStoreBByCustomerId(payload.id);

  res.sendStatus(200);
});


/* ====================================================== */

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});