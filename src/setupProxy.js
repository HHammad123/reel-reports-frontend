/**
 * server.js
 * Production-ready Stripe Checkout Session API
 *
 * Run:
 *   npm init -y
 *   npm i express cors dotenv
 *   node server.js
 *
 * Env:
 *   STRIPE_SECRET_KEY=sk_live_xxx or sk_test_xxx
 *   PORT=5000
 */

const express = require("express");
const cors = require("cors");
const https = require("https");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 5000;

// ✅ Allow your frontend domain
app.use(
  cors({
    origin: [
      "https://app.reelreports.ai",
      "http://localhost:3000",
      "http://127.0.0.1:3000",
    ],
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json({ limit: "2mb" }));

// ✅ Health check
app.get("/api/test", (req, res) => {
  res.json({ success: true, message: "Backend is working", time: new Date().toISOString() });
});

// ✅ Stripe checkout session
app.post("/api/create-checkout-session", async (req, res) => {
  try {
    const { planTitle, mode, successUrl, cancelUrl } = req.body || {};

    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (!secretKey) {
      return res.status(500).json({
        error: { message: "STRIPE_SECRET_KEY missing in backend environment variables" },
      });
    }

    if (!planTitle) return res.status(400).json({ error: { message: "planTitle is required" } });
    if (!successUrl || !cancelUrl) {
      return res.status(400).json({ error: { message: "successUrl and cancelUrl are required" } });
    }

    // ✅ backend decides price
    const PRICE_MAP_USD = {
      Starter: 30,
      Professional: 75,
      Business: 100,
      "Small Pack": 5,
      "Medium Pack": 10,
      "Large Pack": 20,
    };

    const amount = PRICE_MAP_USD[planTitle];
    if (!amount) {
      return res.status(400).json({ error: { message: `Unknown planTitle: ${planTitle}` } });
    }

    const params = new URLSearchParams();
    params.append("success_url", successUrl);
    params.append("cancel_url", cancelUrl);
    params.append("mode", mode || "payment");

    // Stripe line item
    params.append("line_items[0][price_data][currency]", "usd");
    params.append("line_items[0][price_data][product_data][name]", planTitle);
    params.append("line_items[0][price_data][unit_amount]", String(Math.round(amount * 100)));
    params.append("line_items[0][quantity]", "1");

    const stripeReq = https.request(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      },
      (stripeRes) => {
        let data = "";
        stripeRes.on("data", (chunk) => (data += chunk));
        stripeRes.on("end", () => {
          let parsed;
          try {
            parsed = JSON.parse(data);
          } catch (e) {
            return res.status(500).json({ error: { message: "Stripe returned invalid JSON" } });
          }

          if (stripeRes.statusCode >= 400) {
            return res.status(stripeRes.statusCode).json({ error: parsed.error || parsed });
          }

          // ✅ return the session (contains url)
          return res.json(parsed);
        });
      }
    );

    stripeReq.on("error", (e) => {
      return res.status(500).json({ error: { message: e.message } });
    });

    stripeReq.write(params.toString());
    stripeReq.end();
  } catch (err) {
    return res.status(500).json({ error: { message: err.message } });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Stripe backend running on port ${PORT}`);
});
