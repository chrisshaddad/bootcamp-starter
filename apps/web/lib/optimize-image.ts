const OPTIMIZABLE_IMAGE_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const OUTPUT_TYPE = 'image/webp';
const DEFAULT_QUALITY = 0.9;
const MIN_QUALITY = 0.72;
const MAX_ATTEMPTS = 4;

interface OptimizeImageOptions {
  maxDimension: number;
  maxBytes: number;
  quality?: number;
}

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Unable to decode image'));
    };
    image.src = objectUrl;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, OUTPUT_TYPE, quality);
  });
}

function optimizedFilename(filename: string) {
  const basename = filename.replace(/\.[^.]+$/, '') || 'image';
  return `${basename}.webp`;
}

/**
 * Shrinks static images before they enter the network request. Animated GIFs
 * and unknown formats are returned untouched, and an optimization is only
 * used when it is genuinely smaller than the source file.
 */
export async function optimizeImageForUpload(
  file: File,
  { maxDimension, maxBytes, quality = DEFAULT_QUALITY }: OptimizeImageOptions,
): Promise<File> {
  if (!OPTIMIZABLE_IMAGE_TYPES.has(file.type)) return file;

  try {
    const image = await loadImage(file);
    const largestDimension = Math.max(image.naturalWidth, image.naturalHeight);
    const initialScale = Math.min(1, maxDimension / largestDimension);
    let bestBlob: Blob | null = null;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      const scale = initialScale * 0.9 ** attempt;
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext('2d');
      if (!context) return file;

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = 'high';
      context.drawImage(image, 0, 0, width, height);

      const attemptQuality = Math.max(MIN_QUALITY, quality - attempt * 0.06);
      const blob = await canvasToBlob(canvas, attemptQuality);
      if (!blob || blob.type !== OUTPUT_TYPE) return file;

      if (blob.size < file.size && (!bestBlob || blob.size < bestBlob.size)) {
        bestBlob = blob;
      }
      if (blob.size <= maxBytes) break;
    }

    if (!bestBlob) return file;

    return new File([bestBlob], optimizedFilename(file.name), {
      type: OUTPUT_TYPE,
      lastModified: file.lastModified,
    });
  } catch {
    return file;
  }
}
