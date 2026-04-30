export const CROP_ZOOM_MIN = 1;
export const CROP_ZOOM_MAX = 3;

export type CropState = {
  zoom: number;
  panX: number;
  panY: number;
};

export type CropSourceRect = {
  sx: number;
  sy: number;
  sw: number;
  sh: number;
};

export const DEFAULT_CROP_STATE = {
  zoom: CROP_ZOOM_MIN,
  panX: 0,
  panY: 0,
} satisfies CropState;

function clampPan(value: number) {
  return Math.max(-1, Math.min(1, value));
}

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
