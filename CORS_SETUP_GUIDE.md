# Image Editor CORS Setup Guide

## Problem

The Image Editor can **view** images from Azure Blob Storage, but fails to **save** edited images with errors like:
```
Failed to save image: Tainted canvas
```

This happens because Azure Blob Storage doesn't allow cross-origin requests by default. While you can view the image, you cannot export the edited version without CORS enabled.

## Solution: Enable CORS on Azure Blob Storage

### Option 1: Using Azure Portal (GUI)

1. **Open Azure Portal**
   - Go to https://portal.azure.com
   - Navigate to your Storage Account (`brandassetmain2`)

2. **Configure CORS**
   - In the left menu, scroll down to **Settings** section
   - Click on **Resource sharing (CORS)**
   - Select the **Blob service** tab

3. **Add CORS Rule**
   - Click **+ Add** to create a new rule
   - Enter the following settings:
     ```
     Allowed origins:           * (or https://yourdomain.com for better security)
     Allowed methods:           GET, PUT, OPTIONS
     Allowed headers:           *
     Exposed headers:           *
     Max age (seconds):         3600
     ```

4. **Save**
   - Click **Save** at the top of the page
   - Wait a few seconds for the changes to propagate

### Option 2: Using Azure CLI

```bash
az storage cors add \
  --services b \
  --methods GET PUT OPTIONS \
  --origins '*' \
  --allowed-headers '*' \
  --exposed-headers '*' \
  --max-age 3600 \
  --account-name brandassetmain2
```

### Option 3: Using Azure Storage Explorer

1. Download and install [Azure Storage Explorer](https://azure.microsoft.com/features/storage-explorer/)
2. Connect to your storage account
3. Right-click on your storage account → **Configure CORS Settings**
4. Add the rule for Blob Service with the same settings as Option 1

## Security Best Practices

For production, replace `*` in "Allowed origins" with your specific domain(s):
```
Allowed origins: https://yourdomain.com,http://localhost:3000
```

This prevents other websites from accessing your blob storage.

## Testing After Setup

1. **Clear Browser Cache**
   - Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
   - Clear cached images and files

2. **Test the Image Editor**
   - Refresh your application
   - Click the Edit button on any template image
   - The image should now load successfully

3. **Check Console**
   You should see these success messages:
   ```
   🔄 Detected external URL, attempting to fetch and convert...
   Response status: 200
   ✅ Blob received!
   ✅✅✅ Image successfully converted to data URL!
   ✅ Image editor opened with data URL
   ```

## Troubleshooting

### Still getting CORS errors?

1. **Wait 5 minutes** - CORS rules can take a few minutes to propagate
2. **Check the storage account name** - Make sure you updated the correct storage account
3. **Verify the rule** - Go back to Azure Portal and confirm the CORS rule is saved
4. **Check browser console** - Look for specific CORS error messages

### Images load but can't save?

This means CORS is working for reading but not for writing. Make sure you included `PUT` in the allowed methods.

### Local development issues?

Add `http://localhost:3000` to allowed origins:
```
Allowed origins: http://localhost:3000,https://yourdomain.com
```

## Technical Details

### Why is CORS needed?

- The Image Editor needs to:
  1. ✅ Load the image from Azure Blob Storage (works without CORS)
  2. ✅ Display it in an HTML Canvas (works without CORS)
  3. ✅ Allow editing (move, crop, rotate, etc.) (works without CORS)
  4. ❌ Export the edited image as a data URL (requires CORS)

Without CORS, steps 1-3 work fine, but step 4 (saving) fails because the canvas becomes "tainted" by cross-origin content.

### What happens with CORS enabled?

1. Browser loads the image with `crossOrigin="anonymous"`
2. Azure responds with CORS headers allowing the request
3. Browser marks the canvas as "not tainted"
4. Editor can export the canvas to data URL successfully
5. User can save the edited image

## Alternative Solution: Backend Proxy

If you can't enable CORS on Azure, create a backend endpoint that proxies image requests:

```javascript
// Backend (Node.js/Express example)
app.get('/api/proxy-image', async (req, res) => {
  const imageUrl = req.query.url;
  const response = await fetch(imageUrl);
  const buffer = await response.buffer();
  res.set('Content-Type', response.headers.get('content-type'));
  res.send(buffer);
});
```

Then modify the frontend to use the proxy:
```javascript
const proxyUrl = `/api/proxy-image?url=${encodeURIComponent(imageUrl)}`;
```

---

**Need help?** Check the Azure documentation:
https://docs.microsoft.com/en-us/rest/api/storageservices/cross-origin-resource-sharing--cors--support-for-the-azure-storage-services

