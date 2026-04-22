/** Luminance threshold below which debanding is applied. */
const DARK_LUMA_THRESHOLD = 96;

/** Maximum dithering delta applied to dark pixels. */
const MAX_DITHER_DELTA = 4;

/** Clamp a value to the valid byte range [0, 255]. */
function clampToByte(value: number) {
  return Math.max(0, Math.min(255, value));
}

/** Compute perceived luminance from RGB values using BT.709 coefficients. */
function getLuma(red: number, green: number, blue: number) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

/**
 * Generate a deterministic noise value for a given pixel coordinate.
 *
 * Uses integer hash multiplication for fast, repeatable pseudo-random output
 * in the range [0, 1].
 */
function getDeterministicNoise(x: number, y: number) {
  let seed = Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
  seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
  return ((seed ^ (seed >>> 16)) >>> 0) / 0xffffffff;
}

/**
 * Apply debanding dithering to dark regions of an image in-place.
 *
 * Adds deterministic noise to pixels below a luminance threshold to reduce
 * visible color banding artifacts in exported images. Skips fully transparent
 * pixels and bright pixels above the threshold.
 */
export function applyExportDeband(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const alpha = pixels[index + 3];

      if (alpha === 0) {
        continue;
      }

      const red = pixels[index];
      const green = pixels[index + 1];
      const blue = pixels[index + 2];
      const luma = getLuma(red, green, blue);

      if (luma >= DARK_LUMA_THRESHOLD) {
        continue;
      }

      const strength = ((DARK_LUMA_THRESHOLD - luma) / DARK_LUMA_THRESHOLD) * MAX_DITHER_DELTA;
      const centeredNoise = (getDeterministicNoise(x, y) - 0.5) * 2;
      const delta = Math.round(centeredNoise * strength);

      pixels[index] = clampToByte(red + delta);
      pixels[index + 1] = clampToByte(green + delta);
      pixels[index + 2] = clampToByte(blue + delta);
    }
  }
}
