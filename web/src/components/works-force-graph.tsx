"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  graphAuthorKey,
  type GraphAuthorHighlight,
} from "@/components/graph-author-highlight";
import { useLacunaGraphTuningOptional } from "@/components/lacuna-graph-tuning-provider";
import { useLacunaGraphForces } from "@/hooks/use-lacuna-graph-forces";
import { useWorkGraphData } from "@/hooks/use-work-graph-data";
import type { LacunaAiFlowState } from "@/lib/lacuna-ai-flow-model";
import { linkEndpointId } from "@/lib/graph-link-endpoint";
import {
  formatGraphNodeCaption,
  graphNodeAuthorFilterKey,
  isGhostNodeKind,
  type GraphNode,
  type NodeKind,
} from "@/lib/graph-work-types";
import {
  LACUNA_GRAPH_TUNING_DEFAULTS,
  effectiveNodeRelSizeFromViewport,
  effectiveViewportMinDimPx,
  graphTuningLinkColorRgba,
  zoomScaleForViewportFromTuning,
} from "@/lib/lacuna-graph-tuning";
import {
  GRAPH_NODE_KNOWN_FILL as NODE_FILL,
  GRAPH_PRIMARY_INK as PRIMARY_INK,
  graphGhostFillRgba,
  graphGhostStrokeRgba,
} from "@/lib/graph-node-styles";
import type { Work } from "@/lib/works";
import { escapeKeyShouldIgnoreTarget } from "@/lib/keyboard-dom";

import { GraphNodeDetailPanel } from "./graph-node-detail-panel";
import { LacunaCanvasPanel } from "./lacuna-canvas-panel";

import ForceGraph2D from "./force-graph-2d";

export type { GraphNode, WorkGraphInput } from "@/lib/graph-work-types";

function normAuthor(s: string): string {
  return String(s ?? "").trim();
}

function graphNodeIdKey(n: Pick<GraphNode, "id">): string {
  return String(n.id ?? "");
}

function matchesIndexAuthorHighlight(
  node: GraphNode,
  h: GraphAuthorHighlight | null | undefined,
): boolean {
  if (!h) return false;
  if (h.kind === "all") return true;
  if (h.kind === "node") {
    return graphNodeIdKey(node) === h.nodeId;
  }
  if (h.kind === "scope") {
    if (h.scope === "known") return node.nodeKind === "known";
    return isGhostNodeKind(node.nodeKind);
  }
  if (h.kind === "author") {
    if (h.scope === "known") {
      if (node.nodeKind !== "known") return false;
      return normAuthor(node.author) === normAuthor(h.author);
    }
    if (!isGhostNodeKind(node.nodeKind)) return false;
    return graphNodeAuthorFilterKey(node) === graphAuthorKey("ghost", h.author);
  }
  return false;
}

function nodeMatchesIndexVisual(
  node: GraphNode,
  indexHover: GraphAuthorHighlight | null | undefined,
  filterAuthorKeys: ReadonlySet<string> | undefined,
  detailLinkHover: GraphAuthorHighlight | null | undefined,
): boolean {
  if (detailLinkHover && matchesIndexAuthorHighlight(node, detailLinkHover)) {
    return true;
  }
  if (indexHover && matchesIndexAuthorHighlight(node, indexHover)) {
    return true;
  }
  if (filterAuthorKeys && filterAuthorKeys.size > 0) {
    return filterAuthorKeys.has(graphNodeAuthorFilterKey(node));
  }
  return false;
}

type NodeVisualState = {
  graphHover: boolean;
  selectionCluster: boolean;
  indexHl: boolean;
  showRing: boolean;
  usesCustomCanvas: boolean;
};

