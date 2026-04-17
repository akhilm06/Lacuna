import type { GhostWhatIsKnownSourceRef } from "@/lib/lacuna-ai-flow-model";
import {
  stripTrailingCitations,
  validateWhatIsKnownCitationDetails,
} from "@/lib/ghost-profile-citations";

import type { GhostSynthExcerpt } from "./synthesize-brief-overview";
import {
  verifyWhatIsKnownLines,
  type VerifyLineInput,
} from "./verify-what-is-known";
import {
  refineWhatIsKnownLines,
  type RefineLineInput,
} from "./refine-what-is-known";

export const DEFAULT_VERIFY_MAX_ITERATIONS = 3;

function resolveMaxIterations(): number {
  const raw = process.env["LACUNA_VERIFY_MAX_ITERATIONS"];
  if (typeof raw !== "string") return DEFAULT_VERIFY_MAX_ITERATIONS;
  const n = Number.parseInt(raw.trim(), 10);
  if (!Number.isFinite(n) || n < 1) return DEFAULT_VERIFY_MAX_ITERATIONS;
  return Math.min(n, 10);
}

export type VerifyRefineLoopResult = {
  whatIsKnown: string | null;
  whatIsKnownSourceRefs: GhostWhatIsKnownSourceRef[] | null;
  droppedClaimsCount: number | null;
  iterationsRun: number;
};

type LineState = {
  lineId: string;
  text: string;
  status: "pending" | "supported";
};

type LoopDeps = {
  apiKey: string;
  model: string;
  sources: readonly GhostWhatIsKnownSourceRef[];
  excerpts: readonly GhostSynthExcerpt[];
};

function buildExcerptsBySourceN(
  excerpts: readonly GhostSynthExcerpt[],
): Map<number, GhostSynthExcerpt[]> {
  const map = new Map<number, GhostSynthExcerpt[]>();
  for (const e of excerpts) {
    const arr = map.get(e.sourceN);
    if (arr) arr.push(e);
    else map.set(e.sourceN, [e]);
  }
  return map;
}

function validSourceNSet(
  sources: readonly GhostWhatIsKnownSourceRef[],
): Set<number> {
  return new Set(sources.map((s) => s.n));
}

function parseInitialLines(
  whatIsKnown: string,
  validSourceNs: Set<number>,
): { states: LineState[]; droppedAtParse: number } {
  const raw = whatIsKnown
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  const states: LineState[] = [];
  let droppedAtParse = 0;
  raw.forEach((text, i) => {
    const { rest, nums } = stripTrailingCitations(text);
    if (rest.length === 0 || nums.length === 0) {
      droppedAtParse++;
      return;
    }
    if (!nums.every((n) => validSourceNs.has(n))) {
      droppedAtParse++;
      return;
    }
    states.push({
      lineId: `L${i + 1}`,
      text,
      status: "pending",
    });
  });
  return { states, droppedAtParse };
}

function buildVerifyInputs(
  pending: readonly LineState[],
  excerptsBySourceN: Map<number, GhostSynthExcerpt[]>,
): VerifyLineInput[] {
  const out: VerifyLineInput[] = [];
  for (const p of pending) {
    const { rest, nums } = stripTrailingCitations(p.text);
    const citedExcerpts: VerifyLineInput["citedExcerpts"] = [];
    for (const n of nums) {
      const list = excerptsBySourceN.get(n) ?? [];
      for (const e of list) {
        citedExcerpts.push({
          sourceN: n,
          excerptId: e.excerptId,
          text: e.text,
        });
      }
    }
    out.push({
      lineId: p.lineId,
      claim: rest,
      citedExcerpts,
    });
  }
  return out;
}

function buildRefineInputs(
  flagged: readonly {
    state: LineState;
    reason?: string;
  }[],
  excerptsBySourceN: Map<number, GhostSynthExcerpt[]>,
): RefineLineInput[] {
  const out: RefineLineInput[] = [];
  for (const f of flagged) {
    const { rest, nums } = stripTrailingCitations(f.state.text);
    const citedExcerpts: RefineLineInput["citedExcerpts"] = [];
    for (const n of nums) {
      const list = excerptsBySourceN.get(n) ?? [];
      for (const e of list) {
        citedExcerpts.push({
          sourceN: n,
          excerptId: e.excerptId,
          text: e.text,
        });
      }
    }
    out.push({
      lineId: f.state.lineId,
      originalLine: f.state.text,
      claim: rest,
      citedSourceNs: nums,
      citedExcerpts,
      reason: f.reason,
    });
  }
  return out;
}

function isRefinedLineAcceptable(
  newLine: string,
  allowedNs: readonly number[],
): boolean {
  const allowed = new Set(allowedNs);
  const { rest, nums } = stripTrailingCitations(newLine.trim());
  if (rest.length === 0) return false;
  if (nums.length === 0) return false;
  return nums.every((n) => allowed.has(n));
}

