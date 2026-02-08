const { createProxyMiddleware } = require('http-proxy-middleware');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const express = require('express');

// Manually load .env file if keys are missing
if (!process.env.REACT_APP_STRIPE_SECRET_KEY && !process.env.STRIPE_SECRET_KEY) {
  try {
    const envPath = path.join(__dirname, '..', '.env');
    if (fs.existsSync(envPath)) {
      console.log('Loading .env file from:', envPath);
      const content = fs.readFileSync(envPath, 'utf8');
      content.split('\n').forEach(line => {
        const match = line.match(/^([^=]+)=(.*)$/);
        if (match) {
          const key = match[1].trim();
          const value = match[2].trim();
          if (!process.env[key]) {
            process.env[key] = value;
          }
        }
      });
    }
  } catch (e) {
    console.error('Failed to load .env manually:', e);
  }
}

const collectRequestBody = (req) => new Promise((resolve, reject) => {
  let body = '';
  req.on('data', (chunk) => {
    body += chunk;
    if (body.length > 10 * 1024 * 1024) { // 10MB limit
      reject(new Error('Request body too large'));
      req.destroy();
    }
  });
  req.on('end', () => resolve(body));
  req.on('error', reject);
});

module.exports = function(app) {
  // Enable JSON parsing for API routes
  app.use('/api', express.json({ limit: '10mb' }));
  app.use('/api', express.urlencoded({ extended: true }));

  // ✅ Test endpoint
  app.get('/api/test', (req, res) => {
    res.json({ success: true, message: 'Backend is working', time: new Date().toISOString() });
  });

  // ✅ Stripe checkout session
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      let body = req.body;
      
      // Fallback for body parsing if middleware didn't catch it
      if (!body || Object.keys(body).length === 0) {
        try {
          const raw = await collectRequestBody(req);
          body = raw ? JSON.parse(raw) : {};
        } catch (e) {
          // Ignore error if body is already consumed
        }
      }

      const { planTitle, mode, successUrl, cancelUrl } = body;
      
      const secretKey = process.env.REACT_APP_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;
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
              console.error('Stripe Error:', parsed);
              return res.status(stripeRes.statusCode).json({ error: parsed.error || parsed });
            }

            return res.json(parsed);
          });
        }
      );

      stripeReq.on("error", (e) => {
        console.error('Stripe Request Error:', e);
        return res.status(500).json({ error: { message: e.message } });
      });

      stripeReq.write(params.toString());
      stripeReq.end();
    } catch (err) {
      console.error('Create Session Error:', err);
      return res.status(500).json({ error: { message: err.message } });
    }
  });

  // ✅ Image proxy endpoint (Restored)
  app.post('/image-proxy', async (req, res) => {
    try {
      let body = req.body;
      if (!body || Object.keys(body).length === 0) {
        const raw = await collectRequestBody(req);
        body = raw ? JSON.parse(raw) : {};
      }
      
      const { url } = body;
      if (!url) return res.status(400).json({ error: 'URL is required' });

      // Logic to fetch image and return as base64 or stream
      // Simplified restoration from previous context:
      const fetchRemoteAsDataUrl = (targetUrl) =>
        new Promise((resolve, reject) => {
          const parsed = new URL(targetUrl);
          const client = parsed.protocol === 'https:' ? https : http;
          const options = {
            headers: {
              'User-Agent': 'reelreports-image-proxy',
              Accept: '*/*',
            }
          };
          client.get(targetUrl, options, (response) => {
             if (response.statusCode >= 400) {
               reject(new Error(`Status ${response.statusCode}`));
               return;
             }
             const chunks = [];
             response.on('data', c => chunks.push(c));
             response.on('end', () => {
               const buffer = Buffer.concat(chunks);
               const type = response.headers['content-type'] || 'application/octet-stream';
               resolve(`data:${type};base64,${buffer.toString('base64')}`);
             });
          }).on('error', reject);
        });

      const dataUrl = await fetchRemoteAsDataUrl(url);
      res.json({ dataUrl });
    } catch (error) {
      console.error('Image Proxy Error:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // ✅ Delete temp image (Restored)
  app.delete('/api/delete-temp-image', (req, res) => {
    const { fileName } = req.query;
    if (!fileName) return res.status(400).json({ error: 'fileName required' });
    
    const tempPath = path.join(__dirname, '..', 'public', 'temp', fileName);
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
      res.json({ success: true });
    } else {
      res.json({ success: false, message: 'File not found' });
    }
  });
};