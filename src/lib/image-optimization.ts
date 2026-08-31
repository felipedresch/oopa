const MAX_IMAGE_DIMENSION = 2400;
const JPEG_QUALITY = 0.9;
const WEBP_QUALITY = 0.9;

const OPTIMIZABLE_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

type DecodedImage = {
  source: CanvasImageSource;
  width: number;
  height: number;
  close?: () => void;
};

function getOutputFileName(fileName: string, contentType: string): string {
  const extension = contentType === "image/jpeg" ? "jpg" : contentType.split("/")[1];
  const baseName = fileName.replace(/\.[^/.]+$/, "") || "imagem";
  return `${baseName}.${extension}`;
}

function decodeWithImageElement(file: File): Promise<DecodedImage> {
  if (
    typeof Image === "undefined" ||
    typeof URL === "undefined" ||
    typeof URL.createObjectURL !== "function"
  ) {
    throw new Error("Este navegador não suporta otimização de imagens.");
  }

  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve({ source: image, width: image.naturalWidth, height: image.naturalHeight });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Não foi possível ler a imagem selecionada."));
    };
    image.decoding = "async";
    image.src = objectUrl;
  });
}

async function decodeImage(file: File): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return {
      source: bitmap,
      width: bitmap.width,
      height: bitmap.height,
      close: () => bitmap.close(),
    };
  }

  return await decodeWithImageElement(file);
}

function canvasToBlob(canvas: HTMLCanvasElement, contentType: string, quality?: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
          return;
        }
        reject(new Error("Não foi possível otimizar a imagem selecionada."));
      },
      contentType,
      quality,
    );
  });
}

function createOptimizedFile(file: File, blob: Blob): File {
  return new File([blob], getOutputFileName(file.name, blob.type), {
    type: blob.type,
    lastModified: file.lastModified,
  });
}

/**
 * Reduz dimensões e recomprime imagens antes do envio ao Convex Storage.
 * Mantém PDFs/XMLs e imagens que já são menores que o resultado otimizado.
 */
export async function optimizeImageForUpload(file: File): Promise<File> {
  if (!OPTIMIZABLE_IMAGE_TYPES.has(file.type)) {
    return file;
  }

  const decoded = await decodeImage(file);
  try {
    if (!decoded.width || !decoded.height) {
      throw new Error("Não foi possível identificar as dimensões da imagem.");
    }

    const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(decoded.width, decoded.height));
    const width = Math.max(1, Math.round(decoded.width * scale));
    const height = Math.max(1, Math.round(decoded.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("Este navegador não suporta otimização de imagens.");
    }

    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(decoded.source, 0, 0, width, height);

    const quality = file.type === "image/png" ? undefined : file.type === "image/webp" ? WEBP_QUALITY : JPEG_QUALITY;
    let optimized = createOptimizedFile(file, await canvasToBlob(canvas, file.type, quality));

    // PNGs com pouca informação podem ficar maiores ao passar pelo canvas.
    // Nesse caso, tenta WebP antes de conservar o arquivo já eficiente.
    if (file.type === "image/png" && optimized.size >= file.size) {
      const webp = createOptimizedFile(file, await canvasToBlob(canvas, "image/webp", WEBP_QUALITY));
      if (webp.size < optimized.size) {
        optimized = webp;
      }
    }

    const wasResized = width !== decoded.width || height !== decoded.height;
    return wasResized || optimized.size < file.size ? optimized : file;
  } finally {
    decoded.close?.();
  }
}
