import type { GhostWhatIsKnownSourceRef, GhostWork } from "@/lib/lacuna-ai-flow-model";
import type { Work } from "@/lib/works";

export function buildGhostCitationSources(
  ghost: GhostWork,
  worksById: Map<string, Work>,
): GhostWhatIsKnownSourceRef[] {
  const seen = new Set<string>();
  const rows: { workId: string; title: string; author: string }[] = [];
  for (const ev of ghost.evidence) {
    const w = worksById.get(ev.workId);
    if (!w || seen.has(w.id)) continue;
    seen.add(w.id);
    rows.push({
      workId: w.id,
      title: String(w.title ?? "").trim() || w.id,
      author: String(w.author ?? "").trim(),
    });
  }
  rows.sort((a, b) => {
    const t = a.title.localeCompare(b.title, undefined, {
      sensitivity: "base",
    });
    if (t !== 0) return t;
    return a.workId.localeCompare(b.workId);
  });
  return rows.map((r, i) => ({
    n: i + 1,
    workId: r.workId,
    title: r.title,
    author: r.author,
  }));
}

export function stripTrailingCitations(line: string): {
  rest: string;
  nums: number[];
} {
  let s = line.trimEnd();
  const nums: number[] = [];
  for (;;) {
    const mBracket = s.match(/\[(\d+)\]\s*(?:[.,;:!?]+)?\s*$/);
    if (mBracket && mBracket.index !== undefined) {
      nums.unshift(parseInt(mBracket[1], 10));
      s = s.slice(0, mBracket.index).trimEnd();
      continue;
    }
    const mParen = s.match(/\((\d+)\)\s*(?:[.,;:!?]+)?\s*$/);
    if (mParen && mParen.index !== undefined) {
      nums.unshift(parseInt(mParen[1], 10));
      s = s.slice(0, mParen.index).trimEnd();
      continue;
    }
    break;
  }
  return { rest: s.trim(), nums };
}

export type WhatIsKnownCitationValidation =
  | { ok: true }
  | {
      ok: false;
      sourceCount: number;
      failingLineIndex: number;
      failingLine: string;
      detail:
        | "no_trailing_citations"
        | "invalid_source_number"
        | "empty_fact_before_cites";
      badNumbers?: number[];
    };

export function validateWhatIsKnownCitationDetails(
  text: string,
  sourceCount: number,
): WhatIsKnownCitationValidation {
  if (sourceCount <= 0) return { ok: true };
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: true };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const { rest, nums } = stripTrailingCitations(line);
    if (nums.length === 0) {
      return {
        ok: false,
        sourceCount,
        failingLineIndex: i,
        failingLine: line,
        detail: "no_trailing_citations",
      };
    }
    const bad = nums.filter(
      (n) => !Number.isInteger(n) || n < 1 || n > sourceCount,
    );
    if (bad.length > 0) {
      return {
        ok: false,
        sourceCount,
        failingLineIndex: i,
        failingLine: line,
        detail: "invalid_source_number",
        badNumbers: bad,
      };
    }
    if (rest.length === 0) {
      return {
        ok: false,
        sourceCount,
        failingLineIndex: i,
        failingLine: line,
        detail: "empty_fact_before_cites",
      };
    }
  }
  return { ok: true };
}

export function validateWhatIsKnownCitations(
  text: string,
  sourceCount: number,
): boolean {
  return validateWhatIsKnownCitationDetails(text, sourceCount).ok;
}

export function formatCitationValidationFailure(
  r: Extract<WhatIsKnownCitationValidation, { ok: false }>,
): string {
  const base = `line ${r.failingLineIndex + 1} (${r.detail}, sourceCount=${r.sourceCount})`;
  if (r.detail === "invalid_source_number" && r.badNumbers?.length) {
    return `${base} badNumbers=[${r.badNumbers.join(",")}]`;
  }
  return base;
}
