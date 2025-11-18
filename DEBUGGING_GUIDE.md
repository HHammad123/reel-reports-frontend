# 🔍 Debugging Guide: Generate Videos Button

## Issue: Browser Reloads When Clicking "Generate Videos"

### ✅ Changes Made to Help Debug

1. **Added `e.preventDefault()`** to button click handler
2. **Enhanced logging** throughout the entire process
3. **Better error handling** with try-catch blocks
4. **Step-by-step console output** to track exactly where it fails

---

## 🧪 Debugging Steps

### Step 1: Open Browser Console

1. Open the app in Chrome/Firefox
2. Press `F12` or `Cmd+Option+I` (Mac) / `Ctrl+Shift+I` (Windows)
3. Go to the **Console** tab
4. Click "**Generate Videos**" button
5. Watch the console output

---

### Step 2: Check Console Logs

You should see logs in this order:

#### ✅ **Expected Flow:**

```
🎬 Generate Videos button clicked
📦 Step 1: Saving all images to temp folder...
🎬 Starting image save process for ALL scenes...
📊 Total scenes: X

🎬 Processing Scene 1...
   Model: VEO3
   Images: 2
📷 Scene 1, Image 1: Processing...
✅ Scene 1, Image 1: Saved to temp folder
📷 Scene 1, Image 2: Processing...
✅ Scene 1, Image 2: Saved to temp folder

[... continues for all scenes ...]

==================================================
✅ Save process complete!
   Total scenes: X
   Successfully saved: Y
   Failed: 0
==================================================

✅ All images saved successfully
📦 Step 2: Calling onGenerateVideos callback...
🎥 Passing X image URLs to video generation
✅ onGenerateVideos completed
🏁 Process complete, re-enabling button
```

Then you should see:
- Alert popup: "Successfully saved X image(s) to temp folder!"

#### ❌ **If Page Reloads Immediately:**

You'll see:
```
🎬 Generate Videos button clicked
```

Then the page reloads before any other logs appear.

**This means:** The button click is triggering a form submission or navigation.

---

## 🔍 What to Look For

### Scenario A: Page Reloads Immediately (Before Saving)

**Symptoms:**
- Only see "🎬 Generate Videos button clicked"
- Page refreshes instantly
- No images saved

**Likely Causes:**
1. Button is inside a `<form>` element
2. `e.preventDefault()` not working
3. Parent component is handling the click

**Check:**
```javascript
// Look in console for any errors
// Check Network tab for any navigation requests
// Look for <form> tags around the button
```

**Solution:**
- Verify button is NOT inside a `<form>` tag
- Check if parent component has click handlers
- Look for any routing/navigation code

---

### Scenario B: Saves Some Images, Then Reloads

**Symptoms:**
- See processing logs for some scenes
- Page reloads mid-process
- Partial images saved to temp folder

**Likely Causes:**
1. Error in `mergeFrameToDataUrl()`
2. Error in image processing
3. Memory overflow

**Check:**
```bash
# Check temp folder for partial saves
ls -la public/temp/edited-images/

# Look for error logs in console before reload
```

**Solution:**
- Look for last console log before reload
- Check error message (should show "❌ Error in handleGenerateVideosClick:")
- Reduce image count for testing

---

### Scenario C: Completes Save, Then Reloads

**Symptoms:**
- All processing logs complete
- Alert shows "Successfully saved X images"
- Then page reloads
- All images saved successfully

**Likely Causes:**
1. `onGenerateVideos()` callback triggers navigation
2. Parent component reloads page after callback
3. State update causes unmount/remount

**Check:**
```javascript
// Last logs before reload:
✅ onGenerateVideos completed
🏁 Process complete, re-enabling button

// Then reload happens
```

**Solution:**
- Check what `onGenerateVideos` callback does
- Look for `window.location.reload()` or `navigate()` calls
- Check parent component for side effects

---

## 🛠️ Quick Fixes

### Fix 1: If Button is in a Form

```javascript
// Find the button in ImageList.js and ensure:
<button
  type="button"  // ADD THIS if inside a form
  onClick={(e) => {
    e.preventDefault();
    e.stopPropagation();  // ADD THIS
    handleGenerateVideosClick();
  }}
>
```

