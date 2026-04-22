import { applyPalette, GIFEncoder, quantize } from "gifenc";
import { decompressFrames, parseGIF, type ParsedFrame } from "gifuct-js";

/** Subset of ParsedFrame fields needed for GIF composition. */
export type GifPatchFrame = Pick<ParsedFrame, "delay" | "disposalType" | "dims" | "patch">;

/** A fully composed frame with raw pixel data and timing. */
export type ComposedGifFrame = {
  /** Frame delay in hundredths of a second (centiseconds). */
  delay: number;
  /** Raw RGBA pixel data. */
  pixels: Uint8ClampedArray;
};

/** A decoded GIF frame rendered to an HTML canvas. */
export type DecodedGifFrame = {
  /** Frame delay in hundredths of a second (centiseconds). */
  delay: number;
  /** Canvas element containing the rendered frame. */
  canvas: HTMLCanvasElement;
};

/** Result of decoding a GIF file into individual frames. */
export type DecodedGif = {
  /** GIF width in pixels. */
  width: number;
  /** GIF height in pixels. */
  height: number;
  /** Ordered list of decoded frames. */
  frames: DecodedGifFrame[];
};

/** Frame data ready for GIF encoding, with raw ImageData. */
export type GifImageDataFrame = {
  /** Frame delay in hundredths of a second (centiseconds). */
  delay: number;
  /** ImageData containing raw pixels and dimensions. */
  imageData: {
    data: Uint8ClampedArray | Uint8Array;
    width: number;
    height: number;
  };
};

/** Maximum allowed GIF dimension in pixels. */
export const MAX_GIF_DIMENSION = 4096;

/** Maximum allowed number of frames in a GIF animation. */
export const MAX_GIF_FRAME_COUNT = 300;

/**
 * Validate that GIF dimensions are finite and within allowed limits.
 * @throws If dimensions are invalid or exceed {@link MAX_GIF_DIMENSION}.
 */
function assertValidGifSize(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width < 1 || height < 1) {
    throw new Error("GIF dimensions are invalid.");
  }

  if (width > MAX_GIF_DIMENSION || height > MAX_GIF_DIMENSION) {
    throw new Error(`GIF dimensions must stay within ${MAX_GIF_DIMENSION}x${MAX_GIF_DIMENSION}.`);
  }
}

/**
 * Apply a single patch frame onto a pixel buffer in-place.
 *
 * Copies non-transparent pixels from the frame patch into the corresponding
 * position in the destination buffer, respecting frame offset and bounds.
 */
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

/**
 * Clear the patch area of a frame from the pixel buffer in-place.
 *
 * Sets all pixels in the frame's patch region to fully transparent (0,0,0,0).
 */
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
 * Compose GIF patch frames into full pixel frames.
 *
 * Applies each frame's disposal method (none, restore-to-background, or
 * restore-to-previous) to produce a sequence of fully resolved pixel buffers.
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
 * Decode a GIF ArrayBuffer into composed frames with raw pixel data.
 *
 * Parses the binary GIF, decompresses frames, validates size and frame count
 * limits, and composes the patch frames into full pixel buffers.
 *
 * @throws If dimensions exceed {@link MAX_GIF_DIMENSION} or frame count exceeds {@link MAX_GIF_FRAME_COUNT}.
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

/**
 * Create an HTML canvas element from raw pixel data.
 *
 * @throws If 2D canvas context cannot be obtained.
 */
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
 * Decode a GIF file into an object with canvas-rendered frames.
 *
 * Reads the file as an ArrayBuffer, decodes the GIF, and creates an HTML
 * canvas element for each frame containing the rendered pixels.
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
 * Encode a sequence of image data frames into a GIF Blob.
 *
 * Quantizes each frame to a 256-color palette with RGBA4444 format, finds
 * transparent color indices, and enforces a minimum 20cs frame delay.
 * The first frame sets the GIF loop count to infinite.
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
