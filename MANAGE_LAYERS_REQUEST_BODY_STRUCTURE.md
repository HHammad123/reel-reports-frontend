# Manage Layers API - Updated Request Body Structure

## Overview

This document describes the **corrected** request body structure for the `/v1/videos/manage-layers` API, with proper scene number detection and relative timing calculations.

---

## Key Fixes Applied

### 1. **Scene Number Detection**
- ✅ Scene number is now correctly determined based on **timeline position** (frame position)
- ✅ Overlay at 17 seconds (510 frames at 30fps) is correctly assigned to Scene 2 if Scene 1 ends at 10 seconds
- ✅ Improved boundary detection for last scene (uses `<=` instead of `<`)

### 2. **Relative Timing Calculation**
- ✅ `start_time` and `end_time` are now **relative to scene start**, not absolute
- ✅ Example: Overlay at 17 seconds in Scene 2 (which starts at 10 seconds) → `start_time: "00:00:07"`
- ✅ Timing is calculated as: `relativeFrame = absoluteFrame - sceneStartFrame`

### 3. **Request Body Structure**
- ✅ `start_time` and `end_time` are at the **operation level**, not layer level
- ✅ `scene_number` is correctly set for each operation
- ✅ All layer properties are properly included

---

## Complete Request Body Structure

### Endpoint
```
PATCH /v1/videos/manage-layers
Content-Type: application/json
```

### Request Body Format

```javascript
{
  "session_id": "abc123",
  "scene_number": 2,  // Main scene number (used for bulk operations)
  "operation": "bulk_update",
  "operations": [
    {
      "scene_number": 2,           // ✅ CORRECT: Scene where overlay is located
      "operation": "add_layer",
      "start_time": "00:00:07",    // ✅ CORRECT: Relative to scene start (17s - 10s = 7s)
      "end_time": "00:00:12",      // ✅ CORRECT: Relative to scene start (optional)
      "layer": {
        "name": "text_overlay",    // Layer type: logo, chart, subtitles, text_overlay, watermark, custom_sticker, audio
        "text": "Sample text",     // For text-based layers
        "url": "https://...",      // For file-based layers (logo, chart, watermark, sticker, audio)
        "fontSize": 48,            // Text styling
        "fontFamily": "Arial",
        "fontWeight": "bold",
        "color": "#FF0000",
        "alignment": "center",
        "position": {              // Position in scene (0.0 to 1.0)
          "x": 0.5,
          "y": 0.5
        },
        "bounding_box": {          // Optional: Text box area
          "x": 0.1,
          "y": 0.15,
          "width": 0.8,
          "height": 0.1
        },
        "opacity": 1.0,            // For logo, watermark, chart
        "scale": 1.0,              // For logo, watermark, sticker
        "rotation": 0,             // For logo, sticker
        "has_background": true,    // For chart (false = remove white background)
        "volume": 0.7,             // For audio (0.0 to 1.0)
        "enter_animation": {      // Optional: Entry animation
          "type": "fade",
          "duration": 0.5,
          "direction": "left"
        },
        "exit_animation": {        // Optional: Exit animation
          "type": "fade",
          "duration": 0.5
        }
      }
    }
  ]
}
```

---

## Example: Text Layer at 17 Seconds

### Scenario
- **Scene 1**: 0-10 seconds (0-300 frames at 30fps)
- **Scene 2**: 10-20 seconds (300-600 frames at 30fps)
- **Text Layer**: Added at 17 seconds (510 frames)

### Calculation Process

1. **Determine Scene**:
   - Overlay frame: 510
   - Scene 1 range: 0-300 ❌ (not in range)
   - Scene 2 range: 300-600 ✅ (510 is in range)
   - **Result**: Scene 2

2. **Calculate Relative Timing**:
   - Absolute frame: 510
   - Scene 2 start frame: 300
   - Relative frame: 510 - 300 = 210 frames
   - Relative time: 210 / 30 = 7 seconds
   - **Result**: `start_time: "00:00:07"`

