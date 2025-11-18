# Temporary Image Storage Feature

## Overview

This feature allows the Reel Reports Image Editor to save edited images to a temporary local folder while also downloading them to the user's device. Images with the same name will be automatically overwritten when saved again.

## How It Works

### 1. Frontend - Generate Videos (ImageList.js)

When a user clicks the "Generate Videos" button:

1. **Capture Images**: Uses `html2canvas` to capture all images from the "Reel Reports Image Editor" section
2. **Download**: Triggers browser download of each image
3. **Save to Temp Folder**: Sends the image to the backend API to save it in the temporary folder
4. **Overwrite**: If an image with the same filename already exists, it gets overwritten

```javascript
// Frontend implementation
const mergeAndDownloadAllImages = async () => {
  const imageContainers = document.querySelectorAll('[data-image-container]');
  
  for (let container of imageContainers) {
    // Capture with html2canvas
    const canvas = await html2canvas(container, {
      useCORS: true,
      allowTaint: true,
      backgroundColor: null,
      scale: 2
    });
    
    // 1. Download to user's device
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = fileName;
    link.href = dataUrl;
    link.click();
    
    // 2. Save to temp folder via API
    const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const formData = new FormData();
    formData.append('image', new File([blob], fileName));
    formData.append('fileName', fileName);
    
    await fetch('/api/save-temp-image', {
      method: 'POST',
      body: formData
    });
  }
};
```

### 2. Frontend - Save Changes in Editor Popup (ImageEdit.js)

When a user clicks the "Save Changes" button inside the Reel Reports Image Editor popup:

1. **Save to API**: Sends text and overlay changes to the backend API
2. **Capture Editor Canvas**: Uses `html2canvas` to capture the entire editor canvas (image + text layers + overlays)
3. **Save to Temp Folder**: Automatically saves the captured image to the temp folder via API
4. **Overwrite**: Uses the same filename format, so it overwrites any existing version
5. **Refresh Page**: Reloads the page to show updated changes

```javascript
// Frontend implementation
const handleSaveChanges = async () => {
  // 1. Save changes to API
  const response = await fetch('/api/image-editing/elements', {
    method: 'PUT',
    body: JSON.stringify(textElements, overlayElements)
  });
  
  // 2. Save to temp folder
  await saveImageToTempFolder();
  
  // 3. Reload page
  window.location.reload();
};

const saveImageToTempFolder = async () => {
  const canvas = document.querySelector('[data-image-editor-canvas]');
  const capturedCanvas = await html2canvas(canvas, {
    useCORS: true,
    allowTaint: true,
    backgroundColor: null,
    scale: 2
  });
  
  const blob = await new Promise(resolve => capturedCanvas.toBlob(resolve, 'image/png'));
  const fileName = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;
  
  const formData = new FormData();
  formData.append('image', new File([blob], fileName));
  formData.append('fileName', fileName);
  
  await fetch('/api/save-temp-image', {
    method: 'POST',
    body: formData
  });
};
```

### 3. Backend (setupProxy.js)

The backend API endpoint `/api/save-temp-image` handles saving images:

```javascript
app.post('/api/save-temp-image', upload.single('image'), async (req, res) => {
  const fileName = req.body.fileName;
  const tempDir = path.join(__dirname, '..', 'public', 'temp', 'edited-images');
  
  // Create directory if it doesn't exist
  fs.mkdirSync(tempDir, { recursive: true });
  
  // Save file (overwrites if exists)
  const filePath = path.join(tempDir, fileName);
  fs.writeFileSync(filePath, req.file.buffer);
  
  res.json({
    success: true,
    path: `/temp/edited-images/${fileName}`,
    fileName: fileName
  });
});
```

## File Structure

```
reelreportsnew/
├── public/
│   └── temp/
│       └── edited-images/
│           ├── scene-1-image-1.png
│           ├── scene-1-image-2.png
│           ├── scene-2-image-1.png
│           └── ...
├── src/
│   ├── setupProxy.js          # Backend API endpoint
│   └── Components/
│       └── Scenes/
│           └── ImageList.js    # Frontend image save logic
└── .gitignore                  # Excludes /public/temp/ from git
```

## Features

### ✅ Download to Browser
- Images are downloaded to the user's default download folder
- Filename format: `scene-{number}-image-{index}.png`

### ✅ Save to Temp Folder
- Images are saved to `public/temp/edited-images/`
- Can be accessed via `/temp/edited-images/{filename}`
- Overwrites existing files with the same name

### ✅ Automatic Overwrite
- When the same image is saved again, the old file is automatically replaced
- No duplicate files or versioning needed

### ✅ Git Ignored
- The `/public/temp/` folder is automatically ignored by git
- Temporary images won't be committed to the repository

