import { describe, expect, test } from "vitest";
import {
  CROP_ZOOM_MAX,
  CROP_ZOOM_MIN,
  clampCropState,
  DEFAULT_CROP_STATE,
  getCropSourceRect,
  getCropStateAfterDrag,
} from "@/lib/crop";

describe("crop helpers", () => {
  test("keeps the full source visible at the minimum zoom", () => {
    expect(getCropSourceRect(1200, 800, DEFAULT_CROP_STATE)).toEqual({
      sx: 0,
      sy: 0,
      sw: 1200,
      sh: 800,
    });
  });

  test("zooms into the center while preserving the source aspect ratio", () => {
    expect(getCropSourceRect(1200, 800, { zoom: 2, panX: 0, panY: 0 })).toEqual({
      sx: 300,
      sy: 200,
      sw: 600,
      sh: 400,
    });
  });

  test("clamps pan and zoom into the supported range", () => {
    expect(
      clampCropState({
        zoom: CROP_ZOOM_MAX + 1,
        panX: 2,
        panY: -2,
      }),
    ).toEqual({
      zoom: CROP_ZOOM_MAX,
      panX: 1,
      panY: -1,
    });

    expect(
      clampCropState({
        zoom: CROP_ZOOM_MIN - 0.2,
        panX: 1,
        panY: 1,
      }),
    ).toEqual(DEFAULT_CROP_STATE);
  });

  test("translates drag movement into clamped pan offsets", () => {
    const nextCrop = getCropStateAfterDrag(
      { zoom: 2, panX: 0, panY: 0 },
      400,
      200,
      50,
      -25,
    );

    expect(nextCrop).toEqual({
      zoom: 2,
      panX: -0.25,
      panY: 0.25,
    });
  });
});
