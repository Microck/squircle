import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { decompressFrames, parseGIF, type ParsedFrame } from "gifuct-js";

export type GifPatchFrame = Pick<ParsedFrame, "delay" | "disposalType" | "dims" | "patch">;

export type ComposedGifFrame = {
  delay: number;
  pixels: Uint8ClampedArray;
};

export type DecodedGifFrame = {
  delay: number;
  canvas: HTMLCanvasElement;
};

export type DecodedGif = {
  width: number;
  height: number;
  frames: DecodedGifFrame[];
};

export type GifImageDataFrame = {
  delay: number;
  imageData: {
    data: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
  };
};

// Upper bound on GIF width/height in pixels.  Matches the maximum
// texture size supported by most WebGL implementations (and the hard
// limit for Canvas 2D on many mobile GPUs).  Exceeding this causes
// silent failures or crashes.
export const MAX_GIF_DIMENSION = 4096;
export const MAX_GIF_FRAME_COUNT = 300;

function assertValidGifSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error("GIF dimensions are invalid.");
  }

  if (width > MAX_GIF_DIMENSION || height > MAX_GIF_DIMENSION) {
    throw new Error(`GIF dimensions must stay within ${MAX_GIF_DIMENSION}x${MAX_GIF_DIMENSION}.`);
  }
}

function applyPatch(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  frame: GifPatchFrame,
) {
  const { left, top, width: patchWidth, height: patchHeight } = frame.dims;

  for (let y = 0; y < patchHeight; y += 1) {
    const targetY = top + y;
    if (targetY < 0 || targetY >= height) {
      continue;
    }

    for (let x = 0; x < patchWidth; x += 1) {
      const patchIndex = (y * patchWidth + x) * 4;
      const alpha = frame.patch[patchIndex + 3];

      if (alpha === 0) {
        continue;
      }

      const targetX = left + x;
      if (targetX < 0 || targetX >= width) {
        continue;
      }

      const targetIndex = (targetY * width + targetX) * 4;

      pixels[targetIndex] = frame.patch[patchIndex];
      pixels[targetIndex + 1] = frame.patch[patchIndex + 1];
      pixels[targetIndex + 2] = frame.patch[patchIndex + 2];
      pixels[targetIndex + 3] = alpha;
    }
  }
}

function clearPatchArea(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
  frame: GifPatchFrame,
) {
  const { left, top, width: patchWidth, height: patchHeight } = frame.dims;

  for (let y = 0; y < patchHeight; y += 1) {
    const targetY = top + y;
    if (targetY < 0 || targetY >= height) {
      continue;
    }

    for (let x = 0; x < patchWidth; x += 1) {
      const targetX = left + x;
      if (targetX < 0 || targetX >= width) {
        continue;
      }

      const targetIndex = (targetY * width + targetX) * 4;

      pixels[targetIndex] = 0;
      pixels[targetIndex + 1] = 0;
      pixels[targetIndex + 2] = 0;
      pixels[targetIndex + 3] = 0;
    }
  }
}

export function composeGifFrames(
  width: number,
  height: number,
  frames: GifPatchFrame[],
): ComposedGifFrame[] {
  assertValidGifSize(width, height);
  const workingPixels = new Uint8ClampedArray(width * height * 4);

  return frames.map((frame) => {
    const previousPixels = frame.disposalType === 3 ? new Uint8ClampedArray(workingPixels) : null;

    applyPatch(workingPixels, width, height, frame);

    const composedFrame = {
      // The GIF spec allows frame delays down to 0 centiseconds, but many
      // renderers (including most browsers) treat a 0 ms delay as 100 ms.
      // Clamping to 20 ms ensures the animation speed stays consistent
      // across all viewers.
      delay: Math.max(20, frame.delay),
      pixels: new Uint8ClampedArray(workingPixels),
    };

    if (frame.disposalType === 2) {
      clearPatchArea(workingPixels, width, height, frame);
    } else if (previousPixels) {
      workingPixels.set(previousPixels);
    }

    return composedFrame;
  });
}

export function decodeGifArrayBuffer(arrayBuffer: ArrayBuffer) {
  const parsedGif = parseGIF(arrayBuffer);
  assertValidGifSize(parsedGif.lsd.width, parsedGif.lsd.height);
  const patchFrames = decompressFrames(parsedGif, true);
  if (patchFrames.length > MAX_GIF_FRAME_COUNT) {
    throw new Error(`GIF animations are limited to ${MAX_GIF_FRAME_COUNT} frames.`);
  }
  const composedFrames = composeGifFrames(parsedGif.lsd.width, parsedGif.lsd.height, patchFrames);

  return {
    width: parsedGif.lsd.width,
    height: parsedGif.lsd.height,
    frames: composedFrames,
  };
}

function createCanvasFromPixels(
  width: number,
  height: number,
  pixels: Uint8ClampedArray,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("2D canvas context is required for GIF rendering");
  }

  context.putImageData(new ImageData(new Uint8ClampedArray(pixels), width, height), 0, 0);
  return canvas;
}

export async function decodeGifFile(file: File): Promise<DecodedGif> {
  const { width, height, frames } = decodeGifArrayBuffer(await file.arrayBuffer());

  return {
    width,
    height,
    frames: frames.map((frame) => ({
      delay: frame.delay,
      canvas: createCanvasFromPixels(width, height, frame.pixels),
    })),
  };
}

export function encodeGifFrames(
  width: number,
  height: number,
  frames: GifImageDataFrame[],
) {
  const encoder = GIFEncoder();

  frames.forEach((frame, index) => {
    const palette = quantize(frame.imageData.data, 256, {
      format: "rgba4444",
      oneBitAlpha: true,
    });
    const indexedPixels = applyPalette(frame.imageData.data, palette, "rgba4444");
    const transparentIndex = palette.findIndex((color) => color.length === 4 && color[3] === 0);

    encoder.writeFrame(indexedPixels, width, height, {
      palette,
      delay: Math.max(20, Math.round(frame.delay)),
      repeat: index === 0 ? 0 : -1,
      dispose: 1,
      transparent: transparentIndex !== -1,
      transparentIndex: transparentIndex === -1 ? 0 : transparentIndex,
    });
  });

  encoder.finish();

  const encodedBytes = encoder.bytes();
  const blobBytes = new Uint8Array(encodedBytes.byteLength);
  blobBytes.set(encodedBytes);

  return new Blob([blobBytes], { type: "image/gif" });
}