## API Endpoint

### POST `/api/save-temp-image`

**Request:**
- Method: `POST`
- Content-Type: `multipart/form-data`
- Body:
  - `image` (File): The image file to save
  - `fileName` (String): Name of the file
  - `sceneNumber` (String): Scene number (metadata)
  - `imageIndex` (String): Image index (metadata)

**Response:**
```json
{
  "success": true,
  "message": "Image saved successfully",
  "path": "/temp/edited-images/scene-1-image-1.png",
  "fileName": "scene-1-image-1.png",
  "fullPath": "/absolute/path/to/public/temp/edited-images/scene-1-image-1.png",
  "sceneNumber": "1",
  "imageIndex": "0"
}
```

**Error Response:**
```json
{
  "error": "Failed to save image",
  "message": "Error details here"
}
```

## Usage

### For Users

**Method 1: Generate Videos Button**
1. View images in the Reel Reports Image Editor section (detailed view)
2. Click "Generate Videos" button
3. All images will be:
   - ✅ Downloaded to your device
   - ✅ Saved to the temporary folder

**Method 2: Edit in Popup**
1. Click the "Edit" button (pencil icon) on any image
2. Make changes (add/edit text, add overlays, adjust filters, etc.)
3. Click "Save Changes" button in the editor popup
4. The edited image will be:
   - ✅ Saved to the API (text/overlay changes)
   - ✅ Automatically saved to the temporary folder
   - ✅ Page will reload to show changes

**Auto-Overwrite**
- If you edit and save the same image again, it will automatically replace the old one
- No duplicate files or versioning

### For Developers

**Accessing saved images:**
```javascript
// From frontend
const imageUrl = '/temp/edited-images/scene-1-image-1.png';
<img src={imageUrl} alt="Scene 1 Image 1" />
```

**Clearing temp folder:**
```bash
# Manually delete all temp images
rm -rf public/temp/edited-images/*
```

**Checking saved images:**
```bash
# List all saved images
ls -la public/temp/edited-images/
```

## Dependencies

### New Packages
- `multer` (^1.4.5-lts.1): For handling multipart/form-data file uploads

### Existing Packages
- `html2canvas` (^1.4.1): For capturing DOM elements as images
- `fs`, `path`: Node.js built-in modules

## Configuration

### Temp Folder Location
Default: `public/temp/edited-images/`

To change the location, update `setupProxy.js`:
```javascript
const tempDir = path.join(__dirname, '..', 'public', 'temp', 'edited-images');
```

### File Size Limit
Default: 10MB per file

To change, update `setupProxy.js`:
```javascript
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 } // Change this value
})
```

### Image Quality
Default: scale: 2 (2x resolution)

To change, update `ImageList.js`:
```javascript
const canvas = await html2canvas(container, {
  scale: 2  // Change this value (1 = normal, 2 = 2x, etc.)
});
```

## Troubleshooting

### Issue: Images not saving to temp folder

**Solution 1**: Check if `multer` is installed
```bash
npm list multer
```

**Solution 2**: Check if temp directory exists
```bash
ls -la public/temp/
```

**Solution 3**: Check backend console logs
Look for error messages starting with `❌ Error saving temp image:`

### Issue: CORS errors when capturing images

**Solution**: Ensure Azure Blob Storage CORS is properly configured:
- Allowed origins: `*`
- Allowed methods: `GET, HEAD, OPTIONS`
- Allowed headers: `*`

### Issue: Temp folder growing too large

**Solution**: Implement a cleanup script or cron job:
```javascript
// cleanup-temp.js
const fs = require('fs');
const path = require('path');

const tempDir = path.join(__dirname, 'public', 'temp', 'edited-images');
const files = fs.readdirSync(tempDir);

// Delete files older than 24 hours
const now = Date.now();
files.forEach(file => {
  const filePath = path.join(tempDir, file);
  const stats = fs.statSync(filePath);
  const age = now - stats.mtimeMs;
  
  if (age > 24 * 60 * 60 * 1000) { // 24 hours
    fs.unlinkSync(filePath);
    console.log(`Deleted old file: ${file}`);
  }
});
```

## Security Considerations

1. **File Type Validation**: Currently only accepts images via multer
2. **File Size Limit**: Set to 10MB to prevent large uploads
3. **Directory Traversal Protection**: Uses `path.join()` to prevent path traversal attacks
4. **Git Ignored**: Temporary files are not committed to version control

## Future Enhancements

- [ ] Add automatic cleanup of old temp images
- [ ] Add image compression before saving
- [ ] Add support for custom save locations
- [ ] Add image metadata tracking (timestamps, user info)
- [ ] Add image preview/gallery for temp folder
- [ ] Add batch download feature
- [ ] Add image versioning (optional)

