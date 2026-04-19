// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import {
  composeGifFrames,
  decodeGifArrayBuffer,
  encodeGifFrames,
  MAX_GIF_DIMENSION,
} from "@/lib/gif";
import { decompressFrames, parseGIF } from "gifuct-js";

const TINY_ANIMATED_GIF_BASE64 =
  "R0lGODlhAgACAPAAAP8AAAAAACH5BAAAAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAAgACAAACAoRRACH5BAAFAAAALAAAAAACAAIAgAAA/wAAAAIChFEAOw==";

function base64ToArrayBuffer(base64: string) {
  const buffer = Buffer.from(base64, "base64");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function setGifDimensions(arrayBuffer: ArrayBuffer, width: number, height: number) {
  const bytes = new Uint8Array(arrayBuffer.slice(0));
  const view = new DataView(bytes.buffer);
  view.setUint16(6, width, true);
  view.setUint16(8, height, true);
  return bytes.buffer;
}

describe("gif helpers", () => {
  test("decodes animated gif frames with the original size and delays intact", () => {
    const decodedGif = decodeGifArrayBuffer(base64ToArrayBuffer(TINY_ANIMATED_GIF_BASE64));

    expect(decodedGif.width).toBe(2);
    expect(decodedGif.height).toBe(2);
    expect(decodedGif.frames).toHaveLength(2);
    expect(decodedGif.frames.map((frame) => frame.delay)).toEqual([100, 50]);
  });

  test("composes transparent patches and disposal-clear behavior correctly", () => {
    const composedFrames = composeGifFrames(2, 1, [
      {
        delay: 100,
        disposalType: 0,
        dims: { left: 0, top: 0, width: 2, height: 1 },
        patch: new Uint8ClampedArray([
          255, 0, 0, 255,
          255, 0, 0, 255,
        ]),
      },
      {
        delay: 100,
        disposalType: 2,
        dims: { left: 0, top: 0, width: 2, height: 1 },
        patch: new Uint8ClampedArray([
          0, 0, 0, 0,
          0, 0, 255, 255,
        ]),
      },
      {
        delay: 100,
        disposalType: 0,
        dims: { left: 0, top: 0, width: 1, height: 1 },
        patch: new Uint8ClampedArray([
          0, 255, 0, 255,
        ]),
      },
    ]);

    expect([...composedFrames[1].pixels]).toEqual([
      255, 0, 0, 255,
      0, 0, 255, 255,
    ]);

    expect([...composedFrames[2].pixels]).toEqual([
      0, 255, 0, 255,
      0, 0, 0, 0,
    ]);
  });

  test("clips malformed gif patches to the logical screen bounds", () => {
    const composedFrames = composeGifFrames(2, 1, [
      {
        delay: 100,
        disposalType: 0,
        dims: { left: 1, top: 0, width: 2, height: 2 },
        patch: new Uint8ClampedArray([
          0, 0, 255, 255,
          255, 0, 0, 255,
          0, 255, 0, 255,
          255, 255, 255, 255,
        ]),
      },
    ]);

    expect([...composedFrames[0].pixels]).toEqual([
      0, 0, 0, 0,
      0, 0, 255, 255,
    ]);
  });

  test("rejects gifs whose logical size exceeds the supported limit", () => {
    const oversizedGif = setGifDimensions(
      base64ToArrayBuffer(TINY_ANIMATED_GIF_BASE64),
      MAX_GIF_DIMENSION + 1,
      2,
    );

    expect(() => decodeGifArrayBuffer(oversizedGif)).toThrow(
      `GIF dimensions must stay within ${MAX_GIF_DIMENSION}x${MAX_GIF_DIMENSION}.`,
    );
  });

  test("encodes gif frames that round-trip through the decoder", async () => {
    const encodedGif = encodeGifFrames(2, 2, [
      {
        delay: 90,
        imageData: {
          data: new Uint8ClampedArray([
            255, 0, 0, 255,
            255, 0, 0, 255,
            255, 0, 0, 255,
            255, 0, 0, 255,
          ]),
          width: 2,
          height: 2,
        },
      },
      {
        delay: 60,
        imageData: {
          data: new Uint8ClampedArray([
            0, 0, 255, 255,
            0, 0, 255, 255,
            0, 0, 255, 255,
            0, 0, 255, 255,
          ]),
          width: 2,
          height: 2,
        },
      },
    ]);

    const arrayBuffer = await encodedGif.arrayBuffer();
    const parsedGif = parseGIF(arrayBuffer);
    const decodedFrames = decompressFrames(parsedGif, true);

    expect(parsedGif.lsd.width).toBe(2);
    expect(parsedGif.lsd.height).toBe(2);
    expect(decodedFrames).toHaveLength(2);
    expect(decodedFrames.map((frame) => frame.delay)).toEqual([90, 60]);
  });
});