function pruneSourceRefs(
  survivors: readonly LineState[],
  sources: readonly GhostWhatIsKnownSourceRef[],
): GhostWhatIsKnownSourceRef[] {
  const usedNs = new Set<number>();
  for (const s of survivors) {
    const { nums } = stripTrailingCitations(s.text);
    for (const n of nums) usedNs.add(n);
  }
  return sources.filter((s) => usedNs.has(s.n));
}

export async function runVerifyRefineLoop(args: {
  apiKey: string;
  model: string;
  whatIsKnown: string;
  profileContext?: Record<string, string>;
  sources: readonly GhostWhatIsKnownSourceRef[];
  excerpts: readonly GhostSynthExcerpt[];
}): Promise<VerifyRefineLoopResult> {
  const deps: LoopDeps = {
    apiKey: args.apiKey,
    model: args.model,
    sources: args.sources,
    excerpts: args.excerpts,
  };
  const maxIterations = resolveMaxIterations();
  const validNs = validSourceNSet(args.sources);
  const excerptsBySourceN = buildExcerptsBySourceN(args.excerpts);

  const { states, droppedAtParse } = parseInitialLines(
    args.whatIsKnown,
    validNs,
  );
  const initialLineCount = states.length + droppedAtParse;

  if (states.length === 0) {
    return {
      whatIsKnown: null,
      whatIsKnownSourceRefs: null,
      droppedClaimsCount: initialLineCount,
      iterationsRun: 0,
    };
  }

  let iterationsRun = 0;
  let lastPendingSnapshot = "";

  try {
    for (let iter = 0; iter < maxIterations; iter++) {
      const pending = states.filter((s) => s.status === "pending");
      if (pending.length === 0) break;
      iterationsRun = iter + 1;

      const verifyInputs = buildVerifyInputs(pending, excerptsBySourceN);
      const verdicts = await verifyWhatIsKnownLines({
        apiKey: deps.apiKey,
        model: deps.model,
        lines: verifyInputs,
        profileContext: args.profileContext,
      });
      const verdictByLineId = new Map(verdicts.map((v) => [v.lineId, v]));

      const flagged: { state: LineState; reason?: string }[] = [];
      for (const p of pending) {
        const v = verdictByLineId.get(p.lineId);
        if (v && v.verdict === "supported") {
          p.status = "supported";
        } else {
          flagged.push({ state: p, reason: v?.reason });
        }
      }
      if (flagged.length === 0) break;

      if (iter === maxIterations - 1) break;

      const pendingSnapshot = flagged
        .map((f) => `${f.state.lineId}::${f.state.text}`)
        .join("\n");
      if (pendingSnapshot === lastPendingSnapshot) {
        break;
      }
      lastPendingSnapshot = pendingSnapshot;

      const refineInputs = buildRefineInputs(flagged, excerptsBySourceN);
      const replacements = await refineWhatIsKnownLines({
        apiKey: deps.apiKey,
        model: deps.model,
        lines: refineInputs,
        profileContext: args.profileContext,
      });
      const replBy = new Map(replacements.map((r) => [r.lineId, r]));

      const toRemove = new Set<string>();
      for (const f of flagged) {
        const r = replBy.get(f.state.lineId);
        if (!r || r.newLine === null) {
          toRemove.add(f.state.lineId);
          continue;
        }
        const input = refineInputs.find((i) => i.lineId === f.state.lineId);
        const allowed = input ? input.citedSourceNs : [];
        if (!isRefinedLineAcceptable(r.newLine, allowed)) {
          toRemove.add(f.state.lineId);
          continue;
        }
        f.state.text = r.newLine.trim();
      }
      if (toRemove.size > 0) {
        for (let i = states.length - 1; i >= 0; i--) {
          if (toRemove.has(states[i].lineId)) states.splice(i, 1);
        }
      }
    }
  } catch (e) {
    console.error("[lacuna] Pass 5 verify/refine loop error", e);
    return {
      whatIsKnown: args.whatIsKnown,
      whatIsKnownSourceRefs: [...args.sources],
      droppedClaimsCount: null,
      iterationsRun,
    };
  }

  const survivors = states.filter((s) => s.status === "supported");
  const droppedClaimsCount =
    initialLineCount - survivors.length >= 0
      ? initialLineCount - survivors.length
      : 0;

  if (survivors.length === 0) {
    return {
      whatIsKnown: null,
      whatIsKnownSourceRefs: null,
      droppedClaimsCount,
      iterationsRun,
    };
  }

  const finalText = survivors.map((s) => s.text).join("\n");
  const prunedSources = pruneSourceRefs(survivors, args.sources);

  const gate = validateWhatIsKnownCitationDetails(
    finalText,
    args.sources.length,
  );
  if (!gate.ok) {
    console.error(
      "[lacuna] Pass 5 final structural gate failed; discarding whatIsKnown",
      gate,
    );
    return {
      whatIsKnown: null,
      whatIsKnownSourceRefs: null,
      droppedClaimsCount: initialLineCount,
      iterationsRun,
    };
  }

  return {
    whatIsKnown: finalText,
    whatIsKnownSourceRefs: prunedSources,
    droppedClaimsCount,
    iterationsRun,
  };
}
