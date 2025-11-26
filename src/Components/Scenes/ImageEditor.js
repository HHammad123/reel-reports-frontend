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
                    {textElements.length > 0 && (
                      <div className="absolute inset-0 pointer-events-none">
                        {textElements.map((el, tIdx) => {
                          if (!el || typeof el !== 'object') return null;
                          const bb = el.bounding_box || {};
                          const x = typeof bb.x === 'number' ? bb.x : 0;
                          const y = typeof bb.y === 'number' ? bb.y : 0;
                          const width = typeof bb.width === 'number' ? bb.width : 0;
                          const height = typeof bb.height === 'number' ? bb.height : 0;
                          const fontSize = Number.isFinite(el.fontSize) ? el.fontSize : 16;
                          const color = el.fill || '#ffffff';
                          const fontFamily = el.fontFamily || 'sans-serif';
                          const fontWeight = el.fontWeight || 'normal';
                          const lineHeight = el.lineHeight || 1.2;
                          const opacity = typeof el.textOpacity === 'number' ? el.textOpacity : 1;
                          const shadow = el.effects?.textShadow;
                          const textShadow =
                            shadow && shadow.enabled
                              ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${
                                  shadow.color || 'rgba(0,0,0,0.5)'
                                }`
                              : undefined;
                          const anchor = el.layout?.anchor_point || 'top_left';
                          const style = {
                            position: 'absolute',
                            left: `${x * 100}%`,
                            top: `${y * 100}%`,
                            width: width ? `${width * 100}%` : 'auto',
                            height: height ? `${height * 100}%` : 'auto',
                            transform: anchor === 'center' ? 'translate(-50%, -50%)' : 'none',
                            color,
                            fontFamily,
                            fontWeight,
                            fontSize,
                            lineHeight,
                            opacity,
                            textShadow,
                            whiteSpace: 'pre-wrap'
                          };
                          return (
                            <div key={tIdx} style={style}>
                              {el.text || ''}
                            </div>
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
