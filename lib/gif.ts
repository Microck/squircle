import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { decompressFrames, parseGIF, type ParsedFrame } from "gifuct-js";

/**
 * A subset of a parsed GIF frame containing patch data.
 * @property delay - Frame delay in centiseconds
 * @property disposalType - How the frame should be disposed after display
 * @property dims - Dimensions and position of the frame patch
 * @property patch - Raw pixel data for the patch area
 */
export type GifPatchFrame = Pick<ParsedFrame, "delay" | "disposalType" | "dims" | "patch">;

/**
 * A composed GIF frame with pixels ready for rendering.
 * @property delay - Frame delay in centiseconds
 * @property pixels - Full frame pixel data (RGBA)
 */
export type ComposedGifFrame = {
  delay: number;
  pixels: Uint8ClampedArray;
};

/**
 * A decoded GIF frame with a canvas for rendering.
 * @property delay - Frame delay in centiseconds
 * @property canvas - Canvas element with the frame rendered
 */
export type DecodedGifFrame = {
  delay: number;
  canvas: HTMLCanvasElement;
};

/**
 * A fully decoded GIF with all frames ready.
 * @property width - GIF width in pixels
 * @property height - GIF height in pixels
 * @property frames - Array of decoded frames
 */
export type DecodedGif = {
  width: number;
  height: number;
  frames: DecodedGifFrame[];
};

/**
 * Frame data in ImageData format for encoding.
 * @property delay - Frame delay in centiseconds
 * @property imageData - ImageData object with pixel data
 */
export type GifImageDataFrame = {
  delay: number;
  imageData: {
    data: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
  };
};

/** Maximum allowed dimension for GIF output (4096x4096). */
export const MAX_GIF_DIMENSION = 4096;
/** Maximum allowed frame count for GIF output. */
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

/**
 * Composes raw GIF patch frames into full frame pixels.
 * Handles disposal types to properly accumulate or clear frame data.
 * @param width - Frame width in pixels
 * @param height - Frame height in pixels
 * @param frames - Array of patch frames to compose
 * @returns Array of composed frames with full pixel data
 */
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
      delay: frame.delay,
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

/**
 * Decodes a GIF from an ArrayBuffer.
 * Parses the GIF structure and composes all frames.
 * @param arrayBuffer - Raw GIF file data
 * @returns Decoded GIF with dimensions and composed frames
 * @throws Error if GIF dimensions exceed MAX_GIF_DIMENSION or frame count exceeds MAX_GIF_FRAME_COUNT
 */
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

/**
 * Decodes a GIF file and returns frames as canvas elements.
 * Useful for preview and rendering the GIF in the browser.
 * @param file - The GIF file to decode
 * @returns Promise resolving to decoded GIF with canvas frames
 */
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

/**
 * Encodes frames into a GIF blob for export.
 * Quantizes colors and applies palette for GIF format.
 * @param width - Frame width in pixels
 * @param height - Frame height in pixels
 * @param frames - Array of frames with ImageData to encode
 * @returns Blob containing the encoded GIF file
 */
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
