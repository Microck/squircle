// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { useState } from "react";
import Color from "color";
import { ColorPicker, ColorPickerHue, ColorPickerSelection } from "@/components/ui/color-picker";

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;

afterEach(() => {
  cleanup();
});

function TestHarness() {
  const [value, setValue] = useState("#ff0000");

  return (
    <>
      <ColorPicker onChange={(color) => setValue(color.hex().toLowerCase())} value={value}>
        <ColorPickerSelection className="h-44 w-44 rounded-lg" data-testid="selection" />
        <ColorPickerHue data-testid="hue-root" />
      </ColorPicker>
      <output data-testid="color-value">{value}</output>
    </>
  );
}

describe("ColorPicker", () => {
  test("updates color when dragging in the selection area", () => {
    render(<TestHarness />);

    const selection = screen.getByTestId("selection");
    Object.defineProperty(selection, "getBoundingClientRect", {
      value: () => ({
        bottom: 176,
        height: 176,
        left: 0,
        right: 176,
        top: 0,
        width: 176,
        x: 0,
        y: 0,
      }),
    });

    fireEvent.pointerDown(selection, { clientX: 150, clientY: 20 });
    fireEvent.pointerMove(window, { clientX: 150, clientY: 20 });
    fireEvent.pointerUp(window);

    expect(screen.getByTestId("color-value").textContent).toBe(
      Color.hsv(0, (150 / 176) * 100, (1 - 20 / 176) * 100).hex().toLowerCase(),
    );
  });

  test("updates hue when dragging horizontally across the hue slider", () => {
    render(<TestHarness />);

    const hueRoot = screen.getByTestId("hue-root");
    const hueControl = hueRoot.querySelector('[data-slot="color-picker-slider-control"]');

    expect(hueControl).not.toBeNull();

    Object.defineProperty(hueControl, "getBoundingClientRect", {
      value: () => ({
        bottom: 16,
        height: 16,
        left: 0,
        right: 176,
        top: 0,
        width: 176,
        x: 0,
        y: 0,
      }),
    });

    fireEvent.pointerDown(hueControl!, { clientX: 88, clientY: 8 });
    fireEvent.pointerMove(window, { clientX: 88, clientY: 8 });
    fireEvent.pointerUp(window);

    expect(screen.getByTestId("color-value").textContent).toBe("#00ffff");
  });
});
