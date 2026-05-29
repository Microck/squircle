import { describe, expect, test } from "vitest";
import { traceSquirclePath } from "@/lib/squircle-path";

function createRecorder() {
  const calls: Array<[string, ...number[]]> = [];

  return {
    calls,
    beginPath: () => calls.push(["beginPath"]),
    closePath: () => calls.push(["closePath"]),
    lineTo: (x: number, y: number) => calls.push(["lineTo", x, y]),
    moveTo: (x: number, y: number) => calls.push(["moveTo", x, y]),
  };
}

describe("traceSquirclePath", () => {
  test("falls back to a rectangle at zero radius", () => {
    const recorder = createRecorder();
    traceSquirclePath(recorder, 0, 0, 100, 50, 0);

    expect(recorder.calls).toEqual([
      ["beginPath"],
      ["moveTo", 0, 0],
      ["lineTo", 100, 0],
      ["lineTo", 100, 50],
      ["lineTo", 0, 50],
      ["closePath"],
    ]);
  });

  test("traces segmented superellipse corners instead of quadratic arcs", () => {
    const recorder = createRecorder();
    traceSquirclePath(recorder, 0, 0, 100, 100, 50);

    expect(recorder.calls[0]).toEqual(["beginPath"]);
    expect(recorder.calls[1]).toEqual(["moveTo", 50, 0]);
    expect(recorder.calls.at(-1)).toEqual(["closePath"]);
    expect(recorder.calls.filter(([method]) => method === "lineTo")).toHaveLength(52);
  });

  test("keeps default smoothing equivalent to the previous exponent", () => {
    const defaultRecorder = createRecorder();
    const explicitRecorder = createRecorder();

    traceSquirclePath(defaultRecorder, 0, 0, 100, 100, 50);
    traceSquirclePath(explicitRecorder, 0, 0, 100, 100, 50, 60);

    expect(explicitRecorder.calls).toEqual(defaultRecorder.calls);
  });

  test("changes the superellipse shoulder as smoothing changes", () => {
    const circleLikeRecorder = createRecorder();
    const squircleRecorder = createRecorder();

    traceSquirclePath(circleLikeRecorder, 0, 0, 100, 100, 50, 0);
    traceSquirclePath(squircleRecorder, 0, 0, 100, 100, 50, 100);

    const circleShoulder = circleLikeRecorder.calls.find(
      ([method, x]) => method === "lineTo" && x !== 50 && x !== 100,
    );
    const squircleShoulder = squircleRecorder.calls.find(
      ([method, x]) => method === "lineTo" && x !== 50 && x !== 100,
    );

    expect(circleShoulder?.[1]).toBeLessThan(squircleShoulder?.[1] ?? 0);
  });
});
