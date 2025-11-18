# Testing Temp Image Save Feature

## Quick Test Guide

### Prerequisites
1. Ensure the development server is running: `npm start`
2. Ensure `multer` is installed: `npm list multer`
3. Ensure temp directory exists: `ls -la public/temp/edited-images/`

---

## Test 1: Basic Image Save

### Steps:
1. Open the app: `http://localhost:3000`
2. Navigate to a page with the Reel Reports Image Editor
3. Ensure you have at least one scene with images loaded
4. Click the **"Generate Videos"** button

### Expected Results:
✅ Images start downloading to your browser's download folder
✅ Browser console shows:
```
🎬 Starting image export and save process...
📸 Found X image containers to capture
📷 Capturing scene 1, image 1...
💾 Downloaded: scene-1-image-1.png
✅ Saved to temp folder: /temp/edited-images/scene-1-image-1.png
...
✅ Export complete. Failed: 0/X
```

✅ Server console shows:
```
📥 Received request to save temp image
📝 Saving: scene-1-image-1.png (Scene 1, Image 0)
✅ Image saved successfully: /path/to/public/temp/edited-images/scene-1-image-1.png
```

✅ Files appear in temp folder:
```bash
ls -la public/temp/edited-images/
# Should show: scene-1-image-1.png, scene-1-image-2.png, etc.
```

---

## Test 2: Image Overwrite

### Steps:
1. Run Test 1 first to save initial images
2. Note the file size: `ls -lh public/temp/edited-images/`
3. Edit one of the images in the Reel Reports Image Editor (e.g., change text, add overlay)
4. Click **"Generate Videos"** again

### Expected Results:
✅ Images are downloaded again
✅ Same filenames are used (e.g., `scene-1-image-1.png`)
✅ Files in temp folder are overwritten (check timestamp):
```bash
ls -lh public/temp/edited-images/
# Timestamps should be updated to current time
```

✅ No duplicate files created (e.g., no `scene-1-image-1 (1).png`)

---

## Test 3: Error Handling

### Test 3a: No Images in Editor
**Steps**: Navigate to page with no images, click "Generate Videos"
**Expected**: Alert shows "Canvas not found"

### Test 3b: Backend API Unavailable
**Steps**: Stop the dev server, try to save images
**Expected**: 
- Download still works (browser download)
- Console shows: `⚠️ Temp folder save failed (continuing with download)`
- No blocking errors, process continues

### Test 3c: Invalid File
**Steps**: 
1. Manually send invalid data to API:
```javascript
fetch('/api/save-temp-image', {
  method: 'POST',
  body: new FormData() // Empty FormData
})
```
**Expected**: 
- Server responds with 400 error
- Console shows: `❌ No file uploaded`

---

## Test 4: Accessing Saved Images

### Steps:
1. Save some images using Test 1
2. Open browser and navigate to: `http://localhost:3000/temp/edited-images/scene-1-image-1.png`

### Expected Results:
✅ Image is displayed in browser
✅ Image matches the downloaded version
✅ Image has all text overlays and effects

---

## Test 5: Multiple Scenes

### Steps:
1. Navigate to a project with multiple scenes (e.g., 5 scenes)
2. Click **"Generate Videos"**

### Expected Results:
✅ All images are captured and saved:
```
scene-1-image-1.png
scene-1-image-2.png
scene-2-image-1.png
scene-2-image-2.png
...
scene-5-image-2.png
```

✅ Small delay (200ms) between each download
✅ No images skipped
✅ Console shows success for all images

---

## Test 6: CORS Verification

### Steps:
1. Open browser DevTools → Network tab
2. Click **"Generate Videos"**
3. Filter for `save-temp-image` requests

### Expected Results:
✅ All POST requests to `/api/save-temp-image` return status **200**
✅ Response body contains:
```json
{
  "success": true,
  "message": "Image saved successfully",
  "path": "/temp/edited-images/scene-X-image-X.png",
  ...
}
```

