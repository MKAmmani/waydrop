import { Platform } from 'react-native';

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.75;

const loadImage = (uri: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not read that photo.'));
    img.src = uri;
  });

export async function preparePhotoForUpload(uri: string): Promise<string> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return uri;
  }

  try {
    const img = await loadImage(uri);
    const longestSide = Math.max(img.naturalWidth, img.naturalHeight);
    const scale = Math.min(1, MAX_DIMENSION / longestSide);

    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(img.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));

    const context = canvas.getContext('2d');
    if (!context) {
      return uri;
    }

    context.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', JPEG_QUALITY);
  } catch {
    return uri;
  }
}
