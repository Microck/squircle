// @vitest-environment jsdom

import { describe, expect, test } from "vitest";
import {
  assertSupportedImageDimensions,
  getExportHostSuffix,
  getFileErrorMessage,
  getFileStem,
  getUploadProgressValue,
  hexToRgba,
  isHexColorInputValid,
  normalizeHexColor,
  sanitizeFileName,
} from "@/lib/editor-helpers";

describe("editor helpers", () => {
  test("normalizes accepted hex colors", () => {
    expect(normalizeHexColor("#FF0000")).toBe("#ff0000");
    expect(normalizeHexColor("0F8")).toBe("#00ff88");
    expect(normalizeHexColor("not-a-color")).toBeNull();
  });

  test("keeps partial color input validation separate from commit normalization", () => {
    expect(isHexColorInputValid("")).toBe(true);
    expect(isHexColorInputValid("#fff")).toBe(true);
    expect(isHexColorInputValid("#ff")).toBe(false);
  });

  test("builds export suffixes only for useful hostnames", () => {
    expect(getExportHostSuffix("squircle.micr.dev")).toBe("_squircle-micr-dev");
    expect(getExportHostSuffix("127.0.0.1")).toBe("");
    expect(getExportHostSuffix("localhost")).toBe("_localhost");
  });

  test("converts validated hex colors to rgba", () => {
    expect(hexToRgba("#ff0000", 50)).toBe("rgba(255, 0, 0, 0.5)");
    expect(hexToRgba("transparent", 50)).toBe("transparent");
    expect(() => hexToRgba("nope", 50)).toThrow("Invalid hex color");
  });

  test("validates image dimensions with actionable errors", () => {
    expect(() => assertSupportedImageDimensions(0, 100)).toThrow("SVG files need intrinsic width and height");
    expect(() => assertSupportedImageDimensions(8193, 100)).toThrow("8192x8192");
    expect(() => assertSupportedImageDimensions(8192, 8192)).not.toThrow();
  });

  test("sanitizes UI-facing file text", () => {
    expect(getFileStem("avatar.final.png")).toBe("avatar.final");
    expect(sanitizeFileName("<bad>\u0001file.png")).toBe("badfile.png");
    expect(sanitizeFileName("a".repeat(100))).toHaveLength(64);
    expect(getFileErrorMessage(new Error("<decode failed>"))).toBe("decode failed");
  });

  test("reports upload progress with an in-flight offset", () => {
    expect(getUploadProgressValue(null)).toBe(0);
    expect(getUploadProgressValue({ total: 4, completed: 0 })).toBe(9);
    expect(getUploadProgressValue({ total: 4, completed: 4 })).toBe(100);
  });
});