function getNodeVisualState(
  node: GraphNode,
  hover: GraphNode | null,
  selectedNode: GraphNode | null,
  indexHoverHighlight: GraphAuthorHighlight | null | undefined,
  filterAuthorKeys: ReadonlySet<string> | undefined,
  detailLinkHoverHighlight: GraphAuthorHighlight | null | undefined,
): NodeVisualState {
  const id = graphNodeIdKey(node);
  const graphHover =
    hover != null && id === graphNodeIdKey(hover);
  const selectionCluster =
    selectedNode != null && id === graphNodeIdKey(selectedNode);
  const indexHl = nodeMatchesIndexVisual(
    node,
    indexHoverHighlight,
    filterAuthorKeys,
    detailLinkHoverHighlight,
  );
  const showRing = graphHover || selectionCluster || indexHl;
  const usesCustomCanvas =
    isGhostNodeKind(node.nodeKind) || graphHover || selectionCluster || indexHl;
  return {
    graphHover,
    selectionCluster,
    indexHl,
    showRing,
    usesCustomCanvas,
  };
}

function connectedComponentNodeIds(
  links: ReadonlyArray<{ source: unknown; target: unknown }>,
  startId: string,
): Set<string> {
  const adj = new Map<string, Set<string>>();
  for (const l of links) {
    const a = linkEndpointId(l.source);
    const b = linkEndpointId(l.target);
    if (!adj.has(a)) adj.set(a, new Set());
    if (!adj.has(b)) adj.set(b, new Set());
    adj.get(a)!.add(b);
    adj.get(b)!.add(a);
  }
  const out = new Set<string>();
  const stack = [String(startId)];
  while (stack.length) {
    const id = stack.pop()!;
    if (out.has(id)) continue;
    out.add(id);
    const nbr = adj.get(id);
    if (nbr) {
      for (const x of nbr) {
        if (!out.has(x)) stack.push(x);
      }
    }
  }
  return out;
}

