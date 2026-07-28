export const EXPERIMENT_MEDIA_MAX_BYTES = 180 * 1024;
export const EXPERIMENT_MEDIA_MAX_SOURCE_BYTES = 6 * 1024 * 1024;
export const EXPERIMENT_MEDIA_MAX_DIMENSION = 1_200;
export const EXPERIMENT_MEDIA_MAX_SOURCE_PIXELS = 40_000_000;

const ALLOWED_SOURCE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export class ExperimentMediaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ExperimentMediaError";
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new ExperimentMediaError("The image could not be read."));
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.readAsDataURL(blob);
  });
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
}

async function loadImage(file: Blob): Promise<{ source: CanvasImageSource; width: number; height: number; close: () => void }> {
  if (typeof createImageBitmap === "function") {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, close: () => bitmap.close() };
  }

  const url = URL.createObjectURL(file);
  const image = new Image();
  image.decoding = "async";
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new ExperimentMediaError("The image format could not be decoded."));
    image.src = url;
  });
  return {
    source: image,
    width: image.naturalWidth,
    height: image.naturalHeight,
    close: () => URL.revokeObjectURL(url),
  };
}

export async function prepareExperimentImage(file: Blob): Promise<string> {
  if (!ALLOWED_SOURCE_TYPES.has(file.type)) {
    throw new ExperimentMediaError("Use a JPEG, PNG, or WebP image.");
  }
  if (file.size <= 0 || file.size > EXPERIMENT_MEDIA_MAX_SOURCE_BYTES) {
    throw new ExperimentMediaError("Choose an image smaller than 6 MB.");
  }

  const loaded = await loadImage(file);
  try {
    if (
      loaded.width <= 0
      || loaded.height <= 0
      || loaded.width * loaded.height > EXPERIMENT_MEDIA_MAX_SOURCE_PIXELS
    ) {
      throw new ExperimentMediaError("That image is too large to process safely.");
    }

    let scale = Math.min(1, EXPERIMENT_MEDIA_MAX_DIMENSION / Math.max(loaded.width, loaded.height));
    for (let sizeAttempt = 0; sizeAttempt < 4; sizeAttempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(loaded.width * scale));
      canvas.height = Math.max(1, Math.round(loaded.height * scale));
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new ExperimentMediaError("This browser cannot prepare the image.");
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(loaded.source, 0, 0, canvas.width, canvas.height);

      for (const quality of [0.82, 0.72, 0.62, 0.52, 0.44]) {
        const output = await canvasToBlob(canvas, quality);
        if (output && output.size <= EXPERIMENT_MEDIA_MAX_BYTES) {
          return blobToDataUrl(output);
        }
      }
      scale *= 0.78;
    }
  } finally {
    loaded.close();
  }

  throw new ExperimentMediaError("The image could not be reduced enough for the study package.");
}
