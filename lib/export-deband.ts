/**
 * Post-export debanding for 8-bit PNG output.
 *
 * 8-bit PNG gradients show visible banding on dark backgrounds after
 * squircle masking because the alpha transition quantises to a handful of
 * discrete levels.  A small amount of ordered dither masks those steps so
 * the gradient appears smooth to the eye.
 *
 * The noise is **deterministic** (seeded by pixel coordinates) so that
 * re-exporting the same image always produces identical output — important
 * for reproducible builds and caching.
 */

// Luma threshold (0–255) below which banding is perceptible on dark
// backgrounds.  Chosen empirically: banding only becomes visible in the
// deep shadow region, and 96 is where human vision starts to notice the
// quantisation steps.
const DARK_LUMA_THRESHOLD = 96;

// Maximum pixel-value delta added during dither.  Kept intentionally small
// (4 out of 255) so the noise is sub-threshold for midtones but enough to
// break up contour lines in dark regions.
const MAX_DITHER_DELTA = 4;

function getLuma(red: number, green: number, blue: number) {
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function getDeterministicNoise(x: number, rowSeed: number) {
  let seed = Math.imul(x + 1, 374761393) ^ rowSeed;
  seed = Math.imul(seed ^ (seed >>> 13), 1274126177);
  return ((seed ^ (seed >>> 16)) >>> 0) / 0xffffffff;
}

export function applyExportDeband(
  pixels: Uint8ClampedArray,
  width: number,
  height: number,
) {
  for (let y = 0; y < height; y += 1) {
    const rowSeed = Math.imul(y + 1, 668265263);
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
      const centeredNoise = (getDeterministicNoise(x, rowSeed) - 0.5) * 2;
      const delta = Math.round(centeredNoise * strength);

      // Integer values are saturated by Uint8ClampedArray itself.
      pixels[index] = red + delta;
      pixels[index + 1] = green + delta;
      pixels[index + 2] = blue + delta;
    }
  }
}