export function WorksForceGraph({
  works,
  aiFlow,
  indexHoverHighlight,
  filterAuthorKeys,
}: {
  works: Work[];
  aiFlow: LacunaAiFlowState;
  indexHoverHighlight?: GraphAuthorHighlight | null;
  filterAuthorKeys?: ReadonlySet<string>;
}) {
  const tuningCtx = useLacunaGraphTuningOptional();
  const tuning = tuningCtx?.tuning ?? LACUNA_GRAPH_TUNING_DEFAULTS;

  const { graphData, fullGraphData, graphKey, knownOnlyNoGhosts } =
    useWorkGraphData(works, aiFlow, filterAuthorKeys);

  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<{
    zoom: (k?: number, durationMs?: number) => number | unknown;
    screen2GraphCoords: (x: number, y: number) => { x: number; y: number };
    d3Force: (name: string, force?: object | null) => unknown;
    d3AlphaTarget: (v?: number) => number | unknown;
    d3ReheatSimulation?: () => unknown;
  } | null>(null);
  const boundaryExemptIdsRef = useRef<Set<string> | null>(null);
  const getBoundaryExemptIds = useCallback(
    () => boundaryExemptIdsRef.current,
    [],
  );
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const [hover, setHover] = useState<GraphNode | null>(null);
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
  const [detailLinkHoverHighlight, setDetailLinkHoverHighlight] =
    useState<GraphAuthorHighlight | null>(null);
  const effectiveDetailLinkHoverHighlight = selectedNode
    ? detailLinkHoverHighlight
    : null;

  const onNavigateToNode = useCallback(
    (target: { id: string; nodeKind: NodeKind }) => {
      const n = fullGraphData.nodes.find(
        (x) =>
          String(x.id) === String(target.id) &&
          x.nodeKind === target.nodeKind,
      );
      if (n) setSelectedNode(n);
    },
    [fullGraphData.nodes],
  );

  const viewportLayoutDim =
    dims.width > 0 && dims.height > 0
      ? effectiveViewportMinDimPx(dims.width, dims.height, tuning)
      : 0;
  const nodeRelSizeEffective = useMemo(
    () =>
      viewportLayoutDim > 0
        ? effectiveNodeRelSizeFromViewport(viewportLayoutDim, tuning)
        : tuning.nodeRelSize,
    [tuning, viewportLayoutDim],
  );
  const nodeRadius =
    Math.sqrt(Math.max(0, tuning.nodeValUniform)) * nodeRelSizeEffective;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setDims({
        width: Math.max(0, Math.floor(r.width)),
        height: Math.max(0, Math.floor(r.height)),
      });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useLacunaGraphForces(
    graphRef,
    graphData,
    dims,
    knownOnlyNoGhosts,
    tuning,
    nodeRelSizeEffective,
    getBoundaryExemptIds,
  );

  useEffect(() => {
    queueMicrotask(() => {
      setHover((h) => {
        if (!h) return null;
        const hid = graphNodeIdKey(h);
        const stillHere = graphData.nodes.some(
          (n) => graphNodeIdKey(n) === hid,
        );
        return stillHere ? h : null;
      });
    });
  }, [graphData]);

  useEffect(() => {
    queueMicrotask(() => {
      setSelectedNode((sel) => {
        if (!sel) return null;
        const sid = graphNodeIdKey(sel);
        const stillHere = graphData.nodes.some(
          (n) => graphNodeIdKey(n) === sid,
        );
        return stillHere ? sel : null;
      });
    });
  }, [graphData]);

  useEffect(() => {
    if (!selectedNode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (escapeKeyShouldIgnoreTarget(e.target)) return;
      setSelectedNode(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedNode]);

  const onDetailLinkedNodeHover = useCallback(
    (target: { id: string; nodeKind: NodeKind } | null) => {
      if (!target) {
        setDetailLinkHoverHighlight(null);
        return;
      }
      setDetailLinkHoverHighlight({ kind: "node", nodeId: String(target.id) });
    },
    [],
  );

  const prevGraphKeyRef = useRef<string | null>(null);
  const lastZoomDimsRef = useRef({ w: 0, h: 0 });

  useEffect(() => {
    const g = graphRef.current;
    if (!g || graphData.nodes.length === 0 || dims.width <= 0 || dims.height <= 0)
      return;
    const keyChanged = prevGraphKeyRef.current !== graphKey;
    const dimsChanged =
      lastZoomDimsRef.current.w !== dims.width ||
      lastZoomDimsRef.current.h !== dims.height;
    if (!keyChanged && !dimsChanged) return;
    if (keyChanged) prevGraphKeyRef.current = graphKey;
    lastZoomDimsRef.current = { w: dims.width, h: dims.height };
    g.zoom(
      zoomScaleForViewportFromTuning(
        graphData.nodes.length,
        dims.width,
        dims.height,
        tuning,
      ),
      0,
    );
  }, [graphKey, dims.width, dims.height, graphData.nodes.length, tuning]);

  const nodeLabel = useCallback(
    (n: object) => {
      const node = n as GraphNode;
      if (!selectedNode) return null;
      const id = graphNodeIdKey(node);
      if (id !== graphNodeIdKey(selectedNode)) return null;
      return formatGraphNodeCaption(node);
    },
    [selectedNode],
  );

  const nodeCanvasObjectMode = useCallback(
    (n: object) => {
      const node = n as GraphNode;
      const { usesCustomCanvas } = getNodeVisualState(
        node,
        hover,
        selectedNode,
        indexHoverHighlight,
        filterAuthorKeys,
        effectiveDetailLinkHoverHighlight,
      );
      return usesCustomCanvas ? ("after" as const) : undefined;
    },
    [
      hover,
      selectedNode,
      indexHoverHighlight,
      filterAuthorKeys,
      effectiveDetailLinkHoverHighlight,
    ],
  );

  const nodeCanvasObject = useCallback(
    (n: object, ctx: CanvasRenderingContext2D, globalScale: number) => {
      const node = n as GraphNode;
      const { showRing } = getNodeVisualState(
        node,
        hover,
        selectedNode,
        indexHoverHighlight,
        filterAuthorKeys,
        effectiveDetailLinkHoverHighlight,
      );

      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = nodeRadius;

      const ghostLineW = tuning.renderGhostLineW / globalScale;
      const ghostDash = [
        tuning.renderGhostDashA / globalScale,
        tuning.renderGhostDashB / globalScale,
      ] as [number, number];

      if (isGhostNodeKind(node.nodeKind) && !showRing) {
        ctx.save();
        ctx.setLineDash(ghostDash);
        ctx.lineWidth = ghostLineW;
        ctx.strokeStyle = graphGhostStrokeRgba();
        ctx.beginPath();
        ctx.arc(x, y, r - ghostLineW / 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      }

      if (!showRing) return;

      if (isGhostNodeKind(node.nodeKind)) {
        ctx.save();
        ctx.setLineDash(ghostDash);
        ctx.lineWidth = ghostLineW;
        ctx.strokeStyle = PRIMARY_INK;
        ctx.beginPath();
        ctx.arc(x, y, r - ghostLineW / 2, 0, 2 * Math.PI);
        ctx.stroke();
        ctx.restore();
      } else {
        const ringW = tuning.renderRingW / globalScale;
        ctx.beginPath();
        ctx.arc(x, y, r - ringW / 2, 0, 2 * Math.PI);
        ctx.strokeStyle = PRIMARY_INK;
        ctx.lineWidth = ringW;
        ctx.stroke();
      }

      const line = formatGraphNodeCaption(node);
      const gap = tuning.renderLabelGap / globalScale;
      const fontPx = tuning.renderLabelFontPx / globalScale;

      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.font = `${tuning.renderLabelFontWeight} ${fontPx}px system-ui, sans-serif`;
      ctx.fillStyle = PRIMARY_INK;
      ctx.fillText(line, x, y + r + gap);
    },
    [
      hover,
      selectedNode,
      indexHoverHighlight,
      filterAuthorKeys,
      effectiveDetailLinkHoverHighlight,
      tuning,
      nodeRadius,
    ],
  );

  const nodePointerAreaPaint = useCallback(
    (
      n: object,
      paintColor: string,
      ctx: CanvasRenderingContext2D,
      globalScale?: number,
    ) => {
      const node = n as GraphNode;
      const gs = typeof globalScale === "number" && globalScale > 0 ? globalScale : 1;
      const { showRing, usesCustomCanvas } = getNodeVisualState(
        node,
        hover,
        selectedNode,
        indexHoverHighlight,
        filterAuthorKeys,
        effectiveDetailLinkHoverHighlight,
      );

      const x = node.x ?? 0;
      const y = node.y ?? 0;
      const r = nodeRadius;

      ctx.fillStyle = paintColor;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, 2 * Math.PI);
      ctx.fill();

      if (!usesCustomCanvas || !showRing) return;

      const line = formatGraphNodeCaption(node);
      const gap = tuning.renderLabelGap / gs;
      const fontPx = tuning.renderLabelFontPx / gs;
      ctx.font = `${tuning.renderLabelFontWeight} ${fontPx}px system-ui, sans-serif`;
      const w = ctx.measureText(line).width;
      const pad = 6 / gs;
      const h = fontPx * 1.25;
      ctx.fillStyle = paintColor;
      ctx.fillRect(x - w / 2 - pad, y + r + gap - pad, w + pad * 2, h + pad);
    },
    [
      hover,
      selectedNode,
      indexHoverHighlight,
      filterAuthorKeys,
      effectiveDetailLinkHoverHighlight,
      tuning,
      nodeRadius,
    ],
  );

  const onNodeClick = useCallback((n: object) => {
    setSelectedNode(n as GraphNode);
  }, []);

  const onBackgroundClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const showPointerCursor = useCallback(
    (obj: object | undefined) => obj != null,
    [],
  );

  const restoreDriftAlpha = useCallback(() => {
    const g = graphRef.current;
    if (!g) return;
    const t = g.d3AlphaTarget();
    if (
      typeof t === "number" &&
      t < tuning.simAlphaTarget * tuning.simAlphaRestoreFraction
    ) {
      g.d3AlphaTarget(tuning.simAlphaTarget);
    }
  }, [tuning.simAlphaTarget, tuning.simAlphaRestoreFraction]);

  const onNodeDragEnd = useCallback(() => {
    const g = graphRef.current;
    if (!g) return;
    g.d3AlphaTarget(tuning.simAlphaTarget);
    g.d3ReheatSimulation?.();
  }, [tuning.simAlphaTarget]);

  const onEngineTick = useCallback(() => {
    restoreDriftAlpha();
    const dragged = graphData.nodes.find(
      (n) => Boolean((n as GraphNode & { __dragged?: boolean }).__dragged),
    ) as GraphNode | undefined;
    if (!dragged?.id) {
      boundaryExemptIdsRef.current = null;
      return;
    }
    boundaryExemptIdsRef.current = connectedComponentNodeIds(
      graphData.links,
      String(dragged.id),
    );
  }, [graphData.links, graphData.nodes, restoreDriftAlpha]);

  const hasAnyNodes =
    works.length > 0 || aiFlow.ghostWorks.length > 0;

  if (!hasAnyNodes) {
    return (
      <LacunaCanvasPanel className="flex min-h-[min(50vh,24rem)] flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-lacuna-ink/70">
          No works in the graph yet. Add titles and authors in{" "}
          <span className="font-medium text-lacuna-ink">Admin</span> to seed
          this view.
        </p>
      </LacunaCanvasPanel>
    );
  }

  const filterActive = Boolean(filterAuthorKeys && filterAuthorKeys.size > 0);
  if (filterActive && graphData.nodes.length === 0) {
    return (
      <LacunaCanvasPanel className="flex min-h-[min(50vh,24rem)] flex-1 flex-col items-center justify-center px-6 py-12 text-center">
        <p className="max-w-sm text-sm leading-relaxed text-lacuna-ink/70">
          No nodes match the selected authors. Clear the checkboxes in the index
          or choose authors that have works in the graph.
        </p>
      </LacunaCanvasPanel>
    );
  }

  return (
    <LacunaCanvasPanel
      dotGrid
      className="relative min-h-[min(50vh,24rem)] flex-1"
    >
      <div ref={containerRef} className="absolute inset-0 min-h-0 w-full">
        {dims.width > 0 && dims.height > 0 ? (
          <ForceGraph2D
            // eslint-disable-next-line @typescript-eslint/no-explicit-any -- kapsule ref typing
            ref={graphRef as any}
            width={dims.width}
            height={dims.height}
            graphData={graphData}
            backgroundColor="rgba(0,0,0,0)"
            nodeId="id"
            nodeRelSize={nodeRelSizeEffective}
            nodeLabel={nodeLabel}
            nodeVal={tuning.nodeValUniform}
            linkColor={() => graphTuningLinkColorRgba(tuning)}
            linkWidth={tuning.renderLinkWidth}
            linkCurvature={tuning.linkCurvature}
            nodeColor={(n: object) => {
              const nk = (n as GraphNode).nodeKind;
              if (nk === "ghost") return graphGhostFillRgba();
              return NODE_FILL;
            }}
            nodeCanvasObjectMode={nodeCanvasObjectMode}
            nodeCanvasObject={nodeCanvasObject}
            nodePointerAreaPaint={nodePointerAreaPaint}
            onNodeHover={(n: object | null) =>
              setHover(n as GraphNode | null)
            }
            onNodeClick={onNodeClick}
            onBackgroundClick={onBackgroundClick}
            onEngineTick={onEngineTick}
            onNodeDragEnd={onNodeDragEnd}
            cooldownTicks={Number.POSITIVE_INFINITY}
            cooldownTime={Number.POSITIVE_INFINITY}
            d3AlphaTarget={tuning.simAlphaTarget}
            d3AlphaMin={tuning.d3AlphaMin}
            d3AlphaDecay={tuning.d3AlphaDecay}
            d3VelocityDecay={tuning.simVelocityDecay}
            minZoom={tuning.minZoom}
            maxZoom={tuning.maxZoom}
            autoPauseRedraw={tuning.autoPauseRedraw}
            enablePointerInteraction
            enableNodeDrag
            enableZoomInteraction={tuning.enableZoomInteraction}
            enablePanInteraction={tuning.enablePanInteraction}
            showPointerCursor={showPointerCursor}
          />
        ) : null}
      </div>
      {selectedNode ? (
        <GraphNodeDetailPanel
          node={{
            id: selectedNode.id,
            title: selectedNode.title,
            author: selectedNode.author,
            nodeKind: selectedNode.nodeKind,
            graphCaption: selectedNode.graphCaption,
          }}
          works={works}
          aiFlow={aiFlow}
          onClose={() => setSelectedNode(null)}
          onNavigateToNode={onNavigateToNode}
          onLinkedNodeHover={onDetailLinkedNodeHover}
        />
      ) : null}
    </LacunaCanvasPanel>
  );
}
