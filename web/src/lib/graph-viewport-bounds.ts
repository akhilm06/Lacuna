export type ViewportBounds = {
  xLo: number;
  xHi: number;
  yLo: number;
  yHi: number;
};

export type ScreenToGraph = (screenX: number, screenY: number) => {
  x: number;
  y: number;
};

export function getViewportGraphBounds(
  screen2GraphCoords: ScreenToGraph,
  width: number,
  height: number,
  padPx: number,
  nodeRadius: number,
): ViewportBounds | null {
  if (width <= 0 || height <= 0) return null;
  const w = width;
  const h = height;
  const corners = [
    screen2GraphCoords(padPx, padPx),
    screen2GraphCoords(w - padPx, padPx),
    screen2GraphCoords(padPx, h - padPx),
    screen2GraphCoords(w - padPx, h - padPx),
  ];
  const minGx = Math.min(...corners.map((c) => c.x));
  const maxGx = Math.max(...corners.map((c) => c.x));
  const minGy = Math.min(...corners.map((c) => c.y));
  const maxGy = Math.max(...corners.map((c) => c.y));

  const r = nodeRadius;
  let xLo = minGx + r;
  let xHi = maxGx - r;
  if (xLo > xHi) {
    const mid = (minGx + maxGx) / 2;
    xLo = xHi = mid;
  }
  let yLo = minGy + r;
  let yHi = maxGy - r;
  if (yLo > yHi) {
    const mid = (minGy + maxGy) / 2;
    yLo = yHi = mid;
  }
  return { xLo, xHi, yLo, yHi };
}
