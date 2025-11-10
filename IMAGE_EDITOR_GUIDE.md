# Image Editor - User Guide

## ✨ Completely Redesigned Image Editor

The Image Editor has been completely rebuilt from scratch with a cleaner, more intuitive design and better performance.

## 🎨 Features

### 1. **Move & Pan**
- Click and drag to move the image around
- Scroll wheel to zoom in/out
- Perfect for positioning your image

### 2. **Zoom Controls**
- **Zoom In**: Increase image size up to 500%
- **Zoom Out**: Decrease image size down to 10%
- **Reset Zoom**: Fit image perfectly to screen
- **Slider**: Fine-tune zoom level precisely

### 3. **Transform Tools**
- **Rotate**: Rotate image 90° clockwise
- **Flip Horizontal**: Mirror image left-right
- **Flip Vertical**: Mirror image up-down
- Visual indicators show active transformations

### 4. **Crop Tool**
- Click "Crop" to activate crop mode
- Draw a crop rectangle on the image
- Drag corners to resize the crop area
- Drag inside to move the crop area
- Click "Apply" to crop or "Cancel" to abort

### 5. **Undo/Redo**
- Full history tracking of all changes
- Undo: Go back to previous state
- Redo: Move forward in history
- Keeps last 50 changes

### 6. **Save**
- Exports edited image as PNG
- High quality (95% compression)
- Returns data URL to your application

## 🎯 How to Use

### Basic Workflow

1. **Open Editor**
   - Click the green edit button on any template image
   - The editor opens in fullscreen

2. **Edit Your Image**
   - Use Move tool (default) to pan and zoom
   - Use Crop tool to trim the image
   - Apply transformations (rotate, flip)
   - Undo/redo as needed

3. **Save or Cancel**
   - Click "Save Image" to apply changes
   - Click "X" to cancel and close

### Tool-Specific Instructions

#### Move Tool (Default)
- **Click & Drag**: Pan the image
- **Mouse Wheel**: Zoom in/out
- **Zoom Slider**: Precise zoom control

#### Crop Tool
1. Click "Crop" button in toolbar
2. Draw rectangle on image (click and drag)
3. Adjust corners by dragging handles
4. Move entire crop area by dragging inside
5. Click "Apply" when satisfied

#### Transformations
- **Rotate**: Click to rotate 90° each time
- **Flip Horizontal**: Toggle left-right mirror
- **Flip Vertical**: Toggle up-down mirror
- Active flips shown with blue highlight

## 🔧 Technical Details

### Image Loading Strategy

The editor uses a **direct loading** approach:

1. **All URLs**: Loaded directly using standard `<img>` element
2. **External URLs**: Sets `crossOrigin="anonymous"` for CORS support
3. **Data/Blob URLs**: Loaded instantly without CORS requirements
4. **Fast & Simple**: No pre-processing or conversion needed

### CORS Handling

The editor handles CORS for canvas operations:

1. **Loading**: Uses `crossOrigin="anonymous"` for external images
2. **Viewing**: Works even without CORS (image displays fine)
3. **Saving**: Requires CORS to be enabled to export edited image
4. **Error Messages**: Clear instructions if CORS blocks saving

### Performance

- **Canvas-based**: Hardware accelerated rendering
- **Efficient**: Only redraws when needed
- **Smooth**: 60fps interactions
- **Memory**: Automatically cleans up resources

## 🎨 UI Design

### Layout

```
┌─────────────────────────────────────────────┐
│  Header: Title, Info, Undo/Redo, Save       │
├──────────┬──────────────────────────────────┤
│          │                                   │
│ Toolbar  │       Canvas Area                │
│          │                                   │
│  Tools   │     (Image Display)              │
│  Zoom    │                                   │
│Transform │                                   │
│          │                                   │
└──────────┴──────────────────────────────────┘
```

### Color Scheme

