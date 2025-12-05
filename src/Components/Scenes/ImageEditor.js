import React from 'react';

const ImageEditor = ({ data, onClose }) => {
  if (!data || typeof data !== 'object') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-lg p-6 max-w-md w-full text-center">
          <p className="text-sm text-gray-700 mb-4">No image data available for editing.</p>
          <button
            type="button"
            className="px-4 py-2 rounded-lg bg-[#13008B] text-white text-sm"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  // Helper function to compute box percentages (matching ImageList.js logic)
  const computeBoxPercents = (bb = {}, dims = {}) => {
    const baseW = Number(dims?.width) || 1;
    const baseH = Number(dims?.height) || 1;
    const vals = [
      Math.abs(Number(bb.x) || 0),
      Math.abs(Number(bb.y) || 0),
      Math.abs(Number(bb.width) || 0),
      Math.abs(Number(bb.height) || 0)
    ];
    const maxVal = Math.max(...vals);
    const isNormalized = maxVal > 0 && maxVal <= 1.05;
    const toPctX = (v) => {
      const num = Number(v);
      if (!Number.isFinite(num)) return 0;
      return isNormalized ? num * 100 : (num / baseW) * 100;
    };
    const toPctY = (v) => {
      const num = Number(v);
      if (!Number.isFinite(num)) return 0;
      return isNormalized ? num * 100 : (num / baseH) * 100;
    };
    const leftPct = toPctX(bb.x);
    const topPct = toPctY(bb.y);
    const widthPct = Number.isFinite(bb.width) ? toPctX(bb.width) : null;
    const heightPct = Number.isFinite(bb.height) ? toPctY(bb.height) : null;
    return { leftPct, topPct, widthPct, heightPct, mode: isNormalized ? 'normalized' : 'absolute' };
  };

  const currentVersion = data.current_version || data.currentVersion || 'v1';
  const versionObj = data[currentVersion] || data.v1 || {};
  const images = Array.isArray(versionObj.images) ? versionObj.images : [];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-[#13008B]">Image Editor</h2>
        <button
          type="button"
          className="px-3 py-1.5 rounded-lg border text-sm"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {images.length === 0 && (
          <div className="text-sm text-gray-600">No images found in current version.</div>
        )}
        {images.map((img, idx) => {
          const base = img?.base_image || img?.baseImage || {};
          const imgUrl =
            base.image_url ||
            base.imageUrl ||
            img.image_url ||
            img.url ||
            '';
          const dims =
            base.image_dimensions ||
            base.imageDimensions ||
            img.image_dimensions ||
            img.imageDimensions ||
            null;
          const textElements = Array.isArray(img?.text_elements)
            ? img.text_elements
            : Array.isArray(img?.textElements)
            ? img.textElements
            : [];
          
          const overlayElements = Array.isArray(img?.overlay_elements)
            ? img.overlay_elements
            : Array.isArray(img?.overlayElements)
            ? img.overlayElements
            : [];

          return (
            <div key={idx} className="bg-white border rounded-xl p-4">
              <div
                className="w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center"
                style={{
                  aspectRatio:
                    dims?.width && dims?.height
                      ? `${dims.width} / ${dims.height}`
                      : '16 / 9'
                }}
              >
                {imgUrl ? (
                  <>
                    <img
                      src={imgUrl}
                      alt={`editable-${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                    {/* Combine text and overlay elements for rendering */}
                    {(textElements.length > 0 || overlayElements.length > 0) && (
                      <div className="absolute inset-0 pointer-events-none">
                        {/* Render text elements */}
                        {textElements.map((el, tIdx) => {
                          if (!el || typeof el !== 'object') return null;
                          const bb = el.bounding_box || {};
                          
                          // Use computeBoxPercents for proper positioning
                          const { leftPct, topPct, widthPct, heightPct, mode } = computeBoxPercents(bb, dims || {});
                          
                          // Calculate font size (handle normalized values)
                          const fontSizeBase = Number.isFinite(el.fontSize) ? Number(el.fontSize) : 16;
                          const fontSize =
                            fontSizeBase > 0 && fontSizeBase <= 2 && mode === 'normalized'
                              ? fontSizeBase * (Number(dims?.height) || 1)
                              : fontSizeBase;
                          
                          // Get all text styling properties
                          const color = el.fill || '#ffffff';
                          const fontFamily = el.fontFamily || 'sans-serif';
                          const fontWeight = el.fontWeight || 'normal';
                          const lineHeight = Number.isFinite(el.lineHeight) ? el.lineHeight : 1.2;
                          const opacity = typeof el.textOpacity === 'number' ? el.textOpacity : 1;
                          
                          // Text alignment (support multiple field names)
                          const textAlign = el.textAlign || el.align || el?.layout?.text_align || el?.layout?.alignment || 'left';
                          
                          // Additional text properties
                          const fontStyle = el.fontStyle || 'normal';
                          const textDecoration = el.textDecoration || 'none';
                          const letterSpacing = el.letterSpacing ? `${el.letterSpacing}px` : 'normal';
                          const backgroundColor = el.backgroundColor || 'transparent';
                          const padding = backgroundColor && backgroundColor !== 'transparent' ? '2px 4px' : '0';
                          const borderRadius = backgroundColor && backgroundColor !== 'transparent' ? '2px' : '0';
                          
                          // Text shadow
                          const shadow = el.effects?.textShadow;
                          const textShadow =
                            shadow && shadow.enabled
                              ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${
                                  shadow.color || 'rgba(0,0,0,0.5)'
                                }`
                              : undefined;
                          
                          // Text Glow effect
                          const textGlow = el.textGlow || 'none';
                          let glowFilter = 'none';
                          switch(textGlow) {
                            case 'subtle':
                              glowFilter = 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))';
                              break;
                            case 'medium':
                              glowFilter = 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 12px rgba(124, 58, 237, 0.6))';
                              break;
                            case 'strong':
                              glowFilter = 'drop-shadow(0 0 12px rgba(255, 255, 255, 1)) drop-shadow(0 0 16px rgba(124, 58, 237, 0.8))';
                              break;
                            case 'neon':
                              glowFilter = 'drop-shadow(0 0 10px rgba(255, 255, 255, 1)) drop-shadow(0 0 20px rgba(124, 58, 237, 1)) drop-shadow(0 0 30px rgba(124, 58, 237, 0.8))';
                              break;
                            default:
                              glowFilter = 'none';
                          }
                          
                          // Word Art styles
                          const wordArt = el.wordArt || 'none';
                          let wordArtStyles = {};
                          switch(wordArt) {
                            case 'gradient':
                              wordArtStyles.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                              wordArtStyles.WebkitBackgroundClip = 'text';
                              wordArtStyles.WebkitTextFillColor = 'transparent';
                              break;
                            case 'outline':
                              wordArtStyles.WebkitTextStroke = `2px ${color}`;
                              wordArtStyles.color = 'transparent';
                              break;
                            case '3d':
                              wordArtStyles.textShadow = '1px 1px 0 rgba(255, 255, 255, 0.5), -1px -1px 0 rgba(0, 0, 0, 0.3), 2px 2px 4px rgba(0, 0, 0, 0.5)';
                              break;
                            case 'metallic':
                              wordArtStyles.background = 'linear-gradient(180deg, #ffffff 0%, #333333 50%, #ffffff 100%)';
                              wordArtStyles.WebkitBackgroundClip = 'text';
                              wordArtStyles.WebkitTextFillColor = 'transparent';
                              break;
                            case 'gradient-rainbow':
                              wordArtStyles.background = 'linear-gradient(90deg, #ff0000 0%, #ff7f00 16.66%, #ffff00 33.33%, #00ff00 50%, #0000ff 66.66%, #4b0082 83.33%, #9400d3 100%)';
                              wordArtStyles.WebkitBackgroundClip = 'text';
                              wordArtStyles.WebkitTextFillColor = 'transparent';
                              break;
                            default:
                              wordArtStyles = {};
                          }
                          
                          // Anchor point for positioning
                          const anchor = el.layout?.anchor_point || 'top_left';
                          
                          // Box style (container for positioning)
                          const boxStyle = {
                            position: 'absolute',
                            left: `${leftPct}%`,
                            top: `${topPct}%`,
                            width: widthPct != null ? `${widthPct}%` : 'auto',
                            height: heightPct != null ? `${heightPct}%` : 'auto',
                            pointerEvents: 'none',
                            transform: anchor === 'center' ? 'translate(-50%, -50%)' : 'none'
                          };
                          
                          // Text style (inner div for text styling)
                          const textStyle = {
                            color,
                            fontFamily,
                            fontWeight,
                            fontSize: `${fontSize}px`,
                            fontStyle,
                            textDecoration,
                            textAlign: ['left', 'center', 'right', 'start', 'end', 'justify'].includes(textAlign) ? textAlign : 'left',
                            lineHeight,
                            letterSpacing,
                            opacity,
                            backgroundColor,
                            padding,
                            borderRadius,
                            textShadow,
                            filter: glowFilter !== 'none' ? glowFilter : undefined,
                            ...wordArtStyles,
                            whiteSpace: 'pre-wrap',
                            width: '100%',
                            height: '100%'
                          };
                          
                          return (
                            <div key={`text-${tIdx}`} style={boxStyle} className="pointer-events-none">
                              <div style={textStyle}>{el.text || ''}</div>
                            </div>
                          );
                        })}
                        
                        {/* Render overlay elements (charts, shapes, etc.) */}
                        {overlayElements.map((ov, oIdx) => {
                          if (!ov || typeof ov !== 'object') return null;
                          const ovBb = ov.bounding_box || {};
                          
                          // Use computeBoxPercents for proper positioning
                          const { leftPct, topPct, widthPct, heightPct } = computeBoxPercents(ovBb, dims || {});
                          
                          // Get overlay image URL - check multiple possible locations
                          let overlayUrl =
                            ov?.file_url ||
                            ov?.fileUrl ||
                            ov?.overlay_image?.image_url ||
                            ov?.overlay_image?.imageUrl ||
                            ov?.image_url ||
                            ov?.imageUrl ||
                            ov?.url ||
                            ov?.src ||
                            ov?.link ||
                            '';
                          
                          if (!overlayUrl) return null;
                          
                          // Check if this is a chart overlay
                          const isChartOverlay = ov?.element_id === 'chart_overlay' || 
                                                ov?.label_name === 'Chart' ||
                                                overlayUrl.includes('chart');
                          
                          // Add cache-busting for charts to ensure fresh images
                          if (isChartOverlay) {
                            const separator = overlayUrl.includes('?') ? '&' : '?';
                            overlayUrl = `${overlayUrl}${separator}_cb=${Date.now()}`;
                          }
                          
                          // Get opacity
                          const opacity = typeof ov.opacity === 'number' ? ov.opacity : 1;
                          
                          // Get z-index
                          const zIndex = typeof ov.layout?.zIndex === 'number' 
                            ? ov.layout.zIndex 
                            : (typeof ov.z_index === 'number' ? ov.z_index : (typeof ov.zIndex === 'number' ? ov.zIndex : (100 + oIdx + 1)));
                          
                          return (
                            <img
                              key={`overlay-${oIdx}`}
                              src={overlayUrl}
                              alt="overlay"
                              className="absolute pointer-events-none"
                              style={{
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: widthPct != null ? `${widthPct}%` : 'auto',
                                height: heightPct != null ? `${heightPct}%` : 'auto',
                                opacity,
                                zIndex,
                                objectFit: 'contain'
                              }}
                              crossOrigin={overlayUrl.startsWith('http') && !overlayUrl.includes(window.location.hostname) ? "anonymous" : undefined}
                              onError={(e) => {
                                console.error('Failed to load overlay image:', overlayUrl);
                              }}
                            />
                          );
                        })}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                    No Image
                  </div>
                )}
              </div>
              {dims?.width && dims?.height && (
                <div className="mt-2 text-xs text-gray-500">
                  Size: {dims.width} x {dims.height} (version {currentVersion})
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ImageEditor;
