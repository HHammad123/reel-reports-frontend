# Production Fix Guide: `/api/save-temp-image` Endpoint

## 🔍 Problem Analysis

### Current Issue
The `/api/save-temp-image` endpoint is **not working in production** at `https://app.reelreports.ai/api/save-temp-image`.

### Root Cause
1. **`setupProxy.js` only works in development**: This file is only used by `react-scripts start` during development. When you build the React app with `npm run build`, it creates **static HTML/CSS/JS files** that don't include any server-side code.

2. **No production server running**: In production, if you're just serving static files (common with CDN/static hosting), there's **no Node.js server** to handle API endpoints like `/api/save-temp-image`.

3. **What "works in the browser" means**: The frontend JavaScript code executes and makes the `fetch()` request, but since there's no backend server, the request fails with a 404 or network error.

### Current Flow (Broken in Production)
```
User clicks "Generate Video" 
  → ImageList.js captures images with html2canvas
  → Frontend calls: fetch('/api/save-temp-image', {...})
  → ❌ Request fails because no server is handling /api/save-temp-image
```

## ✅ Solution

### Option 1: Run Node.js Server in Production (Recommended)

You need to run `server.js` in production to handle the API endpoints.

#### Step 1: Build the React App
```bash
npm run build
```

#### Step 2: Configure Your Production Deployment

**For Azure App Service:**
1. Go to your Azure App Service configuration
2. Set the **Startup Command** to: `node server.js`
3. Or create/update `web.config`:
```xml
<configuration>
  <system.webServer>
    <handlers>
      <add name="iisnode" path="server.js" verb="*" modules="iisnode"/>
    </handlers>
    <rewrite>
      <rules>
        <rule name="NodeInspector" patternSyntax="ECMAScript" stopProcessing="true">
          <match url="^server.js\/debug[\/]?" />
        </rule>
        <rule name="StaticContent">
          <action type="Rewrite" url="public{REQUEST_URI}"/>
        </rule>
        <rule name="DynamicContent">
          <conditions>
            <add input="{REQUEST_FILENAME}" matchType="IsFile" negate="True"/>
          </conditions>
          <action type="Rewrite" url="server.js"/>
        </rule>
      </rules>
    </rewrite>
  </system.webServer>
</configuration>
```

**For AWS/Heroku/Other Platforms:**
- Set the **start command** to: `node server.js`
- Or use: `npm run start:prod`
- Ensure the `PORT` environment variable is set (most platforms set this automatically)

#### Step 3: Verify Server is Running
After deployment, check your server logs. You should see:
```
🚀 Server is running on port 3000
📁 Serving static files from: /path/to/build
📁 Temp images from: /path/to/public/temp
✅ API endpoints available at /api/*
```

#### Step 4: Test the Endpoint
```bash
curl -X POST https://app.reelreports.ai/api/save-temp-image \
  -F "image=@test-image.png" \
  -F "fileName=test.png" \
  -F "sceneNumber=1" \
  -F "imageIndex=0"
```

Expected response:
```json
{
  "success": true,
  "message": "Image saved successfully",
  "path": "/temp/edited-images/test.png",
  "fileName": "test.png",
  ...
}
```

### Option 2: Use a Separate Backend API Server

If you cannot run Node.js in your frontend deployment, you need to:

1. **Move the API endpoint to your main backend server** (the one at `https://jsauth-dfbpgpdmgughg6aj.centralindia-01.azurewebsites.net` or similar)

2. **Update the frontend to use the full backend URL**:
   ```javascript
   // In ImageList.js, change:
   const saveResponse = await fetch('/api/save-temp-image', {
     // to:
   const saveResponse = await fetch('https://your-backend-domain.com/api/save-temp-image', {
   ```

3. **Implement the endpoint on your backend server** using the same logic from `setupProxy.js`

## 🔧 How It Works (When Fixed)

### Development Mode (`npm start`)
```
React Dev Server (port 3000)
  → Uses setupProxy.js automatically
  → API calls to /api/* are proxied/handled by setupProxy
  ✅ Works correctly
```

### Production Mode (with server.js running)
```
Express Server (server.js)
  → Serves static files from /build
  → Handles API routes from setupProxy.js
  → /api/save-temp-image endpoint works
  ✅ Works correctly
```

### Production Mode (static files only - CURRENT BROKEN STATE)
```
Static File Server (CDN/hosting)
  → Serves HTML/CSS/JS files
  → No server-side code
  → /api/save-temp-image returns 404
  ❌ Broken
```

## 📋 Checklist for Deployment

- [ ] Build the React app: `npm run build`
- [ ] Ensure `server.js` exists in the root directory
- [ ] Ensure `express` and `multer` are in `package.json` dependencies
- [ ] Configure production deployment to run `node server.js`
- [ ] Ensure `public/temp/edited-images/` directory exists and is writable
- [ ] Test the endpoint after deployment
- [ ] Check server logs for any errors

## 🐛 Troubleshooting

### Issue: "404 on /api/save-temp-image"
**Solution:**
- Verify `server.js` is running (check server logs)
- Ensure API routes are registered before the catch-all route (already done in server.js)
- Verify deployment is using `node server.js` as the start command

### Issue: "Cannot find module 'express'"
**Solution:**
- Run `npm install --production` in your deployment
- Ensure `express` is in `dependencies` (not `devDependencies`)

### Issue: "Cannot write to temp directory"
**Solution:**
- Check file permissions on the server
- Ensure the `public/temp` directory exists
- The server will create it automatically, but ensure write permissions

### Issue: "Port already in use"
**Solution:**
- Set a different port: `PORT=3001 node server.js`
- Most cloud platforms set the `PORT` environment variable automatically

## 📝 Important Notes

1. **The `public/temp/` directory should be excluded from git** (already in `.gitignore`)
2. **Consider implementing cleanup** for old temp images to prevent disk space issues
3. **The server uses port 3000 by default**, but respects the `PORT` environment variable
4. **All API endpoints from `setupProxy.js` will work in production** once `server.js` is running

## 🚀 Quick Fix Summary

**The main issue:** Your production deployment is serving static files only, but `/api/save-temp-image` requires a Node.js server.

**The fix:** Configure your production deployment to run `node server.js` instead of (or in addition to) serving static files.

**Command to run in production:**
```bash
node server.js
```

Or if using npm scripts:
```bash
npm run start:prod
```

