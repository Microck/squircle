/** Minimum zoom factor (no zoom). */
export const CROP_ZOOM_MIN = 1;

/** Maximum zoom factor (3x). */
export const CROP_ZOOM_MAX = 3;

/** Current zoom and pan state for image cropping. */
export type CropState = {
  /** Zoom level between {@link CROP_ZOOM_MIN} and {@link CROP_ZOOM_MAX}. */
  zoom: number;
  /** Horizontal pan offset, clamped to [-1, 1]. */
  panX: number;
  /** Vertical pan offset, clamped to [-1, 1]. */
  panY: number;
};

/** Source rectangle for drawing a cropped region of an image. */
export type CropSourceRect = {
  /** Source x offset in pixels. */
  sx: number;
  /** Source y offset in pixels. */
  sy: number;
  /** Source width in pixels. */
  sw: number;
  /** Source height in pixels. */
  sh: number;
};

/** Default crop state: no zoom, centered. */
export const DEFAULT_CROP_STATE = {
  zoom: CROP_ZOOM_MIN,
  panX: 0,
  panY: 0,
} satisfies CropState;

/** Clamp a pan value to the valid range [-1, 1]. */
function clampPan(value: number) {
  return Math.max(-1, Math.min(1, value));
}

/**
 * Clamp a crop state so zoom and pan stay within valid bounds.
 * When zoom is at minimum, pan is reset to 0.
 */
export function clampCropState(crop: CropState): CropState {
  const zoom = Math.max(CROP_ZOOM_MIN, Math.min(CROP_ZOOM_MAX, crop.zoom));

  if (zoom <= CROP_ZOOM_MIN) {
    return {
      zoom: CROP_ZOOM_MIN,
      panX: 0,
      panY: 0,
    };
  }

  return {
    zoom,
    panX: clampPan(crop.panX),
    panY: clampPan(crop.panY),
  };
}

/**
 * Compute the source rectangle for drawing a cropped image region.
 *
 * Maps the normalized pan/zoom state to pixel coordinates on the source image.
 */
export function getCropSourceRect(
  width: number,
  height: number,
  crop: CropState,
): CropSourceRect {
  const normalizedCrop = clampCropState(crop);
  const sw = width / normalizedCrop.zoom;
  const sh = height / normalizedCrop.zoom;
  const maxShiftX = (width - sw) / 2;
  const maxShiftY = (height - sh) / 2;
  const centerX = width / 2 + normalizedCrop.panX * maxShiftX;
  const centerY = height / 2 + normalizedCrop.panY * maxShiftY;

  return {
    sx: centerX - sw / 2,
    sy: centerY - sh / 2,
    sw,
    sh,
  };
}

/**
 * Compute the next crop state after a pointer drag gesture.
 *
 * Converts pixel deltas to normalized pan offsets, accounting for the current
 * zoom level and rendered canvas size.
 */
export function getCropStateAfterDrag(
  crop: CropState,
  renderedWidth: number,
  renderedHeight: number,
  deltaX: number,
  deltaY: number,
): CropState {
  const normalizedCrop = clampCropState(crop);

  if (
    normalizedCrop.zoom <= CROP_ZOOM_MIN ||
    renderedWidth <= 0 ||
    renderedHeight <= 0
  ) {
    return normalizedCrop;
  }

  const zoomOverflow = normalizedCrop.zoom - 1;

  return clampCropState({
    zoom: normalizedCrop.zoom,
    panX: normalizedCrop.panX - (deltaX * 2) / (renderedWidth * zoomOverflow),
    panY: normalizedCrop.panY - (deltaY * 2) / (renderedHeight * zoomOverflow),
  });
}
