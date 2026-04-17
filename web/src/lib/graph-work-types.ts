import type { Work } from "@/lib/works";

export type WorkGraphInput = Pick<Work, "id" | "title" | "author">;

export type NodeKind = "known" | "ghost";

export function isGhostNodeKind(k: NodeKind): boolean {
  return k === "ghost";
}

export type GraphNode = WorkGraphInput & {
  nodeKind: NodeKind;
  graphCaption?: string;
  ghostIndexLabel?: string;
  x?: number;
  y?: number;
  fx?: number;
  fy?: number;
  vx?: number;
  vy?: number;
};

export function formatGraphNodeCaption(
  node: Pick<
    GraphNode,
    "title" | "author" | "nodeKind" | "graphCaption"
  >,
): string {
  const pre = String(node.graphCaption ?? "").trim();
  if (pre.length > 0) return pre;
  const title = String(node.title ?? "").trim() || "Untitled";
  const author = String(node.author ?? "").trim();
  if (author || node.nodeKind === "known") {
    return author ? `${title} · ${author}` : title;
  }
  return title;
}

export function graphNodeAuthorFilterKey(
  node: Pick<GraphNode, "nodeKind" | "author" | "title" | "ghostIndexLabel">,
): string {
  const author = String(node.author ?? "").trim();
  if (node.nodeKind === "known") {
    return `known:${author}`;
  }
  const idx = String(node.ghostIndexLabel ?? "").trim();
  const ghostLabel = idx || author || "Unknown author";
  return `ghost:${ghostLabel}`;
}
