# Delete Layer Implementation

## Overview

A `deleteLayer` function has been added to `VideosList.js` that allows deleting text layers (or any layers) from the timeline using the manage-layers API.

## Function Signature

```javascript
const deleteLayer = async (sceneNumber, layerName = 'text_overlay', layerIndex) => {
  // Implementation
}
```

## Parameters

- `sceneNumber` (number, required): The scene number where the layer exists
- `layerName` (string, optional, default: 'text_overlay'): The layer name to delete
- `layerIndex` (number, required): The index of the layer to delete

## API Request Format

The function sends the following request to the manage-layers API:

```javascript
{
  "session_id": "460d4818-82ca-4a73-b9b9-241403c20a66",
  "scene_number": 3,
  "operation": "delete_layer",
  "layer_selector": {
    "name": "text_overlay",
    "index": 2
  }
}
```

## Example Usage

```javascript
// Delete text overlay at index 2 from scene 3
await deleteLayer(3, 'text_overlay', 2);

// Delete logo layer at index 0 from scene 1
await deleteLayer(1, 'logo', 0);

// Delete chart layer at index 1 from scene 2
await deleteLayer(2, 'chart', 1);
```

## Behavior

1. **Validates Input**: Checks for session_id and layerIndex
2. **Calls API**: Sends DELETE request to `/v1/videos/manage-layers`
3. **Refreshes Page**: After successful deletion, automatically refreshes the page using `window.location.reload()`
4. **Error Handling**: Shows alert if deletion fails

## Integration with Timeline

To integrate with the timeline delete functionality:

1. **Get Layer Information**: When a user clicks delete on a layer in the timeline:
   - Determine the scene number from the layer's timeline position
   - Get the layer name (e.g., "text_overlay", "logo", "chart")
   - Get the layer index (the position of this layer among layers of the same type in the scene)

2. **Call deleteLayer**: 
   ```javascript
   // Example: Delete text overlay from timeline
   const handleTimelineDelete = async (overlay) => {
     const sceneNumber = getSceneNumberFromOverlay(overlay);
     const layerIndex = getLayerIndex(overlay);
     await deleteLayer(sceneNumber, 'text_overlay', layerIndex);
   };
   ```

3. **Page Refresh**: The page will automatically refresh after successful deletion

## Determining Layer Index

The layer index is the position of the layer among layers of the same type in the scene. For example:
- If scene 3 has 3 text overlays, they have indices 0, 1, and 2
- The index is determined by the order in which layers appear in the scene

## Notes

- The function uses `window.location.reload()` to refresh the page after deletion
- This ensures the timeline reflects the updated layer state from the server
- All console logs are prefixed with `[DELETE-LAYER]` for easy debugging

