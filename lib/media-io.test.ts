// @vitest-environment jsdom

import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";
import { createMediaId, loadImage, canvasToBlob, downloadBlob, waitForNextPaint } from "@/lib/media-io";

describe("createMediaId", () => {
  test("returns a UUID v4 string", () => {
    const id = createMediaId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[0-9a-f]{4}-[0-9a-f]{12}$/,
    );
  });

  test("returns unique values on successive calls", () => {
    const ids = new Set(Array.from({ length: 20 }, () => createMediaId()));
    expect(ids.size).toBe(20);
  });
});

describe("loadImage", () => {
  let savedImage: typeof window.Image;

  beforeEach(() => {
    savedImage = window.Image;
  });

  afterEach(() => {
    window.Image = savedImage;
  });

  test("resolves with an HTMLImageElement on successful load", async () => {
    const FakeImage = vi.fn(function (this: HTMLImageElement) {
      Object.defineProperty(this, "onload", { value: null, writable: true, configurable: true });
      Object.defineProperty(this, "onerror", { value: null, writable: true, configurable: true });
      return this;
    });
    window.Image = FakeImage as unknown as typeof window.Image;

    const promise = loadImage("data:image/png;base64,test");

    const instance = FakeImage.mock.instances[0] as HTMLImageElement;
    const onload = (instance as Record<string, unknown>).onload as (ev: Event) => void;
    onload(new Event("load"));

    const result = await promise;
    expect(result).toBe(instance);
  });

  test("rejects when the image fails to decode", async () => {
    const FakeImage = vi.fn(function (this: HTMLImageElement) {
      Object.defineProperty(this, "onload", { value: null, writable: true });
      Object.defineProperty(this, "onerror", { value: null, writable: true });
      return this;
    });
    window.Image = FakeImage as unknown as typeof window.Image;

    const promise = loadImage("invalid://url");

    const instance = FakeImage.mock.instances[0] as HTMLImageElement;
    const onerror = (instance as Record<string, unknown>).onerror as (ev: Event) => void;
    onerror(new Event("error"));

    await expect(promise).rejects.toThrow("Couldn't decode that image.");
  });
});

describe("canvasToBlob", () => {
  test("resolves with a Blob for a valid canvas", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;

    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback: BlobCallback) => {
        callback(new Blob([], { type: "image/png" }));
      },
    );

    const blob = await canvasToBlob(canvas, "image/png");
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");

    vi.restoreAllMocks();
  });

  test("rejects when canvas.toBlob returns null", async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 10;
    canvas.height = 10;

    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
      (callback: BlobCallback) => callback(null),
    );

    await expect(canvasToBlob(canvas, "image/png")).rejects.toThrow(
      "Failed to create image/png blob",
    );

    vi.restoreAllMocks();
  });
});

describe("downloadBlob", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("creates a temporary anchor, clicks it, and revokes the URL", () => {
    const blob = new Blob(["hello"], { type: "text/plain" });
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const createSpy = vi.spyOn(URL, "createObjectURL");
    const appendSpy = vi.spyOn(document.body, "appendChild");
    const removeSpy = vi.spyOn(document.body, "removeChild");
    const clickSpy = vi.spyOn(HTMLAnchorElement.prototype, "click");

    downloadBlob(blob, "test.txt");

    expect(createSpy).toHaveBeenCalledOnce();
    expect(appendSpy).toHaveBeenCalledOnce();
    expect(clickSpy).toHaveBeenCalledOnce();
    expect(removeSpy).toHaveBeenCalledOnce();
    expect(revokeSpy).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1000);

    expect(revokeSpy).toHaveBeenCalledOnce();
  });
});

describe("waitForNextPaint", () => {
  test("resolves after requestAnimationFrame fires", async () => {
    const rafSpy = vi.spyOn(window, "requestAnimationFrame");

    let rafCallback: FrameRequestCallback;
    rafSpy.mockImplementation((cb) => {
      rafCallback = cb;
      return 42;
    });

    const promise = waitForNextPaint();

    expect(rafSpy).toHaveBeenCalledOnce();
    expect(promise).toBeInstanceOf(Promise);

    rafCallback!(0);

    await expect(promise).resolves.toBeUndefined();

    rafSpy.mockRestore();
  });
});
