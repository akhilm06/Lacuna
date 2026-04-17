// Soft bounds: push nodes inward near viewport edges. Skips pinned nodes and optional exempt ids (e.g. drag cluster).

import type { ViewportBounds } from "@/lib/graph-viewport-bounds";

export type LacunaViewportBoundaryParams = {
  cushionFraction: number;
  kOut: number;
  kIn: number;
  scaleBase: number;
  getExemptNodeIds?: () => ReadonlySet<string> | null | undefined;
};

type SimNode = {
  x?: number;
  y?: number;
  z?: number;
  vx?: number;
  vy?: number;
  vz?: number;
  fx?: number | null;
  fy?: number | null;
};

export default function lacunaViewportBoundaryForce(
  getBounds: () => ViewportBounds | null,
  params: LacunaViewportBoundaryParams,
) {
  let nodes: SimNode[] = [];

  function force(alpha: number) {
    const b = getBounds();
    if (!b || !nodes.length) return;

    const { xLo, xHi, yLo, yHi } = b;
    const bw = Math.max(1e-6, xHi - xLo);
    const bh = Math.max(1e-6, yHi - yLo);
    const cushion = Math.min(bw, bh) * params.cushionFraction;
    const kOut = params.kOut;
    const kIn = params.kIn;
    const scale = params.scaleBase + Math.sqrt(alpha);

    const exempt = params.getExemptNodeIds?.() ?? null;

    for (const node of nodes) {
      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const id = (node as { id?: string }).id;
      const sid = id !== undefined && id !== null ? String(id) : "";

      if (sid && exempt?.has(sid)) continue;

      if (node.fx != null && node.fy != null) continue;

      let dvx = 0;
      let dvy = 0;

      if (x < xLo) {
        dvx += (xLo - x) * kOut * scale;
      } else if (x < xLo + cushion) {
        const t = (xLo + cushion - x) / cushion;
        dvx += t * t * kIn * scale;
      } else if (x > xHi) {
        dvx -= (x - xHi) * kOut * scale;
      } else if (x > xHi - cushion) {
        const t = (x - (xHi - cushion)) / cushion;
        dvx -= t * t * kIn * scale;
      }

      if (y < yLo) {
        dvy += (yLo - y) * kOut * scale;
      } else if (y < yLo + cushion) {
        const t = (yLo + cushion - y) / cushion;
        dvy += t * t * kIn * scale;
      } else if (y > yHi) {
        dvy -= (y - yHi) * kOut * scale;
      } else if (y > yHi - cushion) {
        const t = (y - (yHi - cushion)) / cushion;
        dvy -= t * t * kIn * scale;
      }

      node.vx = (node.vx ?? 0) + dvx;
      node.vy = (node.vy ?? 0) + dvy;
    }
  }

  force.initialize = (ns: object[]) => {
    nodes = ns as SimNode[];
  };

  return force;
}
