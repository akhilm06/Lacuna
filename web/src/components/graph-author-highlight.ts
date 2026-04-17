export type GraphAuthorScope = "known" | "ghost";

export type GraphAuthorHighlight =
  | { kind: "author"; scope: GraphAuthorScope; author: string }
  | { kind: "scope"; scope: GraphAuthorScope }
  | { kind: "all" }
  | { kind: "node"; nodeId: string };

export function graphAuthorKey(
  scope: GraphAuthorScope,
  author: string,
): string {
  return `${scope}:${author}`;
}
