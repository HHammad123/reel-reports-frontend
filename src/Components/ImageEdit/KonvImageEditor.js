import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Image as KonvaImage, Text, Transformer } from 'react-konva';
import useImage from 'use-image';
import PropTypes from 'prop-types';

// ============================================
// EditableText Component - Individual text element with selection
// ============================================
const EditableText = ({ textData, isSelected, onSelect, onChange }) => {
  const textRef = useRef();
  const transformerRef = useRef();

  useEffect(() => {
    if (isSelected && transformerRef.current && textRef.current) {
      transformerRef.current.nodes([textRef.current]);
      transformerRef.current.getLayer().batchDraw();
    }
  }, [isSelected]);

  return (
    <>
      <Text
        ref={textRef}
        text={textData.text}
        x={textData.x}
        y={textData.y}
        fontSize={textData.fontSize}
        fontFamily={textData.fontFamily}
        fontStyle={textData.fontWeight === 'bold' ? 'bold' : 'normal'}
        fill={textData.fill}
        shadowColor={textData.textShadowColor}
        shadowBlur={textData.textShadowBlur}
        shadowOffsetX={textData.textShadowOffsetX}
        shadowOffsetY={textData.textShadowOffsetY}
        draggable
        onClick={onSelect}
        onTap={onSelect}
        onDragEnd={(e) => {
          onChange({
            ...textData,
            x: e.target.x(),
            y: e.target.y(),
          });
        }}
        onTransformEnd={(e) => {
          const node = textRef.current;
          const scaleX = node.scaleX();
          const scaleY = node.scaleY();

          // Reset scale
          node.scaleX(1);
          node.scaleY(1);

          onChange({
            ...textData,
            x: node.x(),
            y: node.y(),
            fontSize: Math.max(10, node.fontSize() * scaleY),
          });
        }}
      />
      {isSelected && (
        <Transformer
          ref={transformerRef}
          boundBoxFunc={(oldBox, newBox) => {
            // Limit minimum size
            if (newBox.width < 50 || newBox.height < 20) {
              return oldBox;
            }
            return newBox;
          }}
        />
      )}
    </>
  );
};

EditableText.propTypes = {
  textData: PropTypes.shape({
    id: PropTypes.string.isRequired,
    text: PropTypes.string.isRequired,
    x: PropTypes.number.isRequired,
    y: PropTypes.number.isRequired,
    fontSize: PropTypes.number.isRequired,
    fontFamily: PropTypes.string.isRequired,
    fontWeight: PropTypes.string.isRequired,
    fill: PropTypes.string.isRequired,
    textShadowColor: PropTypes.string,
    textShadowBlur: PropTypes.number,
    textShadowOffsetX: PropTypes.number,
    textShadowOffsetY: PropTypes.number,
  }).isRequired,
  isSelected: PropTypes.bool.isRequired,
  onSelect: PropTypes.func.isRequired,
  onChange: PropTypes.func.isRequired,
};

// ============================================
// Background Image Component - FIXED VERSION
// ============================================
const BackgroundImage = ({ src, onLoad }) => {
  // Add status to track loading state
  const [image, status] = useImage(src, 'anonymous');

  useEffect(() => {
    console.log('Image status:', status);
    console.log('Image loaded:', image);
    
    if (image) {
      console.log('Image dimensions:', image.width, 'x', image.height);
      onLoad(image);
    }
  }, [image, status, onLoad]);

  // Show loading indicator
  if (status === 'loading') {
    console.log('Image is loading...');
  }

  if (status === 'failed') {
    console.error('Failed to load image:', src);
  }

  // Return null if image is not loaded yet to prevent errors
  if (!image) {
    return null;
  }

  return <KonvaImage image={image} />;
};

BackgroundImage.propTypes = {
  src: PropTypes.string.isRequired,
  onLoad: PropTypes.func.isRequired,
};

