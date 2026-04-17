import { useEffect, type RefObject } from "react";

// @ts-expect-error d3-force-3d ships without typings
import { forceCollide, forceManyBody, forceRadial } from "d3-force-3d";

import lacunaLinkForce, {
  type LacunaLinkDatum,
} from "@/components/lacuna-link-force";
import lacunaViewportBoundaryForce from "@/components/lacuna-viewport-boundary-force";
import { linkEndpointId } from "@/lib/graph-link-endpoint";
import { getViewportGraphBounds } from "@/lib/graph-viewport-bounds";
import { isGhostNodeKind, type GraphNode } from "@/lib/graph-work-types";
import {
  radialTargetsFromTuning,
  type LacunaGraphTuning,
} from "@/lib/lacuna-graph-tuning";

type LinkEndpoint = { id?: string | number; index?: number };

export type ForceGraphRef = {
  d3Force: (name: string, force?: object | null) => unknown;
  screen2GraphCoords: (x: number, y: number) => { x: number; y: number };
};

type GraphData = { nodes: object[]; links: object[] };

export function useLacunaGraphForces(
  graphRef: RefObject<ForceGraphRef | null>,
  graphData: GraphData,
  dims: { width: number; height: number },
  knownOnlyNoGhosts: boolean,
  tuning: LacunaGraphTuning,
  nodeRelSizeEffective: number,
  getBoundaryExemptIds?: () => ReadonlySet<string> | null | undefined,
) {
  useEffect(() => {
    const g = graphRef.current;
    if (!g || dims.width <= 0 || dims.height <= 0) return;

    const nodeRadius =
      Math.sqrt(Math.max(0, tuning.nodeValUniform)) * nodeRelSizeEffective;
    const linkForce = lacunaLinkForce(graphData.links as LacunaLinkDatum[]);
    linkForce.id((d) => (d as { id: string }).id);
    linkForce.distance(tuning.linkDefaultDistance);

    const linkDegree = new Map<string, number>();
    for (const l of graphData.links as Array<{ source: unknown; target: unknown }>) {
      const s = linkEndpointId(l.source);
      const t = linkEndpointId(l.target);
      linkDegree.set(s, (linkDegree.get(s) ?? 0) + 1);
      linkDegree.set(t, (linkDegree.get(t) ?? 0) + 1);
    }
    linkForce.strength((link) => {
      const s = link.source as LinkEndpoint;
      const t = link.target as LinkEndpoint;
      const sid = s.id !== undefined && s.id !== null ? String(s.id) : "";
      const tid = t.id !== undefined && t.id !== null ? String(t.id) : "";
      const cs = linkDegree.get(sid) ?? 1;
      const ct = linkDegree.get(tid) ?? 1;
      return (
        (1 / Math.max(1, Math.min(cs, ct))) * tuning.knownLinkPullScale
      );
    });

    g.d3Force("link", linkForce);
    g.d3Force("charge", forceManyBody().strength(tuning.chargeStrength));

    const collideR = nodeRadius * tuning.collideRadiusFactor;
    g.d3Force(
      "lacunaCollide",
      forceCollide(collideR)
        .strength(tuning.collideStrength)
        .iterations(tuning.collideIterations),
    );

    const { ghost: rGhost, known: rKnown } = radialTargetsFromTuning(
      graphData.nodes.length,
      dims.width,
      dims.height,
      tuning,
    );
    const ghostRadialStrength = tuning.radialGhostStrength;
    const knownRadialStrength = tuning.radialKnownStrength;
    const innerRingMotion = (d: GraphNode) =>
      isGhostNodeKind(d.nodeKind) ||
      (knownOnlyNoGhosts && d.nodeKind === "known");
    const radial = forceRadial(
      (d: object) => (innerRingMotion(d as GraphNode) ? rGhost : rKnown),
      0,
      0,
    ).strength((d: object) =>
      innerRingMotion(d as GraphNode)
        ? ghostRadialStrength
        : knownRadialStrength,
    );
    g.d3Force("lacunaRadial", radial);

    const center = g.d3Force("center") as
      | { strength?: (s: number) => unknown }
      | undefined;
    center?.strength?.(tuning.centerStrength);

    const boundary = lacunaViewportBoundaryForce(() => {
      const inst = graphRef.current;
      if (!inst || dims.width <= 0 || dims.height <= 0) return null;
      return getViewportGraphBounds(
        inst.screen2GraphCoords,
        dims.width,
        dims.height,
        tuning.viewportPadPx,
        nodeRadius,
      );
    }, {
      cushionFraction: tuning.boundaryCushionFraction,
      kOut: tuning.boundaryKOut,
      kIn: tuning.boundaryKIn,
      scaleBase: tuning.boundaryScaleBase,
      getExemptNodeIds: getBoundaryExemptIds,
    });
    g.d3Force("lacunaViewport", boundary);

    return () => {
      g.d3Force("lacunaCollide", null);
      g.d3Force("lacunaRadial", null);
      g.d3Force("lacunaViewport", null);
    };
  }, [
    graphRef,
    graphData,
    dims.width,
    dims.height,
    knownOnlyNoGhosts,
    tuning,
    getBoundaryExemptIds,
    nodeRelSizeEffective,
  ]);
}
