import React from 'react';

/**
 * PixoComponent
 * A thin React wrapper around Pixo Editor Bridge that opens a full-featured image editor.
 * It enables: add/edit text, font/color changes, shapes, draw, crop/resize, filters and more.
 *
 * Props:
 * - src: string – image URL/base64 to edit
 * - onSave: function(dataUrl: string, blob?: Blob) – called when user saves
 * - onClose: function() – called when editor is closed without saving
 * - readOnly: boolean – if true, disables editing tools
 */
const PixoComponent = ({ src, onSave, onClose, readOnly = false, children }) => {
  const bridgeRef = React.useRef(null);

  // Lazily initialize a single Bridge instance
  React.useEffect(() => {
    // Guard if script not loaded yet
    const Pixo = window && window.Pixo;
    if (!Pixo || bridgeRef.current) return;
    bridgeRef.current = new Pixo.Bridge({
      // Use modal editor so it floats on top of the app
      type: 'modal',
      apikey: '1e57sl64ydhc',
      // Save callback returns an <img> element with the result
      onSave: (img) => {
        try {
          // Many integrations expect a data URL. Expose Blob as a second arg if the consumer wants it.
          const dataUrl = img.toDataURL();
          if (typeof onSave === 'function') onSave(dataUrl, img);
        } catch (_) {
          // no-op
        }
      },
      onClose: () => {
        if (typeof onClose === 'function') onClose();
      },
    });
  }, [onSave, onClose]);

  const openEditor = React.useCallback(() => {
    const Pixo = window && window.Pixo;
    if (!Pixo || !bridgeRef.current) return;
    const tools = readOnly
      ? []
      : [
          'text',
          'shapes',
          'draw',
          'crop',
          'resize',
          'filters',
          'adjust',
          'stickers',
          'frames',
          'annotate',
          'background',
        ];

    // Build a comprehensive config; see https://pixoeditor.com/documentation/editor-api/
    const config = {
      ui: {
        // Keep editor consistent with brand
        theme: {
          primary: '#13008B',
          text: '#111827',
        },
        toolbar: { compact: false },
        // Open Text tool by default to let users drag/drop and edit text right away
        defaultTool: 'text',
      },
      tools: readOnly ? undefined : { replace: true, items: tools },
      // Make sure text/fonts are available and configurable
      assets: readOnly
        ? undefined
        : {
            fonts: [
              'Inter',
              'Poppins',
              'Roboto',
              'Open Sans',
              'Montserrat',
              'Nunito',
              'Lato',
              'Source Sans Pro',
              'Playfair Display',
              'Merriweather',
            ],
          },
      // Sensible defaults when adding text
      defaults: readOnly
        ? undefined
        : {
            text: {
              fontFamily: 'Inter',
              fontSize: 48,
              fontWeight: 700,
              fill: '#111827',
              strokeWidth: 0,
            },
            shape: { fill: '#FFFFFF', stroke: '#111827', strokeWidth: 2, opacity: 1 },
          },
    };

    // Open the editor with the provided source and configuration
    try { bridgeRef.current.edit(src, config); } catch (_) {}
  }, [src, readOnly]);

  return (
    <button type="button" onClick={openEditor} className="px-3 py-2 rounded-md bg-[#13008B] text-white hover:bg-[#0f0068]">
      {children || 'Edit Image'}
    </button>
  );
};

export default PixoComponent;

// Backwards-compatible minimal image wrapper if someone still imports PixoImage
export const PixoImage = ({ src, onChange }) => {
  const compRef = React.useRef(null);
  return (
    <>
      <PixoComponent src={src} onSave={onChange} />
      <img ref={compRef} src={src} alt="editable" onClick={(e) => e.currentTarget.previousSibling?.click()} style={{ cursor: 'pointer', maxWidth: '100%' }} />
    </>
  );
};