// ============================================
// Main Canvas Editor Component
// ============================================
const TextImageEditor = ({ initialImageUrl, initialTextElements }) => {
  const [imageUrl, setImageUrl] = useState(initialImageUrl);
  const [imageDimensions, setImageDimensions] = useState({ width: 1312, height: 736 });
  const [textElements, setTextElements] = useState(initialTextElements || []);
  const [selectedId, setSelectedId] = useState(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  const stageRef = useRef();

  // Text editing form state
  const [editingText, setEditingText] = useState('');
  const [editingFontSize, setEditingFontSize] = useState(48);
  const [editingFontFamily, setEditingFontFamily] = useState('Arial');
  const [editingFill, setEditingFill] = useState('#FFFFFF');
  const [editingFontWeight, setEditingFontWeight] = useState('normal');

  // Get selected text element
  const selectedElement = textElements.find((el) => el.id === selectedId);

  // Update form when selection changes
  useEffect(() => {
    if (selectedElement) {
      setEditingText(selectedElement.text);
      setEditingFontSize(selectedElement.fontSize);
      setEditingFontFamily(selectedElement.fontFamily);
      setEditingFill(selectedElement.fill);
      setEditingFontWeight(selectedElement.fontWeight);
    }
  }, [selectedElement]);

  // Handle image load
  const handleImageLoad = (image) => {
    console.log('handleImageLoad called with image:', image);
    if (image) {
      setImageDimensions({
        width: image.width,
        height: image.height,
      });
      setImageLoaded(true);
      console.log('Image dimensions set to:', image.width, 'x', image.height);
    }
  };

  // Add new text
  const addNewText = () => {
    const newText = {
      id: `text_${Date.now()}`,
      text: 'New Text',
      x: imageDimensions.width / 2 - 100,
      y: imageDimensions.height / 2,
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fill: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowBlur: 6,
      textShadowOffsetX: 3,
      textShadowOffsetY: 3,
    };
    setTextElements([...textElements, newText]);
    setSelectedId(newText.id);
  };

  // Update selected text
  const updateSelectedText = () => {
    if (!selectedId) return;

    setTextElements(
      textElements.map((el) =>
        el.id === selectedId
          ? {
              ...el,
              text: editingText,
              fontSize: editingFontSize,
              fontFamily: editingFontFamily,
              fill: editingFill,
              fontWeight: editingFontWeight,
            }
          : el
      )
    );
  };

  // Delete selected text
  const deleteSelectedText = () => {
    if (!selectedId) return;
    setTextElements(textElements.filter((el) => el.id !== selectedId));
    setSelectedId(null);
  };

  // Update text element position/transform
  const handleTextChange = (id, newAttrs) => {
    setTextElements(
      textElements.map((el) => (el.id === id ? { ...el, ...newAttrs } : el))
    );
  };

  // Export image
  const exportImage = () => {
    if (!stageRef.current) {
      console.error('Stage ref is not available');
      return;
    }

    try {
      const uri = stageRef.current.toDataURL({
        pixelRatio: 2, // Higher quality
      });

      // Download
      const link = document.createElement('a');
      link.download = 'edited-image.png';
      link.href = uri;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting image:', error);
      alert('Failed to export image. This may be due to CORS restrictions.');
    }
  };

  // Deselect when clicking on empty area
  const checkDeselect = (e) => {
    const clickedOnEmpty = e.target === e.target.getStage();
    if (clickedOnEmpty) {
      setSelectedId(null);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', padding: '20px' }}>
      {/* Canvas Area */}
      <div style={{ border: '2px solid #ccc', borderRadius: '8px', overflow: 'hidden', position: 'relative' }}>
        {!imageLoaded && (
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            background: 'white',
            padding: '20px',
            borderRadius: '8px',
            boxShadow: '0 2px 10px rgba(0,0,0,0.1)'
          }}>
            Loading image...
          </div>
        )}
        <Stage
          ref={stageRef}
          width={imageDimensions.width}
          height={imageDimensions.height}
          onMouseDown={checkDeselect}
          onTouchStart={checkDeselect}
        >
          <Layer>
            <BackgroundImage src={imageUrl} onLoad={handleImageLoad} />
            {textElements.map((textData) => (
              <EditableText
                key={textData.id}
                textData={textData}
                isSelected={textData.id === selectedId}
                onSelect={() => setSelectedId(textData.id)}
                onChange={(newAttrs) => handleTextChange(textData.id, newAttrs)}
              />
            ))}
          </Layer>
        </Stage>
      </div>

      {/* Control Panel */}
      <div style={{ width: '350px', padding: '20px', backgroundColor: '#f5f5f5', borderRadius: '8px' }}>
        <h2 style={{ marginTop: 0 }}>Text Editor</h2>

        {/* Add New Text Button */}
        <button
          onClick={addNewText}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '20px',
            backgroundColor: '#4CAF50',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          + Add New Text
        </button>

        {/* Text Editing Form */}
        {selectedElement ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <h3>Edit Selected Text</h3>

            {/* Text Content */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Text:
              </label>
              <textarea
                value={editingText}
                onChange={(e) => setEditingText(e.target.value)}
                onBlur={updateSelectedText}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  minHeight: '60px',
                }}
              />
            </div>

            {/* Font Size */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Font Size: {editingFontSize}px
              </label>
              <input
                type="range"
                min="10"
                max="120"
                value={editingFontSize}
                onChange={(e) => {
                  setEditingFontSize(Number(e.target.value));
                  updateSelectedText();
                }}
                style={{ width: '100%' }}
              />
            </div>

            {/* Font Family */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Font Family:
              </label>
              <select
                value={editingFontFamily}
                onChange={(e) => {
                  setEditingFontFamily(e.target.value);
                  updateSelectedText();
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              >
                <option value="Arial">Arial</option>
                <option value="Verdana">Verdana</option>
                <option value="Georgia">Georgia</option>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Courier New">Courier New</option>
                <option value="Comic Sans MS">Comic Sans MS</option>
                <option value="Impact">Impact</option>
                <option value="Trebuchet MS">Trebuchet MS</option>
              </select>
            </div>

            {/* Font Weight */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Font Weight:
              </label>
              <select
                value={editingFontWeight}
                onChange={(e) => {
                  setEditingFontWeight(e.target.value);
                  updateSelectedText();
                }}
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                }}
              >
                <option value="normal">Normal</option>
                <option value="bold">Bold</option>
              </select>
            </div>

            {/* Text Color */}
            <div>
              <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>
                Text Color:
              </label>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <input
                  type="color"
                  value={editingFill}
                  onChange={(e) => {
                    setEditingFill(e.target.value);
                    updateSelectedText();
                  }}
                  style={{ width: '50px', height: '40px', border: 'none', cursor: 'pointer' }}
                />
                <input
                  type="text"
                  value={editingFill}
                  onChange={(e) => {
                    setEditingFill(e.target.value);
                    updateSelectedText();
                  }}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid #ccc',
                  }}
                />
              </div>
            </div>

            {/* Delete Button */}
            <button
              onClick={deleteSelectedText}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '10px',
                backgroundColor: '#f44336',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontSize: '14px',
              }}
            >
              Delete Selected Text
            </button>
          </div>
        ) : (
          <p style={{ color: '#666', fontStyle: 'italic' }}>
            Click on a text element to edit it
          </p>
        )}

        {/* Export Button */}
        <button
          onClick={exportImage}
          style={{
            width: '100%',
            padding: '12px',
            marginTop: '30px',
            backgroundColor: '#2196F3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
          }}
        >
          📥 Export Image
        </button>

        {/* Text List */}
        <div style={{ marginTop: '20px' }}>
          <h3>Text Elements ({textElements.length})</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {textElements.map((el) => (
              <div
                key={el.id}
                onClick={() => setSelectedId(el.id)}
                style={{
                  padding: '10px',
                  backgroundColor: el.id === selectedId ? '#e3f2fd' : 'white',
                  border: el.id === selectedId ? '2px solid #2196F3' : '1px solid #ddd',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '14px',
                }}
              >
                <strong>{el.text.substring(0, 30)}</strong>
                {el.text.length > 30 && '...'}
                <br />
                <small style={{ color: '#666' }}>
                  {el.fontSize}px • {el.fontFamily}
                </small>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

TextImageEditor.propTypes = {
  initialImageUrl: PropTypes.string.isRequired,
  initialTextElements: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      text: PropTypes.string.isRequired,
      x: PropTypes.number.isRequired,
      y: PropTypes.number.isRequired,
      fontSize: PropTypes.number.isRequired,
      fontFamily: PropTypes.string.isRequired,
      fontWeight: PropTypes.string.isRequired,
      fill: PropTypes.string.isRequired,
      textShadowColor: PropTypes.string,
      textShadowBlur: PropTypes.number,
      textShadowOffsetX: PropTypes.number,
      textShadowOffsetY: PropTypes.number,
    })
  ),
};

