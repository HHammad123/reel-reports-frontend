# Azure CORS Debugging Guide

## Current Issue
CORS is blocking image access from `localhost:3000` to Azure Blob Storage (`brandassetmain2.blob.core.windows.net`).

## Error Message
```
Access to image at 'https://brandassetmain2.blob.core.windows.net/...' 
from origin 'http://localhost:3000' has been blocked by CORS policy: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## Root Cause
Azure Blob Storage is not sending the `Access-Control-Allow-Origin` header in the response, which means CORS is either:
1. Not configured
2. Not saved properly
3. Not propagated yet (can take 5-15 minutes)

## ✅ Step-by-Step Fix

### 1. Configure Azure CORS (Storage Account Level)

1. Go to [Azure Portal](https://portal.azure.com)
2. Navigate to your storage account: `brandassetmain2`
3. In the left menu, under **Settings**, click **Resource sharing (CORS)**
4. Under **Blob service**, add a new rule:

```
Allowed origins: *
Allowed methods: GET, HEAD, OPTIONS
Allowed headers: *
Exposed headers: *
Max age: 86400
```

5. **IMPORTANT**: Click the **SAVE** button at the top of the page!

### 2. Verify Container Access Level

1. Go to **Containers** → Select `assets` container
2. Click **Change access level**
3. Set to **Blob (anonymous read access for blobs only)**
4. Click **OK**

### 3. Test CORS Configuration

Wait 5-10 minutes, then test with `curl`:

```bash
curl -I -H "Origin: http://localhost:3000" \
  https://brandassetmain2.blob.core.windows.net/assets/user_7c317fc2-b265-4ab2-9b3a-e5c8ab773f3e/templates/16-9/9500a9a8fc1b4a2f96179e48b3a9fa1e.png
```

Look for these headers in the response:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, HEAD, OPTIONS
```

If these headers are **missing**, CORS is not configured correctly.

### 4. Browser Test

Open browser console and run:

```javascript
fetch('https://brandassetmain2.blob.core.windows.net/assets/user_7c317fc2-b265-4ab2-9b3a-e5c8ab773f3e/templates/16-9/9500a9a8fc1b4a2f96179e48b3a9fa1e.png', {
  method: 'GET',
  mode: 'cors'
})
.then(r => console.log('✅ CORS working!', r.status, r.headers.get('access-control-allow-origin')))
.catch(e => console.error('❌ CORS failed:', e))
```

### 5. Clear Browser Cache

After configuring CORS, do a **hard refresh**:
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

Or clear browser cache completely.

## 🔍 Common Issues

### Issue 1: CORS Not Saved
**Symptom**: Configuration looks correct but still getting errors
**Fix**: Make sure you clicked the **SAVE** button in Azure Portal

### Issue 2: Multiple Storage Accounts
**Symptom**: You configured CORS on wrong storage account
**Fix**: Verify you're configuring `brandassetmain2.blob.core.windows.net`

### Issue 3: SAS Token Required
**Symptom**: Container is not publicly accessible
**Fix**: Either make container public OR add SAS token to image URLs

### Issue 4: Browser Cached CORS Rejection
**Symptom**: CORS is configured but browser still shows error
**Fix**: Clear browser cache completely and restart browser

## 📝 Checklist

- [ ] CORS configured in Azure Portal (Storage Account → Settings → CORS)
- [ ] "Allowed origins" set to `*`
- [ ] "Allowed methods" includes `GET, HEAD, OPTIONS`
- [ ] Clicked **SAVE** button
- [ ] Waited 5-10 minutes for propagation
- [ ] Container access level set to "Blob" or "Container"
- [ ] Tested with `curl` command
- [ ] Cleared browser cache
- [ ] Hard refreshed browser (Ctrl+Shift+R)

## 🚨 If Still Not Working

If after 15 minutes CORS still doesn't work, you may need to:

1. **Use a backend proxy** to fetch images server-side
2. **Use SAS tokens** instead of public access
3. **Contact Azure support** to verify your account settings

## Alternative: Backend Image Proxy (Temporary Solution)

If you need images to work immediately while waiting for Azure CORS, you can proxy images through your backend:

### Backend Route (Node.js/Express example):
```javascript
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  const response = await fetch(imageUrl);
  const buffer = await response.buffer();
  res.set('Content-Type', response.headers.get('content-type'));
  res.set('Access-Control-Allow-Origin', '*');
  res.send(buffer);
});
```

### Frontend Usage:
```javascript
const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(originalUrl)}`;
<img src={proxyUrl} crossOrigin="anonymous" />
```

This bypasses browser CORS restrictions since the request goes through your backend first.

