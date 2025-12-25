# Asset Upload Integration Guide

This guide provides complete instructions for integrating the AssetUploadSection component into VideosList.js.

## Files Created

1. ✅ `src/utils/uploadAssets.js` - Utility functions for asset uploads
2. ✅ `src/Components/Scenes/AssetUploadSection.js` - React component for asset upload UI

---

## Step 1: Import Statement

Add this import at the top of `VideosList.js` (after line 15, with other imports):

```javascript
import AssetUploadSection from './AssetUploadSection';
```

**Exact Location:** After line 15 in `src/Components/Scenes/VideosList.js`

**Current Code Pattern:**
```javascript
import LoadingAnimationVideo from '../../asset/Loading animation.mp4';
```

**Add After:**
```javascript
import AssetUploadSection from './AssetUploadSection';
```

---

## Step 2: Component Placement

Add the `<AssetUploadSection />` component in the JSX return statement.

**Exact Location:** After line 6021, before line 6023 in `src/Components/Scenes/VideosList.js`

**Current Code Pattern (around line 6020-6023):**
```javascript
            )}
          </div>
        )}

        {/* React Video Editor - contained within the white panel */}
```

**Add Between:**
```javascript
            )}
          </div>
        )}

        {/* Asset Upload Section */}
        <AssetUploadSection 
          onUploadSuccess={(data) => {
            console.log('Assets uploaded successfully:', data);
            // Optionally refresh assets or show notification
          }}
          onUploadError={(error) => {
            console.error('Asset upload failed:', error);
            // Optionally show error notification
          }}
          showConvertColors={true}
        />

        {/* React Video Editor - contained within the white panel */}
```

---

## Step 3: Complete Code Block to Add

Copy and paste this exact code block after line 6021:

```javascript
        {/* Asset Upload Section */}
        <AssetUploadSection 
          onUploadSuccess={(data) => {
            console.log('Assets uploaded successfully:', data);
          }}
          onUploadError={(error) => {
            console.error('Asset upload failed:', error);
          }}
          showConvertColors={true}
        />
```

---

## File Structure

```
src/
├── utils/
│   └── uploadAssets.js                    ✅ Created
├── Components/
│   └── Scenes/
│       ├── VideosList.js                 ⚠️  Needs modification
│       └── AssetUploadSection.js          ✅ Created
```

---

## Component Props

The `AssetUploadSection` component accepts the following props:

| Prop | Type | Required | Default | Description |
|------|------|----------|---------|-------------|
| `onUploadSuccess` | `Function` | No | `undefined` | Callback fired when upload succeeds. Receives upload data as parameter. |
| `onUploadError` | `Function` | No | `undefined` | Callback fired when upload fails. Receives error object as parameter. |
| `showConvertColors` | `boolean` | No | `false` | Whether to show the "Convert colors" checkbox option. |

---

## Features

✅ **Multiple File Upload** - Users can select and upload multiple images at once  
✅ **Drag and Drop** - Supports drag and drop file uploads  
✅ **Progress Indication** - Shows loading spinner during upload  
✅ **Error Handling** - Displays user-friendly error messages  
✅ **Success Feedback** - Shows success message after successful upload  
✅ **Auto Refresh** - Automatically refreshes brand assets after upload  
✅ **Color Conversion** - Optional color conversion feature  
✅ **Console Logging** - Comprehensive debug logging for troubleshooting  

---

## API Endpoints Used

- **Get Profile ID:** `GET /v1/users/session-data/{token}`
- **Upload Images:** `POST /v1/users/brand-assets/profiles/{token}/{profileId}/upload-images`
- **Refresh Assets:** `GET /v1/users/brand-assets/images/{token}`

---

## Styling

The component uses Tailwind CSS classes matching the existing VideosList.js design:
- Primary color: `#13008B` (text-[#13008B], bg-[#13008B])
- Borders: `border-gray-200`, `border-gray-300`
- Backgrounds: `bg-white`, `bg-gray-50`, `bg-indigo-50`
- Rounded corners: `rounded-lg`
- Spacing: `mx-4 mb-3`, `p-4`, `gap-2`

---

## Testing Checklist

- [ ] Import statement added correctly
- [ ] Component placed in correct location
- [ ] Multiple file selection works
- [ ] Drag and drop works
- [ ] Upload progress indicator shows
- [ ] Success message appears after upload
- [ ] Error message appears on failure
- [ ] File input clears after upload
- [ ] Console logs appear for debugging
- [ ] Assets refresh after upload

---

## Troubleshooting

### Upload fails with "Missing user" error
- Check that user is logged in and token exists in localStorage
- Verify token is valid

### Upload fails with "Failed to get profile ID"
- Check network tab for session-data API call
- Verify user has a valid profile

### Files not uploading
- Check browser console for errors
- Verify file sizes are under 10MB
- Ensure files are image types (PNG, JPG, GIF)

### Component not showing
- Verify import path is correct: `'./AssetUploadSection'`
- Check that component is placed inside the return statement
- Ensure no syntax errors in VideosList.js

---

## Notes

- All code is in **plain JavaScript** (no TypeScript)
- All functions include **JSDoc comments**
- **Console.log** statements included for debugging
- **Error handling** implemented throughout
- **Tailwind CSS** styling matches existing design
- Component is **fully self-contained** and reusable

