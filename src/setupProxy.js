const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const multer = require('multer')

// Manually load .env file if keys are missing (fixes issue when running via node server.js)
if (!process.env.REACT_APP_STRIPE_SECRET_KEY) {
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
    if (body.length > 5 * 1024 * 1024) {
      reject(new Error('Request body too large'));
      req.destroy();
    }
  });
  req.on('end', () => resolve(body));
  req.on('error', reject);
});

const fetchRemoteAsDataUrl = (targetUrl) =>
  new Promise((resolve, reject) => {
    const parsed = new URL(targetUrl);
    const client = parsed.protocol === 'https:' ? https : http;

    const options = {
      protocol: parsed.protocol,
      hostname: parsed.hostname,
      port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
      path: `${parsed.pathname}${parsed.search}`,
      method: 'GET',
      headers: {
        'User-Agent': 'reelreports-image-proxy',
        Accept: '*/*',
        'Accept-Encoding': 'identity',
      },
    };

    const request = client.request(options, (response) => {
      if (!response.statusCode || response.statusCode >= 400) {
        reject(new Error(`Upstream responded with status ${response.statusCode}`));
        response.resume();
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        try {
          const buffer = Buffer.concat(chunks);
          const contentType = response.headers['content-type'] || 'application/octet-stream';
          const base64 = buffer.toString('base64');
          resolve(`data:${contentType};base64,${base64}`);
        } catch (error) {
          reject(error);
        }
      });
    });

    request.on('error', reject);
    request.end();
  });

// Setup multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
});

