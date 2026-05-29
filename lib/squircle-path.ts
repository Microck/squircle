type PathLike = Pick<
  CanvasRenderingContext2D,
  "beginPath" | "closePath" | "lineTo" | "moveTo"
>;

// Superellipse exponent for the squircle shape.  n = 5 produces a
// rounded-rect approximation that sits between a circle (n = 2) and a
// true rectangle; it closely matches the visual feel of iOS icon masks.
// Apple uses a different, proprietary formulation (continuous-corner
// Bezier splines) which is not publicly documented. This exponent is
// a widely-used open-source alternative.
const DEFAULT_SQUIRCLE_SMOOTHING = 60;

// Number of line segments per corner when tracing the squircle.
// Too few (e.g. 4) produces visible facets; too many (e.g. 48) wastes
// GPU/CPU cycles with no visible improvement.  12 was empirically
// determined to be the sweet spot where the curvature error is below
// one sub-pixel on a 1x display.
//
// Line segments are used instead of cubic Bezier curves because a
// superellipse has no exact Bezier representation. Any Bezier fit is
// itself an approximation, and evenly-spaced line segments are simpler
// to reason about and produce consistent rendering across Canvas 2D,
// SVG, and OffscreenCanvas.
const SQUIRCLE_SEGMENTS_PER_CORNER = 12;

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

function getSuperellipseExponent(smoothing: number) {
  // Keep the old exponent at the default smoothing value: 2 + 60 * 0.05 = 5.
  // Higher values square off the corner more while still easing into the edge.
  return 2 + clamp(smoothing, 0, 100) * 0.05;
}

function signedSuperellipseCoordinate(value: number, exponent: number) {
  return Math.sign(value) * Math.abs(value) ** (2 / exponent);
}

export function traceSquirclePath(
  context: PathLike,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  smoothing = DEFAULT_SQUIRCLE_SMOOTHING,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  const exponent = getSuperellipseExponent(smoothing);

  context.beginPath();

  if (safeRadius === 0) {
    context.moveTo(x, y);
    context.lineTo(x + width, y);
    context.lineTo(x + width, y + height);
    context.lineTo(x, y + height);
    context.closePath();
    return;
  }

  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  traceCorner(context, x + width - safeRadius, y + safeRadius, safeRadius, -Math.PI / 2, 0, exponent);
  context.lineTo(x + width, y + height - safeRadius);
  traceCorner(context, x + width - safeRadius, y + height - safeRadius, safeRadius, 0, Math.PI / 2, exponent);
  context.lineTo(x + safeRadius, y + height);
  traceCorner(context, x + safeRadius, y + height - safeRadius, safeRadius, Math.PI / 2, Math.PI, exponent);
  context.lineTo(x, y + safeRadius);
  traceCorner(context, x + safeRadius, y + safeRadius, safeRadius, Math.PI, (Math.PI * 3) / 2, exponent);
  context.closePath();
}

function traceCorner(
  context: PathLike,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
  exponent: number,
) {
  for (let index = 1; index <= SQUIRCLE_SEGMENTS_PER_CORNER; index += 1) {
    const progress = index / SQUIRCLE_SEGMENTS_PER_CORNER;
    const angle = startAngle + (endAngle - startAngle) * progress;
    const pointX = centerX + radius * signedSuperellipseCoordinate(Math.cos(angle), exponent);
    const pointY = centerY + radius * signedSuperellipseCoordinate(Math.sin(angle), exponent);
    context.lineTo(pointX, pointY);
  }
}
