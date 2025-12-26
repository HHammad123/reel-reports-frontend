# Text Overlay Request Body - Exact Format

## API Endpoint
```
PATCH /v1/videos/manage-layers
Content-Type: application/json
```

## Request Body Structure

### Option 1: Single Operation (Direct Format)
```javascript
{
  "session_id": "460d4818-82ca-4a73-b9b9-241403c20a66",
  "scene_number": 3,
  "operation": "add_layer",
  "layer": {
    "name": "text_overlay",
    "text": "LIMITED TIME OFFER!",
    "fontSize": 48,
    "fontFamily": "Arial",
    "fontWeight": "bold",
    "color": "#FF0000",
    "alignment": "center",
    "position": {"x": 0.5, "y": 0.2},
    "bounding_box": {"x": 0.1, "y": 0.15, "width": 0.8, "height": 0.1}
  },
  "start_time": "00:00:02",
  "end_time": "00:00:08"
}
```

### Option 2: Bulk Update (Current Implementation)
```javascript
{
  "session_id": "460d4818-82ca-4a73-b9b9-241403c20a66",
  "scene_number": 3,
  "operation": "bulk_update",
  "operations": [
    {
      "scene_number": 3,
      "operation": "add_layer",
      "layer": {
        "name": "text_overlay",
        "text": "LIMITED TIME OFFER!",
        "fontSize": 48,
        "fontFamily": "Arial",
        "fontWeight": "bold",
        "color": "#FF0000",
        "alignment": "center",
        "position": {"x": 0.5, "y": 0.2},
        "bounding_box": {"x": 0.1, "y": 0.15, "width": 0.8, "height": 0.1}
      },
      "start_time": "00:00:02",
      "end_time": "00:00:08"
    }
  ]
}
```

## Text Overlay Layer Properties

All properties use **camelCase** (not snake_case):

| Property | Type | Required | Description | Example |
|----------|------|----------|-------------|---------|
| `name` | string | Yes | Always `"text_overlay"` | `"text_overlay"` |
| `text` | string | Yes | The text content | `"LIMITED TIME OFFER!"` |
| `fontSize` | number | No | Font size in pixels | `48` |
| `fontFamily` | string | No | Font family name | `"Arial"` |
| `fontWeight` | string | No | Font weight: `"normal"`, `"bold"`, or `"100"`-`"900"` | `"bold"` |
| `color` | string | No | Text color (hex or rgb) | `"#FF0000"` |
| `alignment` | string | No | Text alignment: `"left"`, `"center"`, `"right"` | `"center"` |
| `position` | object | No | Position as `{x, y}` (0.0 to 1.0) | `{"x": 0.5, "y": 0.2}` |
| `bounding_box` | object | No | Text box area `{x, y, width, height}` (0.0 to 1.0) | `{"x": 0.1, "y": 0.15, "width": 0.8, "height": 0.1}` |

## Implementation Details

### Current Code Structure (VideosList.js)

The code now correctly builds text overlay layers with:

1. **CamelCase Properties**: `fontSize`, `fontFamily`, `fontWeight`, `color`, `alignment`
2. **Position Object**: `position: {x, y}` instead of separate `position_x` and `position_y`
3. **Bounding Box**: Optional `bounding_box` object with `{x, y, width, height}`
4. **Relative Timing**: `start_time` and `end_time` are relative to scene start
5. **Correct Scene Number**: Determined from timeline position

### Example: Text Layer at 17 Seconds in Scene 2

**Timeline:**
- Scene 1: 0-10 seconds (0-300 frames)
- Scene 2: 10-20 seconds (300-600 frames)
- Text overlay: Added at 17 seconds (510 frames)

**Request Body:**
```javascript
{
  "session_id": "abc123",
  "scene_number": 2,
  "operation": "bulk_update",
  "operations": [
    {
      "scene_number": 2,              // ✅ Correct scene (based on timeline)
      "operation": "add_layer",
      "start_time": "00:00:07",        // ✅ Relative: 17s - 10s = 7s
      "end_time": "00:00:12",          // ✅ Relative to scene start
      "layer": {
        "name": "text_overlay",
        "text": "My text",
        "fontSize": 48,
        "fontFamily": "Arial",
        "fontWeight": "bold",
        "color": "#FF0000",
        "alignment": "center",
        "position": {"x": 0.5, "y": 0.2},
        "bounding_box": {"x": 0.1, "y": 0.15, "width": 0.8, "height": 0.1}
      }
    }
  ]
}
```

## Key Fixes Applied

1. ✅ **Property Names**: Changed from snake_case to camelCase
   - `font_size` → `fontSize`
   - `font_family` → `fontFamily`
   - `font_weight` → `fontWeight`
   - `fill` → `color`

2. ✅ **Position Format**: Changed from separate properties to object
   - `position_x` and `position_y` → `position: {x, y}`

3. ✅ **Added Missing Properties**:
   - `fontWeight` (defaults to "normal" if not provided)
   - `alignment` (defaults to "center" if not provided)
   - `bounding_box` (optional, calculated from overlay dimensions)

4. ✅ **Timing**: Relative to scene start (not absolute)

5. ✅ **Scene Number**: Correctly determined from timeline position

## Testing

To verify the request body format:
1. Add a text overlay at 17 seconds
2. Check browser console for `[SAVE-LAYERS]` logs
3. Verify the request body sent to API matches the format above
4. Confirm the layer appears in the correct scene with correct timing

