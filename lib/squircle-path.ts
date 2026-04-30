type PathLike = Pick<
  CanvasRenderingContext2D,
  "beginPath" | "closePath" | "lineTo" | "moveTo"
>;

const SQUIRCLE_EXPONENT = 5;
const SQUIRCLE_SEGMENTS_PER_CORNER = 12;

function signedSuperellipseCoordinate(value: number) {
  return Math.sign(value) * Math.abs(value) ** (2 / SQUIRCLE_EXPONENT);
}

export function traceSquirclePath(
  context: PathLike,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));

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
  traceCorner(context, x + width - safeRadius, y + safeRadius, safeRadius, -Math.PI / 2, 0);
  context.lineTo(x + width, y + height - safeRadius);
  traceCorner(context, x + width - safeRadius, y + height - safeRadius, safeRadius, 0, Math.PI / 2);
  context.lineTo(x + safeRadius, y + height);
  traceCorner(context, x + safeRadius, y + height - safeRadius, safeRadius, Math.PI / 2, Math.PI);
  context.lineTo(x, y + safeRadius);
  traceCorner(context, x + safeRadius, y + safeRadius, safeRadius, Math.PI, (Math.PI * 3) / 2);
  context.closePath();
}

function traceCorner(
  context: PathLike,
  centerX: number,
  centerY: number,
  radius: number,
  startAngle: number,
  endAngle: number,
) {
  for (let index = 1; index <= SQUIRCLE_SEGMENTS_PER_CORNER; index += 1) {
    const progress = index / SQUIRCLE_SEGMENTS_PER_CORNER;
    const angle = startAngle + (endAngle - startAngle) * progress;
    const pointX = centerX + radius * signedSuperellipseCoordinate(Math.cos(angle));
    const pointY = centerY + radius * signedSuperellipseCoordinate(Math.sin(angle));
    context.lineTo(pointX, pointY);
  }
}
