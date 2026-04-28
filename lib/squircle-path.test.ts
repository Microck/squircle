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
});
