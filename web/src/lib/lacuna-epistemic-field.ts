export type GhostEpistemicField =
  | { status: "unknown" }
  | { status: "known"; value: string };

export type GhostKind = "specific" | "adespota";

export function unknownField(): GhostEpistemicField {
  return { status: "unknown" };
}

export function knownField(value: string): GhostEpistemicField {
  return { status: "known", value: value.trim() };
}

export function mergeEpistemicFields(
  a: GhostEpistemicField,
  b: GhostEpistemicField,
): GhostEpistemicField {
  if (a.status === "unknown" || b.status === "unknown") {
    return { status: "unknown" };
  }
  if (a.value.trim() !== b.value.trim()) {
    return { status: "unknown" };
  }
  return { status: "known", value: a.value.trim() };
}
