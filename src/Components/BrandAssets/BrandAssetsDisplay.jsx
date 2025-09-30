import React, { useEffect } from 'react';
import useBrandAssets from '../../hooks/useBrandAssets';

export default function BrandAssetsDisplay({ userId, autoLoad = true }) {
  const { assets, loading, error, getBrandAssets } = useBrandAssets();

  useEffect(() => { if (autoLoad && userId) getBrandAssets(userId); }, [autoLoad, userId]);

  const logos = assets?.logos || [];
  const icons = assets?.icons || [];
  const voices = assets?.voiceovers || assets?.voiceover || assets?.voices || [];
  const fonts = assets?.fonts || [];
  const colors = assets?.colors || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Your Brand Assets</h4>
        <button onClick={() => userId && getBrandAssets(userId)} className="text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">Refresh</button>
      </div>
      {loading && <div className="text-sm text-gray-600">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {(voices && voices.length > 0) && (
        <div>
          <h5 className="font-medium mb-2">Voiceovers</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {voices.map((v, i) => (
              <div key={i} className="p-2 border rounded-lg flex items-center gap-3">
                <audio src={typeof v === 'string' ? v : (v.url || '')} controls className="flex-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      {(logos && logos.length > 0) && (
        <div>
          <h5 className="font-medium mb-2">Logos</h5>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {logos.map((u, i) => (
              <img key={i} src={typeof u === 'string' ? u : (u.url || '')} alt={`logo-${i}`} className="w-full h-16 object-contain border rounded" />
            ))}
          </div>
        </div>
      )}

      {(icons && icons.length > 0) && (
        <div>
          <h5 className="font-medium mb-2">Icons</h5>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {icons.map((u, i) => (
              <img key={i} src={typeof u === 'string' ? u : (u.url || '')} alt={`icon-${i}`} className="w-full h-16 object-contain border rounded" />
            ))}
          </div>
        </div>
      )}

      {((fonts && fonts.length > 0) || (colors && colors.length > 0)) && (
        <div>
          <h5 className="font-medium mb-2">Styles</h5>
          {fonts && fonts.length > 0 && (
            <div className="text-sm text-gray-800">Fonts: {fonts.join(', ')}</div>
          )}
          {colors && colors.length > 0 && (
            <div className="mt-1 flex gap-2 flex-wrap">
              {colors.map((c, i) => (
                <div key={i} className="w-6 h-6 rounded border" style={{ background: c }} title={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
