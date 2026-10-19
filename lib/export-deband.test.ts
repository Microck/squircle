import { createHash } from "node:crypto";
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

test.each([
  [1, 1, "2d2589527b983e34aa3508172589c3a5d3dead62754a15f2943938860eb16a70"],
  [31, 23, "bada1bff4ea6349a2397da7d772935efd1633d9437d74a5edb019e9f2685683c"],
  [64, 48, "3857005a81c67cea0c57e2477bd31e5072feff5e13d9272e87937a8923f827b3"],
] as const)("preserves baseline pixel bytes for %ix%i", (width, height, checksum) => {
  const pixels = new Uint8ClampedArray(width * height * 4);
  let seed = 42;
  for (let i = 0; i < pixels.length; i++) {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    pixels[i] = seed >>> 24;
  }
  applyExportDeband(pixels, width, height);
  expect(createHash("sha256").update(pixels).digest("hex")).toBe(checksum);
});