module.exports = function setupProxy(app) {
  // ✅ Test endpoint
  app.get('/api/test', (req, res) => {
    console.log('✅ Test endpoint hit');
    res.json({ success: true, message: 'Server is working', timestamp: new Date().toISOString() });
  });

  // ✅ Image proxy endpoint
  app.post('/image-proxy', async (req, res) => {
    try {
      const rawBody = await collectRequestBody(req);
      let parsedBody = {};
      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody);
        } catch {
          throw new Error('Invalid JSON payload');
        }
      }

      const targetUrl = typeof parsedBody.url === 'string' ? parsedBody.url.trim() : '';
      if (!targetUrl) return res.status(400).json({ error: 'Missing url field' });

      const dataUrl = await fetchRemoteAsDataUrl(targetUrl);
      res.json({ dataUrl });
    } catch (error) {
      console.error('[image-proxy] Failed to process request:', error);
      const status =
        error.message && error.message.includes('Upstream responded with status')
          ? 502
          : error.message === 'Request body too large'
            ? 413
            : 500;
      res.status(status).json({ error: error.message || 'Unknown error' });
    }
  });

  // ✅ Save temp image
  app.post(
    '/api/save-temp-image',
    (req, res, next) => {
      console.log('📥 POST /api/save-temp-image - Request received');
      console.log('   Content-Type:', req.headers['content-type']);
      console.log('   Content-Length:', req.headers['content-length']);

      upload.single('image')(req, res, (err) => {
        if (err) {
          console.error('❌ Multer error:', err);
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({ error: 'File too large', message: 'File size exceeds 10MB limit' });
          }
          return res.status(400).json({ error: 'File upload error', message: err.message });
        }
        console.log('✅ Multer processed successfully');
        next();
      });
    },
    async (req, res) => {
      try {
        console.log('📥 Processing save-temp-image request');

        if (!req.file) {
          console.error('❌ No file uploaded');
          return res.status(400).json({ error: 'No image file provided' });
        }

        const fileName = req.body.fileName || `image-${Date.now()}.png`;
        const sceneNumber = req.body.sceneNumber || '1';
        const imageIndex = req.body.imageIndex || '0';

        const rootDir = __dirname.includes('src') ? path.join(__dirname, '..') : __dirname;
        const tempDir = path.join(rootDir, 'public', 'temp', 'edited-images');

        if (!fs.existsSync(tempDir)) {
          console.log('📁 Creating temp directory:', tempDir);
          fs.mkdirSync(tempDir, { recursive: true });
        }

        const filePath = path.join(tempDir, fileName);
        fs.writeFileSync(filePath, req.file.buffer);

        if (!fs.existsSync(filePath)) throw new Error('File was not written to disk');

        const stats = fs.statSync(filePath);
        const relativePath = `/temp/edited-images/${fileName}`;

        res.json({
          success: true,
          message: 'Image saved successfully',
          path: relativePath,
          fileName,
          fullPath: filePath,
          sceneNumber,
          imageIndex,
          fileSize: stats.size,
        });
      } catch (error) {
        console.error('❌ Error saving temp image:', error);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Failed to save image', message: error.message });
        }
      }
    }
  );

  // ✅ Stripe Checkout Session Endpoint (TEST)
  // IMPORTANT: set STRIPE_SECRET_KEY in backend env
  app.post('/api/create-checkout-session', async (req, res) => {
    try {
      // If express.json isn't enabled globally, fallback to manual body parsing:
      let body = req.body;
      if (!body || Object.keys(body).length === 0) {
        const raw = await collectRequestBody(req);
        body = raw ? JSON.parse(raw) : {};
      }

      const { planTitle, mode, successUrl, cancelUrl } = body;

      // Use the REACT_APP_ prefixed key which is present in the .env file
      const secretKey = process.env.REACT_APP_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY;

      if (!secretKey) {
        console.error('❌ STRIPE_SECRET_KEY is missing from environment variables');
        // Debug: print available keys (security: don't print values)
        const keys = Object.keys(process.env).filter(k => k.includes('STRIPE'));
        console.error('   Available STRIPE keys:', keys);
        return res.status(500).json({ error: { message: 'STRIPE_SECRET_KEY missing in backend env' } });
      }

      if (!planTitle) return res.status(400).json({ error: { message: 'planTitle is required' } });
      if (!successUrl || !cancelUrl)
        return res.status(400).json({ error: { message: 'successUrl and cancelUrl are required' } });

      // ✅ Secure: backend decides price (don’t trust frontend amount)
      const PRICE_MAP_USD = {
        Starter: 30,
        Professional: 75,
        Business: 100,
        'Small Pack': 5,
        'Medium Pack': 10,
        'Large Pack': 20,
      };

      const amount = PRICE_MAP_USD[planTitle];
      if (!amount) return res.status(400).json({ error: { message: `Unknown planTitle: ${planTitle}` } });

      const params = new URLSearchParams();
      params.append('success_url', successUrl);
      params.append('cancel_url', cancelUrl);
      params.append('mode', mode || 'payment');

      // ✅ Currency matches your Stripe dashboard (USD)
      params.append('line_items[0][price_data][currency]', 'usd');
      params.append('line_items[0][price_data][product_data][name]', planTitle);
      params.append('line_items[0][price_data][unit_amount]', String(Math.round(amount * 100)));
      params.append('line_items[0][quantity]', '1');

      const stripeReq = https.request(
        'https://api.stripe.com/v1/checkout/sessions',
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        },
        (stripeRes) => {
          let data = '';
          stripeRes.on('data', (chunk) => (data += chunk));
          stripeRes.on('end', () => {
            try {
              const parsed = JSON.parse(data);

              if (stripeRes.statusCode >= 400) {
                console.error('Stripe Error:', parsed);
                return res.status(stripeRes.statusCode).json({ error: parsed.error || parsed });
              }

              return res.json(parsed);
            } catch (e) {
              console.error('Stripe response parse error:', data);
              return res.status(500).json({ error: { message: 'Invalid response from Stripe' } });
            }
          });
        }
      );

      stripeReq.on('error', (e) => {
        console.error('Stripe Request Error:', e);
        res.status(500).json({ error: { message: e.message } });
      });

      stripeReq.write(params.toString());
      stripeReq.end();
    } catch (error) {
      console.error('Create Session Error:', error);
      res.status(500).json({ error: { message: error.message } });
    }
  });

  // ✅ Delete temp image
  app.delete('/api/delete-temp-image', async (req, res) => {
    try {
      const fileName = req.query.fileName;

      if (!fileName) return res.status(400).json({ error: 'No fileName provided' });

      console.log(`🗑️ Deleting temp image: ${fileName}`);

      const rootDir = __dirname.includes('src') ? path.join(__dirname, '..') : __dirname;
      const tempDir = path.join(rootDir, 'public', 'temp', 'edited-images');
      const filePath = path.join(tempDir, fileName);

      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        return res.status(404).json({ error: 'File not found', fileName });
      }

      fs.unlinkSync(filePath);

      res.json({
        success: true,
        message: 'Image deleted successfully',
        fileName,
      });
    } catch (error) {
      console.error('❌ Error deleting temp image:', error);
      res.status(500).json({ error: 'Failed to delete image', message: error.message });
    }
  });
};
