# Avatar URLs Usage Guide - ImageList.js

This document shows where `avatar_urls` images are collected, processed, and displayed in the ImageList component.

## 📍 Flow Diagram

```
1. Data Collection (Lines 247-261)
   ↓
2. Added to refs array (Lines 265-266)
   ↓
3. Stored in rows state (via pushRow)
   ↓
4. Displayed in "Scene By Scene" section (Lines 2484-2534)
   ↓
5. Displayed in Selected Image section (Lines 1942-2364)
```

---

## 🔍 Detailed Locations

### 1. **Collection Point #1: Fallback for VEO3/SORA scenes** (Lines 246-273)
**Location:** Inside `mapSessionImages` function when processing scenes with image arrays

```javascript
// FALLBACK: Only use avatar_urls if no image arrays exist
const avatarUrls = Array.isArray(scene?.avatar_urls)
  ? scene.avatar_urls.map((av) => {
      if (typeof av === 'string') return av.trim();
      return (
        av?.imageurl ||
        av?.imageUrl ||
        av?.image_url ||
        av?.url ||
        av?.src ||
        av?.link ||
        av?.avatar_url ||
        ''
      );
    }).filter(url => url && typeof url === 'string' && url.trim())
  : [];

if (avatarUrls.length > 0) {
  finalRefs = avatarUrls;  // ← avatar_urls become the refs
}
```

**When used:** When a VEO3/SORA scene has NO image arrays (base_image URLs), avatar_urls are used as fallback.

---

### 2. **Collection Point #2: Scenes without image arrays** (Lines 424-442)
**Location:** Inside `mapSessionImages` function for remaining VEO3 scenes

```javascript
// Get avatar_urls
const avatarUrls = Array.isArray(scene?.avatar_urls)
  ? scene.avatar_urls.map((av) => {
      // ... same mapping logic
    }).filter(url => url && typeof url === 'string' && url.trim())
  : [];

// Combine, removing duplicates and background_image URLs
const refs = [...new Set([...collectedUrls, ...avatarUrls])].filter(Boolean);
```

**When used:** For VEO3 script scenes that don't have image arrays yet.

---

### 3. **Collection Point #3: In collectUrls function** (Lines 90-92)
**Location:** Helper function that gathers URLs from various sources

```javascript
// Only gather from avatar_urls (not background_image)
gatherFromArray(node?.avatar_urls);
gatherFromArray(node?.avatars);
```

**When used:** When collecting URLs from scene data objects.

---

### 4. **Display Location #1: "Scene By Scene" Section** (Lines 2482-2547)
**Location:** The horizontal scrollable scene list at the bottom

```javascript
{rows.map((r, i) => {
  const modelUpper = String(r?.model || '').toUpperCase();
  const first = (r.refs || [])[0];  // ← Could be avatar_urls
  const second = (r.refs || [])[1]; // ← Could be avatar_urls
  
  return (
    <div onClick={() => { /* ... */ }}>
      {/* Image 1 */}
      {first && (
        <img src={first} alt={`scene-${r.scene_number}-1`} />
      )}
      {/* Image 2 */}
      {hasSecond && (
        <img src={second} alt={`scene-${r.scene_number}-2`} />
      )}
    </div>
  );
})}
```

**Visual Location:** Bottom section "Scene By Scene" - horizontal cards showing scene thumbnails

---

### 5. **Display Location #2: Selected Image Section** (Lines 1942-2364)
**Location:** The large image display area when a scene is clicked

```javascript
const img1 = (Array.isArray(selected.images) && selected.images[0]) 
  ? selected.images[0] 
  : selected.imageUrl;  // ← Could be from avatar_urls

const img2 = Array.isArray(selected.images) ? selected.images[1] : '';

{/* Image 1 */}
<img src={img1} alt={`scene-${selected.sceneNumber}-1`} />

{/* Image 2 */}
{hasSecondImage && (
  <img src={img2} alt={`scene-${selected.sceneNumber}-2`} />
)}
```

**Visual Location:** Top section - large image display when you click a scene card

---

## 🎯 Current Behavior

### Priority Order:
1. **First Priority:** `base_image.image_url` from image arrays (if exists)
2. **Second Priority:** `avatar_urls` (only if no image arrays exist)

### When avatar_urls are shown:
- ✅ When a VEO3/ANCHOR scene has no image arrays yet
- ✅ When a scene is still being generated
- ✅ As a fallback when base_image URLs are not available

### When avatar_urls are NOT shown:
- ❌ When base_image URLs exist (they take priority)
- ❌ For non-VEO3 models (unless explicitly in the data)

---

## 🔧 Key Variables

- `r.refs` or `row.refs` - Contains the image URLs (could be avatar_urls)
- `first` - First image URL from refs array (line 2484)
- `second` - Second image URL from refs array (line 2485)
- `selected.images` - Array of selected scene images (line 2491)
- `selected.imageUrl` - Primary selected image URL (line 2494)

---

## 📝 Notes

- `avatar_urls` are always filtered to exclude `background_image` URLs
- `avatar_urls` are only used for VEO3/ANCHOR models
- The code prioritizes actual scene images over avatar_urls
- Console logs show the source: "avatar_urls (fallback)" when used

