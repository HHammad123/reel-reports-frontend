# 🚀 Quick Reference: Temp Image Save Feature

## Two Ways to Save Images

### Method 1: Generate Videos Button
```
Location: Main Reel Reports Image Editor section
Button: "Generate Videos"
Action: Downloads + Saves all images to temp folder
```

### Method 2: Editor Popup Save
```
Location: Image Edit popup (click pencil icon)
Button: "Save Changes"
Action: Automatically saves edited image to temp folder
```

---

## File Locations

| What | Where |
|------|-------|
| Temp Images | `public/temp/edited-images/` |
| Frontend (Generate Videos) | `src/Components/Scenes/ImageList.js` |
| Frontend (Editor Popup) | `src/pages/ImageEdit.js` |
| Backend API | `src/setupProxy.js` |
| Documentation | `TEMP_IMAGE_STORAGE.md` |

---

## API Endpoint

```
POST /api/save-temp-image
Content-Type: multipart/form-data

Request:
- image (File)
- fileName (String)
- sceneNumber (String)
- imageIndex (String)

Response:
{
  "success": true,
  "path": "/temp/edited-images/scene-1-image-1.png",
  "fileName": "scene-1-image-1.png"
}
```

---

## File Naming

```
Format: scene-{sceneNumber}-image-{imageIndex+1}.png

Examples:
- scene-1-image-1.png
- scene-1-image-2.png
- scene-2-image-1.png
```

---

## Quick Commands

### View saved images
```bash
ls -lh public/temp/edited-images/
```

### Count images
```bash
ls -1 public/temp/edited-images/ | wc -l
```

### Check disk usage
```bash
du -sh public/temp/edited-images/
```

### Delete all temp images
```bash
rm -rf public/temp/edited-images/*
```

### Access via URL
```
http://localhost:3000/temp/edited-images/scene-1-image-1.png
```

---

## Console Logs

### Success Logs
```
🎬 Starting image export and save process...
📸 Found X image containers to capture
📷 Capturing scene X, image X...
💾 Downloaded: scene-1-image-1.png
✅ Saved to temp folder: /temp/edited-images/scene-1-image-1.png
✅ Export complete. Failed: 0/X
```

### Error Logs
```
❌ No image containers found
⚠️ Temp folder save failed (continuing with download)
❌ Failed to export scene X, image X
```

---

## Testing Checklist

- [ ] Start dev server: `npm start`
- [ ] Test Method 1: Click "Generate Videos"
- [ ] Verify downloads folder has images
- [ ] Verify temp folder has images
- [ ] Test Method 2: Edit image → "Save Changes"
- [ ] Verify success popup appears
- [ ] Verify page reloads
- [ ] Verify temp folder has image
- [ ] Test overwrite: Edit same image again
- [ ] Verify only one file exists (no duplicates)

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Images not saving | Check backend server is running |
| CORS errors | Configure Azure CORS (see AZURE_CORS_DEBUG.md) |
| "Failed to save" | Check `multer` is installed: `npm list multer` |
| Disk space full | Delete old images: `rm -rf public/temp/*` |
| Temp folder missing | Will be created automatically on first save |

---

## Configuration

### Change file size limit
Edit `src/setupProxy.js`:
```javascript
const upload = multer({
  limits: { fileSize: 10 * 1024 * 1024 } // Change this
})
```

### Change image quality
Edit save functions:
```javascript
const canvas = await html2canvas(container, {
  scale: 2  // Change this (1 = normal, 2 = 2x)
});
```

### Change temp directory
Edit `src/setupProxy.js`:
```javascript
const tempDir = path.join(__dirname, '..', 'public', 'temp', 'edited-images');
// Change 'edited-images' to your preferred folder
```

---

## Key Features

✅ Automatic save on "Generate Videos"
✅ Automatic save on "Save Changes" in editor
✅ Auto-overwrite (no duplicates)
✅ High quality (2x resolution)
✅ Error handling (doesn't block main flow)
✅ Git ignored (won't commit temp files)
✅ Accessible via URL

---

## Documentation

| File | Purpose |
|------|---------|
| TEMP_IMAGE_STORAGE.md | Complete feature docs |
| CHANGES_SUMMARY.md | Change log |
| TEST_TEMP_SAVE.md | Testing guide |
| AZURE_CORS_DEBUG.md | CORS troubleshooting |
| IMPLEMENTATION_COMPLETE.md | Implementation summary |
| QUICK_REFERENCE.md | This file |

---

## Support

For issues or questions:
1. Check console logs (frontend & backend)
2. Refer to troubleshooting section above
3. See full documentation in `TEMP_IMAGE_STORAGE.md`
4. Check test guide in `TEST_TEMP_SAVE.md`

---

**Status:** ✅ Complete and Working
**Last Updated:** November 18, 2024

