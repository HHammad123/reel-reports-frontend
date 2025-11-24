const http = require('http')
const https = require('https')
const fs = require('fs')
const path = require('path')
const multer = require('multer')

const collectRequestBody = (req) => new Promise((resolve, reject) => {
  let body = ''
  req.on('data', chunk => {
    body += chunk
    if (body.length > 5 * 1024 * 1024) {
      reject(new Error('Request body too large'))
      req.destroy()
    }
  })
  req.on('end', () => resolve(body))
  req.on('error', reject)
})

const fetchRemoteAsDataUrl = (targetUrl) => new Promise((resolve, reject) => {
  const parsed = new URL(targetUrl)
  const client = parsed.protocol === 'https:' ? https : http

  const options = {
    protocol: parsed.protocol,
    hostname: parsed.hostname,
    port: parsed.port || (parsed.protocol === 'https:' ? 443 : 80),
    path: `${parsed.pathname}${parsed.search}`,
    method: 'GET',
    headers: {
      'User-Agent': 'reelreports-image-proxy',
      'Accept': '*/*',
      'Accept-Encoding': 'identity'
    }
  }

  const request = client.request(options, (response) => {
    if (!response.statusCode || response.statusCode >= 400) {
      reject(new Error(`Upstream responded with status ${response.statusCode}`))
      response.resume()
      return
    }

    const chunks = []
    response.on('data', chunk => chunks.push(chunk))
    response.on('end', () => {
      try {
        const buffer = Buffer.concat(chunks)
        const contentType = response.headers['content-type'] || 'application/octet-stream'
        const base64 = buffer.toString('base64')
        resolve(`data:${contentType};base64,${base64}`)
      } catch (error) {
        reject(error)
      }
    })
  })

  request.on('error', reject)
  request.end()
})

// Setup multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
})

module.exports = function setupProxy(app) {
  // Test endpoint to verify server is receiving requests
  app.get('/api/test', (req, res) => {
    console.log('✅ Test endpoint hit');
    res.json({ success: true, message: 'Server is working', timestamp: new Date().toISOString() });
  });

  // Existing image proxy endpoint
  app.post('/image-proxy', async (req, res) => {
    try {
      const rawBody = await collectRequestBody(req)
      let parsedBody = {}
      if (rawBody) {
        try {
          parsedBody = JSON.parse(rawBody)
        } catch {
          throw new Error('Invalid JSON payload')
        }
      }
      const targetUrl = typeof parsedBody.url === 'string' ? parsedBody.url.trim() : ''
      if (!targetUrl) {
        res.status(400).json({ error: 'Missing url field' })
        return
      }
      const dataUrl = await fetchRemoteAsDataUrl(targetUrl)
      res.json({ dataUrl })
    } catch (error) {
      console.error('[image-proxy] Failed to process request:', error)
      const status = error.message && error.message.includes('Upstream responded with status')
        ? 502
        : error.message === 'Request body too large'
          ? 413
          : 500
      res.status(status).json({ error: error.message || 'Unknown error' })
    }
  })

  // New endpoint: Save image to temporary folder
  app.post('/api/save-temp-image', (req, res, next) => {
    console.log('📥 POST /api/save-temp-image - Request received');
    console.log('   Content-Type:', req.headers['content-type']);
    console.log('   Content-Length:', req.headers['content-length']);
    
    // Handle multer errors
    upload.single('image')(req, res, (err) => {
      if (err) {
        console.error('❌ Multer error:', err);
        console.error('   Error code:', err.code);
        console.error('   Error message:', err.message);
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large', message: 'File size exceeds 10MB limit' });
        }
        return res.status(400).json({ error: 'File upload error', message: err.message });
      }
      console.log('✅ Multer processed successfully');
      next();
    });
  }, async (req, res) => {
    try {
      console.log('📥 Processing save-temp-image request');
      console.log('   Has file:', !!req.file);
      if (req.file) {
        console.log('   File name:', req.file.originalname);
        console.log('   File size:', req.file.size);
        console.log('   File mimetype:', req.file.mimetype);
      }
      console.log('   Body keys:', Object.keys(req.body || {}));
      
      if (!req.file) {
        console.error('❌ No file uploaded');
        console.error('   Request headers:', JSON.stringify(req.headers, null, 2));
        return res.status(400).json({ error: 'No image file provided' });
      }

      const fileName = req.body.fileName || `image-${Date.now()}.png`;
      const sceneNumber = req.body.sceneNumber || '1';
      const imageIndex = req.body.imageIndex || '0';
      
      console.log(`📝 Saving: ${fileName} (Scene ${sceneNumber}, Image ${imageIndex})`);
      console.log(`   File size: ${(req.file.size / 1024).toFixed(2)} KB`);

      // Define temp directory path - works in both dev and production
      // In dev: __dirname = src/, so we go up one level to root
      // In production: __dirname = root (where server.js is), so we go to public directly
      const rootDir = __dirname.includes('src') ? path.join(__dirname, '..') : __dirname;
      const tempDir = path.join(rootDir, 'public', 'temp', 'edited-images');
      
      // Ensure temp directory exists
      if (!fs.existsSync(tempDir)) {
        console.log('📁 Creating temp directory:', tempDir);
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // Full path to save the file
      const filePath = path.join(tempDir, fileName);
      
      // Write file to disk (this will overwrite if file exists)
      fs.writeFileSync(filePath, req.file.buffer);
      
      // Verify file was written
      if (!fs.existsSync(filePath)) {
        throw new Error('File was not written to disk');
      }
      
      const stats = fs.statSync(filePath);
      console.log(`✅ Image saved successfully: ${filePath}`);
      console.log(`   File size on disk: ${(stats.size / 1024).toFixed(2)} KB`);
      
      // Get relative path for frontend
      const relativePath = `/temp/edited-images/${fileName}`;
      
      const response = {
        success: true,
        message: 'Image saved successfully',
        path: relativePath,
        fileName: fileName,
        fullPath: filePath,
        sceneNumber,
        imageIndex,
        fileSize: stats.size
      };
      
      console.log('📤 Sending success response');
      res.json(response);
      
    } catch (error) {
      console.error('❌ Error saving temp image:', error);
      console.error('   Stack:', error.stack);
      
      // Make sure to send response even on error
      if (!res.headersSent) {
        res.status(500).json({ 
          error: 'Failed to save image', 
          message: error.message 
        });
      }
    }
  })

  // New endpoint: Delete image from temporary folder
  app.delete('/api/delete-temp-image', async (req, res) => {
    try {
      const fileName = req.query.fileName;
      
      if (!fileName) {
        return res.status(400).json({ error: 'No fileName provided' });
      }

      console.log(`🗑️ Deleting temp image: ${fileName}`);

      // Define temp directory path - works in both dev and production
      const rootDir = __dirname.includes('src') ? path.join(__dirname, '..') : __dirname;
      const tempDir = path.join(rootDir, 'public', 'temp', 'edited-images');
      const filePath = path.join(tempDir, fileName);

      // Check if file exists
      if (!fs.existsSync(filePath)) {
        console.warn(`⚠️ File not found: ${filePath}`);
        return res.status(404).json({ error: 'File not found', fileName });
      }

      // Delete the file
      fs.unlinkSync(filePath);
      
      console.log(`✅ Image deleted successfully: ${filePath}`);
      
      res.json({
        success: true,
        message: 'Image deleted successfully',
        fileName: fileName
      });
      
    } catch (error) {
      console.error('❌ Error deleting temp image:', error);
      res.status(500).json({ 
        error: 'Failed to delete image', 
        message: error.message 
      });
    }
  })
}
