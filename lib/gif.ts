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

function applyPatch(
  pixels: Uint8ClampedArray,
  width: number,
  frame: GifPatchFrame,
) {
  const { left, top, width: patchWidth, height: patchHeight } = frame.dims;

  for (let y = 0; y < patchHeight; y += 1) {
    for (let x = 0; x < patchWidth; x += 1) {
      const patchIndex = (y * patchWidth + x) * 4;
      const alpha = frame.patch[patchIndex + 3];

      if (alpha === 0) {
        continue;
      }

      const targetIndex = ((top + y) * width + (left + x)) * 4;

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
  frame: GifPatchFrame,
) {
  const { left, top, width: patchWidth, height: patchHeight } = frame.dims;

  for (let y = 0; y < patchHeight; y += 1) {
    for (let x = 0; x < patchWidth; x += 1) {
      const targetIndex = ((top + y) * width + (left + x)) * 4;

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
  const workingPixels = new Uint8ClampedArray(width * height * 4);

  return frames.map((frame) => {
    const previousPixels = frame.disposalType === 3 ? new Uint8ClampedArray(workingPixels) : null;

    applyPatch(workingPixels, width, frame);

    const composedFrame = {
      delay: frame.delay,
      pixels: new Uint8ClampedArray(workingPixels),
    };

    if (frame.disposalType === 2) {
      clearPatchArea(workingPixels, width, frame);
    } else if (previousPixels) {
      workingPixels.set(previousPixels);
    }

    return composedFrame;
  });
}

export function decodeGifArrayBuffer(arrayBuffer: ArrayBuffer) {
  const parsedGif = parseGIF(arrayBuffer);
  const patchFrames = decompressFrames(parsedGif, true);
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
