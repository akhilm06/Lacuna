import { useMemo } from "react";

import { linkEndpointId } from "@/lib/graph-link-endpoint";
import type { LacunaAiFlowState } from "@/lib/lacuna-ai-flow-model";
import {
  formatGhostGraphCaption,
  ghostRowAuthorLabel,
} from "@/lib/lacuna-ai-flow-model";
import {
  graphNodeAuthorFilterKey,
  isGhostNodeKind,
  type GraphNode,
} from "@/lib/graph-work-types";
import type { Work } from "@/lib/works";

export function useWorkGraphData(
  works: Work[],
  aiFlow: LacunaAiFlowState,
  filterAuthorKeys?: ReadonlySet<string>,
) {
  const fullGraphData = useMemo(() => {
    const workIds = new Set(works.map((w) => w.id));
    const ghostIds = new Set(aiFlow.ghostWorks.map((g) => g.id));
    const nodes: GraphNode[] = [
      ...works.map((w) => ({
        ...w,
        nodeKind: "known" as const,
      })),
      ...aiFlow.ghostWorks.map((g) => ({
        id: g.id,
        title: g.title,
        author: g.author ?? "",
        graphCaption: formatGhostGraphCaption(g),
        ghostIndexLabel: ghostRowAuthorLabel(g),
        nodeKind: "ghost" as const,
      })),
    ];
    const links = aiFlow.edges
      .filter(
        (e) => workIds.has(e.sourceWorkId) && ghostIds.has(e.targetGhostId),
      )
      .map((e) => ({
        source: e.sourceWorkId,
        target: e.targetGhostId,
      }));
    return { nodes, links };
  }, [works, aiFlow]);

  const graphData = useMemo(() => {
    if (!filterAuthorKeys || filterAuthorKeys.size === 0) {
      return fullGraphData;
    }

    const adj = new Map<string, Set<string>>();
    const addEdge = (a: string, b: string) => {
      if (!adj.has(a)) adj.set(a, new Set());
      if (!adj.has(b)) adj.set(b, new Set());
      adj.get(a)!.add(b);
      adj.get(b)!.add(a);
    };
    for (const l of fullGraphData.links) {
      addEdge(linkEndpointId(l.source), linkEndpointId(l.target));
    }

    const seed = new Set<string>();
    for (const n of fullGraphData.nodes) {
      if (filterAuthorKeys.has(graphNodeAuthorFilterKey(n))) {
        seed.add(String(n.id));
      }
    }

    const visible = new Set<string>();
    for (const id of seed) {
      visible.add(id);
      const neigh = adj.get(id);
      if (neigh) {
        for (const x of neigh) visible.add(x);
      }
    }

    const nodes = fullGraphData.nodes.filter((n) =>
      visible.has(String(n.id)),
    );
    const links = fullGraphData.links.filter((l) => {
      const s = linkEndpointId(l.source);
      const t = linkEndpointId(l.target);
      return visible.has(String(s)) && visible.has(String(t));
    });
    return { nodes, links };
  }, [fullGraphData, filterAuthorKeys]);

  const knownOnlyNoGhosts = useMemo(() => {
    if (graphData.nodes.length === 0) return false;
    return !graphData.nodes.some((n) => isGhostNodeKind(n.nodeKind));
  }, [graphData]);

  const graphKey = useMemo(() => {
    const nodePart = graphData.nodes.map((n) => n.id).join("\0");
    const edgePart = graphData.links
      .map((l) => `${linkEndpointId(l.source)}\0${linkEndpointId(l.target)}`)
      .sort()
      .join("|");
    return `${nodePart}\0${edgePart}\0${knownOnlyNoGhosts ? "kng" : "mix"}`;
  }, [graphData, knownOnlyNoGhosts]);

  return { graphData, fullGraphData, graphKey, knownOnlyNoGhosts };
}