### Fix 2: If onGenerateVideos Causes Reload

Temporarily disable it to test:

```javascript
// In handleGenerateVideosClick:
// Comment out this section:
/*
if (typeof onGenerateVideos === 'function') {
  const images = rows.flatMap(r => (Array.isArray(r?.refs) ? r.refs : []));
  await onGenerateVideos(images);
}
*/
```

Then test again. If it works, the issue is in `onGenerateVideos`.

### Fix 3: Check Network Tab

1. Open DevTools → **Network** tab
2. Click "Generate Videos"
3. Look for:
   - Page navigation (document type request)
   - POST requests to `/api/save-temp-image`
   - Any failed requests (red)

---

## 📊 Diagnostic Test

Run this in the browser console BEFORE clicking the button:

```javascript
// Test 1: Check if rows exist
console.log('Rows:', window.ImageListRows || 'not accessible');

// Test 2: Check if backend is reachable
fetch('/api/save-temp-image', { method: 'POST' })
  .then(r => console.log('Backend status:', r.status))
  .catch(e => console.error('Backend unreachable:', e));

// Test 3: Monitor for page unload
window.addEventListener('beforeunload', (e) => {
  console.log('⚠️ PAGE UNLOAD TRIGGERED!');
  console.trace(); // Shows call stack
});
```

Then click "Generate Videos" and see what happens.

---

## 🔴 Common Issues & Solutions

### Issue 1: "rows is empty"
```
📊 Total scenes: 0
❌ No scenes/rows found
```

**Solution:** 
- Data hasn't loaded yet
- Wait for images to load first
- Check if `mapSessionImages` ran successfully

### Issue 2: CORS errors
```
Access to image at '...' has been blocked by CORS policy
```

**Solution:**
- Check Azure CORS configuration
- See `AZURE_CORS_DEBUG.md`
- Ensure `crossOrigin="anonymous"` on images

### Issue 3: Backend not responding
```
❌ Scene 1, Image 1: Save failed (500)
```

**Solution:**
- Check backend server is running
- Check `/api/save-temp-image` endpoint
- Verify `multer` is installed
- Check server console for errors

### Issue 4: Out of memory
```
[No specific error, browser just freezes/reloads]
```

**Solution:**
- Too many images at once
- Reduce `scale: 2` to `scale: 1` in html2canvas
- Increase delay between images

---

## 📝 What to Report

If the issue persists, please provide:

1. **Console logs** (copy ALL console output)
2. **Network tab** (any failed requests)
3. **When it reloads** (immediately / after X scenes / after completion)
4. **Browser** (Chrome/Firefox/Safari + version)
5. **Number of scenes** in your project
6. **Temp folder contents** (ls -la public/temp/edited-images/)

---

## 🧪 Simple Test

To isolate the issue, try this minimal test:

```javascript
// In browser console:
async function testSave() {
  console.log('Starting test...');
  
  const canvas = document.createElement('canvas');
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = 'red';
  ctx.fillRect(0, 0, 100, 100);
  
  const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
  const file = new File([blob], 'test.png', { type: 'image/png' });
  
  const formData = new FormData();
  formData.append('image', file);
  formData.append('fileName', 'test.png');
  formData.append('sceneNumber', '999');
  formData.append('imageIndex', '0');
  
  const response = await fetch('/api/save-temp-image', {
    method: 'POST',
    body: formData
  });
  
  const result = await response.json();
  console.log('Test result:', result);
  
  // Check if file was created
  console.log('Check: public/temp/edited-images/test.png');
}

testSave();
```

If this works, the backend is fine. If it fails, there's a backend issue.

---

## ✅ Expected Outcome After Fix

1. Click "Generate Videos"
2. Button changes to "Saving images to temp folder…"
3. Console shows detailed progress
4. NO page reload during processing
5. Alert shows success message
6. Button returns to "Generate Videos"
7. All images in temp folder
8. Page stays on current view (no reload)

---

## 🚨 Emergency Fallback

If nothing works, temporarily comment out the `onGenerateVideos` call:

```javascript
// In handleGenerateVideosClick:
/*
if (typeof onGenerateVideos === 'function') {
  await onGenerateVideos(images);
}
*/
```

This will let you test JUST the image saving without triggering video generation.