3. **Request Body**:
```javascript
{
  "session_id": "abc123",
  "scene_number": 2,
  "operation": "bulk_update",
  "operations": [
    {
      "scene_number": 2,           // ✅ Correct scene
      "operation": "add_layer",
      "start_time": "00:00:07",    // ✅ Relative to scene start
      "layer": {
        "name": "text_overlay",
        "text": "My text layer",
        "fontSize": 48,
        "fontFamily": "Arial",
        "color": "#000000",
        "position": { "x": 0.5, "y": 0.5 }
      }
    }
  ]
}
```

---

## Layer Type Examples

### 1. LOGO Layer
```javascript
{
  "scene_number": 1,
  "operation": "add_layer",
  "start_time": "00:00:00",
  "end_time": "00:00:10",
  "layer": {
    "name": "logo",
    "url": "https://storage.blob.com/logo.png",
    "position": { "x": 0.9, "y": 0.1 },
    "opacity": 1.0,
    "scale": 1.0,
    "rotation": 0
  }
}
```

### 2. CHART Layer (Video)
```javascript
{
  "scene_number": 2,
  "operation": "add_layer",
  "start_time": "00:00:00",
  "end_time": "00:00:10",
  "layer": {
    "name": "chart",
    "url": "https://storage.blob.com/chart.mp4",
    "position": { "x": 0.5, "y": 0.5 },
    "has_background": false,  // ✅ CRITICAL: false removes white background
    "opacity": 1.0,
    "scaling": {
      "scale_x": 1.0,
      "scale_y": 1.0,
      "fit_mode": "contain"
    }
  }
}
```

### 3. TEXT_OVERLAY Layer
```javascript
{
  "scene_number": 2,
  "operation": "add_layer",
  "start_time": "00:00:07",  // ✅ Relative to scene start
  "end_time": "00:00:12",
  "layer": {
    "name": "text_overlay",
    "text": "LIMITED TIME OFFER!",
    "fontSize": 48,
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FF0000",
    "alignment": "center",
    "position": { "x": 0.5, "y": 0.2 },
    "enter_animation": {
      "type": "fade",
      "duration": 0.5
    }
  }
}
```

### 4. SUBTITLES Layer
```javascript
{
  "scene_number": 2,
  "operation": "add_layer",
  "start_time": "00:00:00",
  "end_time": "00:00:10",
  "layer": {
    "name": "subtitles",
    "text": "This is subtitle text",  // Or use "url" for SRT file
    "position": { "x": 0.5, "y": 0.85 },
    "fontSize": 24,
    "fontFamily": "Inter",
    "fontWeight": "600",
    "color": "#FFFFFF",
    "textAlign": "center",
    "backgroundColor": "rgba(0, 0, 0, 0.7)"
  }
}
```

### 5. AUDIO Layer
```javascript
{
  "scene_number": 2,
  "operation": "add_layer",
  "start_time": "00:00:00",
  "end_time": "00:00:10",
  "layer": {
    "name": "audio",
    "url": "https://storage.blob.com/background-music.mp3",
    "volume": 0.7
  }
}
```

---

## Timing Calculation Details

### Formula
```javascript
// Step 1: Calculate scene frame ranges
scene1: frames 0-300 (0-10 seconds)
scene2: frames 300-600 (10-20 seconds)
scene3: frames 600-900 (20-30 seconds)

// Step 2: Determine which scene overlay belongs to
overlayFrame = 510
if (overlayFrame >= 300 && overlayFrame < 600) {
  scene = 2
}

// Step 3: Calculate relative timing
relativeFrame = overlayFrame - sceneStartFrame
relativeFrame = 510 - 300 = 210 frames
relativeTime = 210 / 30 fps = 7 seconds
start_time = "00:00:07"
```

---

## Important Notes

1. **Scene Number**: Must match the scene where the overlay appears in the timeline
2. **Timing**: Always relative to scene start (00:00:00 for scene start)
3. **Frame Calculation**: Uses FPS (default 30) to convert frames to time
4. **Boundary Detection**: Last scene uses `<=` for endFrame to include boundary
5. **Operation Level**: `start_time` and `end_time` are at operation level, not layer level

---

## Debugging

The code now includes comprehensive logging:
- Scene frame ranges calculated
- Overlay frame positions
- Scene matching results
- Relative timing calculations
- Final operation structure

Check browser console for detailed logs with `[SAVE-LAYERS]` prefix.

