// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import { composeGifFrames, decodeGifArrayBuffer, encodeGifFrames } from "@/lib/gif";
import { decompressFrames, parseGIF } from "gifuct-js";

const TINY_ANIMATED_GIF_BASE64 =
  "R0lGODlhAgACAPAAAP8AAAAAACH5BAAAAAAAIf8LTkVUU0NBUEUyLjADAQAAACwAAAAAAgACAAACAoRRACH5BAAFAAAALAAAAAACAAIAgAAA/wAAAAIChFEAOw==";

function base64ToArrayBuffer(base64: string) {
  const buffer = Buffer.from(base64, "base64");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
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
