const express = require('express');
const path = require('path');
const setupProxy = require('./src/setupProxy');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS middleware - MUST be first
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Middleware for parsing JSON and form data
// Note: These skip multipart/form-data automatically, which multer handles
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware for debugging
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  }
  next();
});

// Setup API routes from setupProxy (MUST be before static file serving)
setupProxy(app);

// Serve temp images from public/temp directory (before static files)
const publicPath = path.join(__dirname, 'public');
app.use('/temp', express.static(path.join(publicPath, 'temp')));

// Serve static files from the React app build directory
const buildPath = path.join(__dirname, 'build');
app.use(express.static(buildPath));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
// This only handles GET requests, so POST requests to /api/* won't be caught here
app.get('*', (req, res) => {
  res.sendFile(path.join(buildPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📁 Serving static files from: ${buildPath}`);
  console.log(`📁 Temp images from: ${path.join(publicPath, 'temp')}`);
  console.log(`✅ API endpoints available at /api/*`);
});