- **Background**: Dark gray (#1F2937) for canvas focus
- **Toolbar**: White with clean borders
- **Active Tools**: Blue highlight (#3B82F6)
- **Buttons**: Gray with hover states
- **Save Button**: Blue (#2563EB) for prominence

### Icons

All icons from Lucide React:
- Move, Crop, ZoomIn, ZoomOut, Maximize2
- RotateCw, FlipHorizontal, FlipVertical
- Undo, Redo, Save, X (close)

## 🐛 Troubleshooting

### Image Won't Load

**Error**: "Failed to load image"

**Solutions**:
1. Check if the image URL is accessible (try opening it in a new tab)
2. Verify the URL is correct and complete
3. Check your internet connection
4. Look for specific errors in browser console (F12)

### Can't Save Edited Image

**Error**: "Tainted canvas" or "CORS error"

**Solutions**:
1. ⚠️ The image loads and displays fine, but saving requires CORS
2. Enable CORS on Azure Blob Storage (see CORS_SETUP_GUIDE.md)
3. This is a browser security restriction for cross-origin images
4. You can view and edit, but cannot export without CORS enabled

### Image Looks Pixelated

**Solutions**:
1. Don't zoom in too much (>200%)
2. Use higher resolution source images
3. The editor maintains original quality

### Crop Not Working

**Solutions**:
1. Make sure you're in Crop mode (blue highlight)
2. Draw the crop area large enough (minimum 10x10px)
3. Click "Apply" to execute the crop
4. Click "Cancel" to exit crop mode without applying

## 💡 Tips & Tricks

1. **Keyboard Shortcuts** (future):
   - Ctrl+Z: Undo
   - Ctrl+Y: Redo
   - Esc: Close editor

2. **Fast Workflow**:
   - Use mouse wheel for quick zoom
   - Double-click to reset zoom (future feature)
   - Use Undo liberally - it's instant

3. **Best Results**:
   - Start with high-quality images
   - Make larger crops (more pixels = better quality)
   - Use transformations before cropping
   - Save at appropriate zoom level

4. **Performance**:
   - Close other tabs for better performance
   - Avoid extremely large images (>5000px)
   - Clear history if editor feels slow (Reset All)

## 🚀 Future Enhancements

Planned features:
- [ ] Brightness/Contrast adjustments
- [ ] Filters (B&W, Sepia, etc.)
- [ ] Text overlay
- [ ] Multiple undo history visualization
- [ ] Keyboard shortcuts
- [ ] Touch/mobile support
- [ ] Export in different formats (JPEG, WebP)
- [ ] Aspect ratio lock for cropping
- [ ] Preset crop sizes (16:9, 4:3, 1:1)

---

## 📋 Component API

For developers integrating the editor:

```jsx
<CanvasImageEditor
  imageUrl={string}        // Image URL (data/blob/http)
  isOpen={boolean}         // Show/hide editor
  onClose={() => void}     // Called when user closes
  onSave={(dataUrl) => void}  // Called with edited image
/>
```

### Props

- **imageUrl**: Image to edit (data URL, blob URL, or HTTP URL)
- **isOpen**: Controls visibility of the modal
- **onClose**: Callback when editor is closed (cancel)
- **onSave**: Callback with edited image as data URL (PNG format)

### Example Usage

```jsx
const [editorOpen, setEditorOpen] = useState(false)
const [imageToEdit, setImageToEdit] = useState('')

const handleEdit = (url) => {
  setImageToEdit(url)
  setEditorOpen(true)
}

const handleSave = (editedDataUrl) => {
  console.log('Edited image:', editedDataUrl)
  // Upload to server, update state, etc.
  setEditorOpen(false)
}

return (
  <CanvasImageEditor
    imageUrl={imageToEdit}
    isOpen={editorOpen}
    onClose={() => setEditorOpen(false)}
    onSave={handleSave}
  />
)
```

---

**Version**: 2.0.0 (Complete Redesign)
**Last Updated**: November 2025

