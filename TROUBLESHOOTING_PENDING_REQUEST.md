# Troubleshooting: `/api/save-temp-image` Stuck in Pending Status

## Problem
The `/api/save-temp-image` endpoint is being called but the request stays in "pending" status and never completes.

## Changes Made

### 1. Added CORS Headers (`server.js`)
- Added CORS middleware to allow cross-origin requests
- Handles preflight OPTIONS requests

### 2. Improved Error Handling (`setupProxy.js`)
- Added multer error handling with proper error responses
- Added comprehensive logging at each step
- Added timeout protection (30 seconds on frontend)

### 3. Enhanced Frontend Error Handling (`ImageList.js`)
- Added AbortController for 30-second timeout
- Better error messages for different failure types
- Improved logging

## Debugging Steps

### Step 1: Check Server Logs
When you make a request, you should see these logs in order:

```
[timestamp] POST /api/save-temp-image
📥 POST /api/save-temp-image - Request received
   Content-Type: multipart/form-data; boundary=...
   Content-Length: ...
✅ Multer processed successfully
📥 Processing save-temp-image request
   Has file: true
   File name: scene-1-image-1.png
   File size: ...
📝 Saving: scene-1-image-1.png (Scene 1, Image 1)
✅ Image saved successfully: /path/to/file
📤 Sending success response
```

**If you don't see these logs:**
- The server is not receiving the request
- Check if `server.js` is actually running
- Check if the request is being blocked before reaching the server

### Step 2: Test Server Connectivity
Test if the server is receiving requests at all:

```bash
curl http://localhost:3000/api/test
```

Or in browser:
```
http://localhost:3000/api/test
```

Expected response:
```json
{
  "success": true,
  "message": "Server is working",
  "timestamp": "..."
}
```

### Step 3: Check Browser Network Tab
1. Open browser DevTools → Network tab
2. Filter for "save-temp-image"
3. Click on the request
4. Check:
   - **Status**: Should be 200 (not pending)
   - **Headers**: 
     - Request should have `Content-Type: multipart/form-data`
     - Response should have CORS headers
   - **Timing**: How long is it taking?
   - **Preview/Response**: What's the response body?

### Step 4: Check for CORS Errors
Look in browser console for CORS errors:
```
Access to fetch at '...' from origin '...' has been blocked by CORS policy
```

**If you see CORS errors:**
- The CORS middleware in `server.js` should fix this
- Make sure `server.js` is running (not just static files)

### Step 5: Check Multer Processing
If you see "Request received" but not "Multer processed successfully":
- Multer is hanging while parsing the multipart data
- Check file size (should be < 10MB)
- Check if the FormData is being created correctly

### Step 6: Check File System Permissions
If you see "Multer processed successfully" but not "Image saved successfully":
- Check if the `public/temp/edited-images/` directory exists
- Check write permissions on that directory
- Check available disk space

## Common Issues and Solutions

### Issue 1: Request Never Reaches Server
**Symptoms:**
- No logs in server console
- Request stuck in pending
- Network tab shows "pending" status

**Solutions:**
1. Verify `server.js` is running: `ps aux | grep node` or check process list
2. Check if port is correct (should match `PORT` env variable or 3000)
3. Check firewall/security groups
4. Verify the URL is correct (should be `/api/save-temp-image`, not absolute URL in dev)

### Issue 2: Multer Hanging
**Symptoms:**
- See "Request received" log
- Don't see "Multer processed successfully"
- Request times out after 30 seconds

**Solutions:**
1. Check file size - if > 10MB, increase limit in `setupProxy.js`:
   ```javascript
   limits: { fileSize: 20 * 1024 * 1024 } // 20MB
   ```
2. Check if FormData is being sent correctly:
   ```javascript
   console.log('FormData entries:', Array.from(formData.entries()));
   ```
3. Try reducing image quality/size before sending

### Issue 3: CORS Blocking
**Symptoms:**
- CORS error in browser console
- Request fails immediately

**Solutions:**
1. Verify CORS middleware is in `server.js` (should be first middleware)
2. Check if server is running (CORS only works if server.js is running)
3. For production, you might need to specify allowed origins instead of `*`

### Issue 4: File System Error
**Symptoms:**
- See "Multer processed successfully"
- See error about file system
- Request fails with 500 error

**Solutions:**
1. Check directory exists: `public/temp/edited-images/`
2. Check write permissions
3. Check disk space: `df -h`
4. The server will try to create the directory automatically, but needs write permissions

## Testing the Fix

### Test 1: Simple Test Endpoint
```bash
curl http://localhost:3000/api/test
```

### Test 2: Test File Upload
```bash
curl -X POST http://localhost:3000/api/save-temp-image \
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

### Test 3: From Browser Console
```javascript
const formData = new FormData();
const blob = new Blob(['test'], { type: 'image/png' });
formData.append('image', blob, 'test.png');
formData.append('fileName', 'test.png');

fetch('/api/save-temp-image', {
  method: 'POST',
  body: formData
})
.then(r => r.json())
.then(console.log)
.catch(console.error);
```

## What to Check in Production

1. **Server Logs**: Check Azure/cloud platform logs for the detailed logs we added
2. **Process Status**: Verify Node.js process is running
3. **Port Configuration**: Ensure `PORT` environment variable is set correctly
4. **File Permissions**: Ensure the deployment has write access to `public/temp/`
5. **Network**: Check if there are any load balancers or proxies that might be timing out

## Next Steps if Still Not Working

1. **Enable more verbose logging**: Add `console.log` at every step
2. **Check server resources**: CPU, memory, disk I/O
3. **Test with smaller files**: See if it's a file size issue
4. **Check for other middleware**: Any other Express middleware that might interfere
5. **Test locally first**: Make sure it works in local production mode (`npm run build && npm run serve`)

## Quick Checklist

- [ ] `server.js` is running (check process list)
- [ ] Server logs show request being received
- [ ] No CORS errors in browser console
- [ ] File size is under 10MB
- [ ] `public/temp/edited-images/` directory exists and is writable
- [ ] No firewall/security group blocking requests
- [ ] Port is correct (check `PORT` env variable)
- [ ] Test endpoint (`/api/test`) works

