const overlayCache = new Map();

const loadImage = (src) => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(err);
    img.src = src;
  });
};

const removeSolidBackgroundFromImageData = (ctx, width, height, threshold = 245) => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const alpha = data[i + 3];

    const isBright = r >= threshold && g >= threshold && b >= threshold;
    if (isBright) {
      data[i + 3] = 0;
    } else if (alpha < 255 && alpha > 0) {
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);
};

export const removeSolidBackground = async (src, options = {}) => {
  if (!src || typeof src !== 'string') return src || '';

  if (overlayCache.has(src)) {
    return overlayCache.get(src);
  }

  const { threshold = 245 } = options;

  try {
    const img = await loadImage(src);
    const canvas = document.createElement('canvas');
    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;

    if (!canvas.width || !canvas.height) {
      overlayCache.set(src, src);
      return src;
    }

    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    try {
      removeSolidBackgroundFromImageData(ctx, canvas.width, canvas.height, threshold);
      const dataUrl = canvas.toDataURL('image/png');
      overlayCache.set(src, dataUrl);
      return dataUrl;
    } catch (processingError) {
      console.error('Failed to process overlay background:', processingError);
      overlayCache.set(src, src);
      return src;
    }
  } catch (error) {
    console.warn('Failed to load overlay for background removal:', error);
    overlayCache.set(src, src);
    return src;
  }
};

