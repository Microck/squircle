// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BackgroundLayer } from "./background-layer";

vi.mock("next/dynamic", () => ({ default: () => () => <div data-testid="pixel-snow" /> }));
const original = Object.getOwnPropertyDescriptor(window, "matchMedia");
afterEach(() => {
  cleanup();
  if (original) Object.defineProperty(window, "matchMedia", original);
  else Reflect.deleteProperty(window, "matchMedia");
});
test("decorative WebGL respects initial and changed reduced-motion preference", () => {
  const query = Object.assign(new EventTarget(), { matches: true });
  Object.defineProperty(window, "matchMedia", { configurable: true, value: () => query });
  render(<BackgroundLayer />);
  expect(screen.queryByTestId("pixel-snow")).toBeNull();
  act(() => { query.matches = false; query.dispatchEvent(new Event("change")); });
  expect(screen.getByTestId("pixel-snow")).toBeTruthy();
  act(() => { query.matches = true; query.dispatchEvent(new Event("change")); });
  expect(screen.queryByTestId("pixel-snow")).toBeNull();
});