const KonvImageEditor = () => {
  const imageUrl =
    'https://apekani.diamonds/cdn/shop/files/IMG_1560.webp?v=1750239193&width=750';

  const initialTexts = [
    {
      id: 'text_1',
      text: 'Instagram:',
      x: 900,
      y: 100,
      fontSize: 60,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.9)',
      textShadowBlur: 10,
      textShadowOffsetX: 4,
      textShadowOffsetY: 4,
    },
    {
      id: 'text_2',
      text: 'Heart of the Brand',
      x: 900,
      y: 180,
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      fill: '#FFFFFF',
      textShadowColor: 'rgba(0,0,0,0.9)',
      textShadowBlur: 10,
      textShadowOffsetX: 4,
      textShadowOffsetY: 4,
    },
    {
      id: 'text_3',
      text: 'Storytelling. Style. Community.',
      x: 900,
      y: 280,
      fontSize: 32,
      fontFamily: 'Arial',
      fontWeight: 'normal',
      fill: '#fd12d2',
      textShadowColor: 'rgba(0,0,0,0.8)',
      textShadowBlur: 8,
      textShadowOffsetX: 3,
      textShadowOffsetY: 3,
    },
  ];

  return (
    <div style={{ fontFamily: 'Arial, sans-serif' }}>
      <h1 style={{ padding: '20px', margin: 0, backgroundColor: '#333', color: 'white' }}>
        Image Text Editor
      </h1>
      <TextImageEditor initialImageUrl={imageUrl} initialTextElements={initialTexts} />
    </div>
  );
};

export default KonvImageEditor;
