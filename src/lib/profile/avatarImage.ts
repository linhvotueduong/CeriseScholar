export const AVATAR_EDGE_PX = 256;
export const AVATAR_MAX_BYTES = 100 * 1024;

const OUTPUT_QUALITIES = [0.82, 0.72, 0.62, 0.52, 0.42, 0.32];

type LoadedImage = {
  cleanup: () => void;
  height: number;
  source: CanvasImageSource;
  width: number;
};

export type PreparedAvatar = {
  blob: Blob;
  extension: "jpg" | "webp";
};

function loadHtmlImage(file: File): Promise<LoadedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => resolve({
      cleanup: () => URL.revokeObjectURL(objectUrl),
      height: image.naturalHeight,
      source: image,
      width: image.naturalWidth,
    });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be opened."));
    };
    image.src = objectUrl;
  });
}

async function loadImage(file: File): Promise<LoadedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
      return {
        cleanup: () => bitmap.close(),
        height: bitmap.height,
        source: bitmap,
        width: bitmap.width,
      };
    } catch {
      // Some browsers expose createImageBitmap but cannot decode every format
      // through it. The regular image element remains a safe local fallback.
    }
  }

  return loadHtmlImage(file);
}

function encodeCanvas(canvas: HTMLCanvasElement, type: string, quality: number) {
  return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, type, quality));
}

/**
 * Removes image metadata, center-crops to a square, and compresses the result
 * before it reaches Supabase Storage. The returned file is always 256×256 and
 * no larger than 100 KB.
 */
export async function prepareAvatarImage(file: File): Promise<PreparedAvatar> {
  const image = await loadImage(file);

  try {
    if (!image.width || !image.height) {
      throw new Error("The selected image has invalid dimensions.");
    }

    const canvas = document.createElement("canvas");
    canvas.width = AVATAR_EDGE_PX;
    canvas.height = AVATAR_EDGE_PX;
    const context = canvas.getContext("2d", { alpha: false });
    if (!context) throw new Error("This browser could not prepare the image.");

    const sourceEdge = Math.min(image.width, image.height);
    const sourceX = (image.width - sourceEdge) / 2;
    const sourceY = (image.height - sourceEdge) / 2;

    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, AVATAR_EDGE_PX, AVATAR_EDGE_PX);
    context.drawImage(
      image.source,
      sourceX,
      sourceY,
      sourceEdge,
      sourceEdge,
      0,
      0,
      AVATAR_EDGE_PX,
      AVATAR_EDGE_PX
    );

    for (const type of ["image/webp", "image/jpeg"] as const) {
      for (const quality of OUTPUT_QUALITIES) {
        const blob = await encodeCanvas(canvas, type, quality);
        if (blob && blob.type === type && blob.size <= AVATAR_MAX_BYTES) {
          return { blob, extension: type === "image/webp" ? "webp" : "jpg" };
        }
      }
    }

    throw new Error("We couldn't compress this photo below 100 KB. Try another image.");
  } finally {
    image.cleanup();
  }
}
