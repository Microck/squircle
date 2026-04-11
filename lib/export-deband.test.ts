import { describe, expect, test } from "vitest";
import { applyExportDeband } from "@/lib/export-deband";

describe("applyExportDeband", () => {
  test("adds subtle deterministic variation to dark opaque pixels", () => {
    const pixels = new Uint8ClampedArray([
      8, 8, 8, 255,
      12, 12, 12, 255,
      16, 16, 16, 255,
      20, 20, 20, 255,
    ]);

    const before = new Uint8ClampedArray(pixels);
    applyExportDeband(pixels, 2, 2);

    expect(pixels).not.toEqual(before);

    for (let index = 0; index < pixels.length; index += 4) {
      expect(Math.abs(pixels[index] - before[index])).toBeLessThanOrEqual(4);
      expect(pixels[index]).toBe(pixels[index + 1]);
      expect(pixels[index + 1]).toBe(pixels[index + 2]);
      expect(pixels[index + 3]).toBe(255);
    }
  });

  test("leaves bright or transparent pixels unchanged", () => {
    const pixels = new Uint8ClampedArray([
      180, 180, 180, 255,
      24, 24, 24, 0,
      140, 120, 100, 255,
      80, 80, 80, 0,
    ]);

    const before = new Uint8ClampedArray(pixels);
    applyExportDeband(pixels, 2, 2);

    expect(pixels).toEqual(before);
  });
});
