const MAX_EDGE = 1440;
const TARGET_BYTES = 320 * 1024;
const MAX_INPUT_BYTES = 12 * 1024 * 1024;
const SUPPORTED = ['image/jpeg', 'image/png', 'image/webp'];

export interface PreparedCatalogImage {
  dataUrl: string;
  originalBytes: number;
  uploadedBytes: number;
}

/** Resize proportionally in the browser; never crop or enlarge an image. */
export async function prepareCatalogImage(file: File): Promise<PreparedCatalogImage> {
  if (!SUPPORTED.includes(file.type)) throw new Error('Elige una foto JPG, PNG o WebP. Convierte otros formatos antes de subirlos.');
  if (!file.size || file.size > MAX_INPUT_BYTES) throw new Error('La foto original debe pesar entre 1 byte y 12 MB.');
  let objectUrl = '';
  let canvas: HTMLCanvasElement | undefined;
  try {
    objectUrl = URL.createObjectURL(file);
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('No se pudo abrir la foto. Prueba con otra imagen JPG, PNG o WebP.'));
      image.src = objectUrl;
    });
    const width = image.naturalWidth;
    const height = image.naturalHeight;
    if (!width || !height || width * height > 40_000_000) throw new Error('La foto tiene demasiada resolución. Elige una versión de menos de 40 megapíxeles.');
    let output: Blob = file;
    if (Math.max(width, height) > MAX_EDGE || file.size > TARGET_BYTES) {
      canvas = document.createElement('canvas');
      let scale = Math.min(1, MAX_EDGE / width, MAX_EDGE / height);
      for (let attempt = 0; attempt < 9; attempt++) {
        canvas.width = Math.max(1, Math.round(width * scale));
        canvas.height = Math.max(1, Math.round(height * scale));
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Este navegador no puede preparar la foto. Prueba con otro navegador.');
        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const quality = [0.84, 0.78, 0.72][Math.min(attempt, 2)];
        output = await new Promise<Blob>((resolve, reject) => canvas!.toBlob(
          value => value ? resolve(value) : reject(new Error('No se pudo optimizar la foto.')),
          'image/webp', quality,
        ));
        // A browser without WebP encoding may return PNG; it is supported too.
        if (!SUPPORTED.includes(output.type)) throw new Error('El navegador generó un formato de foto no compatible.');
        if (output.size <= TARGET_BYTES) break;
        if (attempt >= 2) scale *= 0.8;
      }
      if (output.size > TARGET_BYTES) throw new Error('No se pudo reducir esta foto lo suficiente. Elige una imagen más sencilla.');
      if (file.size < output.size && Math.max(width, height) <= MAX_EDGE) output = file;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('No se pudo preparar la foto.'));
      reader.onerror = () => reject(new Error('No se pudo leer la foto optimizada.'));
      reader.readAsDataURL(output);
    });
    return {dataUrl, originalBytes: file.size, uploadedBytes: output.size};
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}

export function catalogImageSizeMessage(image: PreparedCatalogImage): string {
  const size = Math.ceil(image.uploadedBytes / 1024);
  const saved = Math.max(0, Math.round((1 - image.uploadedBytes / image.originalBytes) * 100));
  return `Foto preparada: ${size} KB${saved > 0 ? ` · ${saved}% menos de tamaño` : ''}.`;
}
