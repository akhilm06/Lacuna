import type { GhostEpistemicField, GhostKind } from "@/lib/lacuna-epistemic-field";

export type GhostEvidence = {
  workId: string;
  excerptIds: string[];
};

export type GhostWhatIsKnownSourceRef = {
  n: number;
  workId: string;
  title: string;
  author: string;
};

export type GhostWork = {
  id: string;
  ghostKind: GhostKind;
  title: string;
  author: string | null;
  titleMeta: GhostEpistemicField;
  authorMeta: GhostEpistemicField;
  evidence: GhostEvidence[];
  briefOverview: string | null;
  whatIsKnown: string | null;
  whatIsKnownSourceRefs: GhostWhatIsKnownSourceRef[] | null;
  droppedClaimsCount: number | null;
};

export function ghostRowAuthorLabel(g: GhostWork): string {
  if (g.ghostKind === "adespota") {
    if (g.authorMeta.status === "known") return g.authorMeta.value.trim();
    if (g.titleMeta.status === "known") return g.titleMeta.value.trim();
    return "Untitled references";
  }
  const a = (g.author ?? "").trim();
  return a.length > 0 ? a : "Unknown author";
}

export function formatGhostGraphCaption(g: GhostWork): string {
  if (g.ghostKind !== "adespota") {
    const t = g.title.trim() || "Untitled";
    const a = (g.author ?? "").trim();
    return a ? `${t} · ${a}` : t;
  }
  if (g.authorMeta.status === "known") {
    return `Adespota · ${g.authorMeta.value.trim()}`;
  }
  if (g.titleMeta.status === "known") {
    return `Adespota · ${g.titleMeta.value.trim()}`;
  }
  return "Adespota";
}

export function ghostProfileContextForPrompt(
  ghost: GhostWork,
): Record<string, string> {
  const line = (f: GhostEpistemicField) =>
    f.status === "known" ? f.value : "unknown";
  return {
    ghostKind: ghost.ghostKind,
    title: ghost.title,
    author: ghost.author ?? "",
    titleLine: line(ghost.titleMeta),
    authorLine: line(ghost.authorMeta),
  };
}

export type AiFlowEdge = {
  sourceWorkId: string;
  targetGhostId: string;
};

export type LacunaAiFlowState = {
  ghostWorks: GhostWork[];
  edges: AiFlowEdge[];
  lastRunAt: string | null;
};
