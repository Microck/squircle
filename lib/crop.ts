/** Minimum zoom level for crop functionality. */
export const CROP_ZOOM_MIN = 1;
/** Maximum zoom level for crop functionality. */
export const CROP_ZOOM_MAX = 3;

/**
 * Represents the current crop state with zoom and pan values.
 * @property zoom - Zoom level between CROP_ZOOM_MIN and CROP_ZOOM_MAX
 * @property panX - Horizontal pan offset (-1 to 1)
 * @property panY - Vertical pan offset (-1 to 1)
 */
export type CropState = {
  zoom: number;
  panX: number;
  panY: number;
};

/**
 * Represents the source rectangle for extracting cropped image data.
 * @property sx - Source x coordinate (left edge)
 * @property sy - Source y coordinate (top edge)
 * @property sw - Source width
 * @property sh - Source height
 */
export type CropSourceRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

/** Default crop state with no zoom and centered position. */
export const DEFAULT_CROP_STATE = {
  zoom: CROP_ZOOM_MIN,
  panX: 0,
  panY: 0,
} satisfies CropState;

function clampPan(value: number) {
  return Math.max(-1, Math.min(1, value));
}

/**
 * Clamps a crop state to valid bounds.
 * Resets pan to 0 if zoom is at minimum.
 * @param crop - The crop state to validate
 * @returns A clamped crop state within valid bounds
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
 * Calculates the source rectangle for extracting cropped image data.
 * Accounts for zoom and pan to determine the visible region.
 * @param width - Original image width
 * @param height - Original image height
 * @param crop - Current crop state with zoom and pan
 * @returns The source rectangle for the cropped region
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
 * Updates the crop state after a drag operation.
 * Converts pixel delta into normalized pan coordinate changes.
 * @param crop - Current crop state
 * @param renderedWidth - Width of the rendered/cropped image
 * @param renderedHeight - Height of the rendered/cropped image
 * @param deltaX - Horizontal pixel delta from drag
 * @param deltaY - Vertical pixel delta from drag
 * @returns Updated crop state after the drag
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