✅ No CORS errors in console
✅ No "tainted canvas" errors

---

## Test 7: File Size Limit

### Steps:
1. Try to save a very large image (>10MB)
2. Check console for errors

### Expected Results:
⚠️ Multer should reject the file
⚠️ Console shows error (but download still works)
⚠️ Process continues with other images

---

## Verification Commands

### Check if files are saved:
```bash
ls -lh public/temp/edited-images/
```

### Check file count:
```bash
ls -1 public/temp/edited-images/ | wc -l
```

### Check file sizes:
```bash
du -sh public/temp/edited-images/
```

### View latest saved file:
```bash
ls -lt public/temp/edited-images/ | head -n 1
```

### Clear temp folder:
```bash
rm -rf public/temp/edited-images/*
```

---

## Common Issues & Solutions

### Issue 1: "Module not found: Can't resolve 'multer'"
**Solution**: 
```bash
npm install multer
```

### Issue 2: "Cannot find module 'fs'"
**Solution**: `fs` is a built-in Node module, should work automatically. Verify Node.js is installed.

### Issue 3: "Permission denied" when saving files
**Solution**: Check directory permissions:
```bash
chmod -R 755 public/temp/
```

### Issue 4: Images not loading from `/temp/edited-images/`
**Solution**: Ensure the dev server is serving static files from `public/` directory. Check `package.json` configuration.

### Issue 5: CORS errors when capturing images
**Solution**: 
1. Verify Azure CORS is configured (see AZURE_CORS_DEBUG.md)
2. Hard refresh browser (Ctrl+Shift+R)
3. Clear browser cache

---

## Success Criteria

All tests pass if:
- ✅ Images download to browser
- ✅ Images save to `public/temp/edited-images/`
- ✅ Images can be accessed via `/temp/edited-images/{filename}`
- ✅ Overwrites work correctly (same filename, updated timestamp)
- ✅ No blocking errors (temp save failure doesn't stop download)
- ✅ Console logs show success messages
- ✅ Server logs show 200 responses

---

## Performance Benchmarks

Expected performance:
- **Capture time**: ~500ms per image (depends on image size and complexity)
- **Download time**: ~100ms per image
- **API save time**: ~50ms per image
- **Total time for 10 images**: ~6-7 seconds

If significantly slower:
1. Check network latency
2. Check disk I/O performance
3. Consider reducing `html2canvas` scale (from 2 to 1)

---

## After Testing

### Cleanup (Optional):
```bash
# Remove all test images
rm -rf public/temp/edited-images/*

# Remove temp directory
rm -rf public/temp/
```

### Production Considerations:
1. Add automatic cleanup of old files (>24 hours)
2. Add rate limiting to prevent abuse
3. Add authentication/authorization
4. Consider using cloud storage instead of local storage
5. Add image compression to reduce file sizes
6. Monitor disk usage

---

## Automated Test Script (Optional)

```javascript
// test-temp-save.js
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, 'public', 'temp', 'edited-images');

// Test 1: Directory exists
console.log('Test 1: Directory exists');
if (fs.existsSync(tempDir)) {
  console.log('✅ Temp directory exists');
} else {
  console.log('❌ Temp directory does not exist');
}

// Test 2: Can write file
console.log('\nTest 2: Can write file');
try {
  const testFile = path.join(tempDir, 'test.txt');
  fs.writeFileSync(testFile, 'test content');
  console.log('✅ Can write to temp directory');
  fs.unlinkSync(testFile); // Clean up
} catch (error) {
  console.log('❌ Cannot write to temp directory:', error.message);
}

// Test 3: List files
console.log('\nTest 3: List saved images');
const files = fs.readdirSync(tempDir);
console.log(`Found ${files.length} files:`);
files.forEach(file => console.log(`  - ${file}`));

console.log('\n✅ All tests complete');
```

Run with: `node test-temp-save.js`

