import type { AiFlowEdge, GhostWork } from "@/lib/lacuna-ai-flow-model";
import { ghostProfileContextForPrompt } from "@/lib/lacuna-ai-flow-model";
import { writeLacunaAiFlow } from "@/lib/lacuna-ai-flow";
import {
  knownField,
  unknownField,
  type GhostKind,
} from "@/lib/lacuna-epistemic-field";
import {
  buildGhostCitationSources,
  formatCitationValidationFailure,
  validateWhatIsKnownCitationDetails,
} from "@/lib/ghost-profile-citations";
import {
  excerptTextForPipeline,
  getWorks,
  type Work,
} from "@/lib/works";

import {
  parseAiFlowLlmResponse,
  type AiFlowLlmFinding,
} from "./ai-flow-response";
import {
  getGeminiModel,
  MissingGeminiApiKeyError,
  resolveGeminiApiKey,
} from "./config";
import {
  geminiChatCompletionsJsonObject,
  getAiFlowSystemPrompt,
} from "./chat-completions-json";
import { synthesizeBriefOverview } from "./synthesize-brief-overview";
import type { GhostSynthExcerpt } from "./synthesize-brief-overview";
import { synthesizeWhatIsKnown } from "./synthesize-what-is-known";
import { ensureExcerptPipelineTexts } from "./translate-excerpts";
import { runVerifyRefineLoop } from "./verify-refine-loop";

const AGG_AUTHOR_PREFIX = "agg::author::";
const AGG_TITLE_PREFIX = "agg::title::";
const SPECIFIC_PREFIX = "specific::";

function normDedupePart(s: string): string {
  return s.trim().toLowerCase();
}

function ghostMergeKey(finding: AiFlowLlmFinding): string | null {
  const tit = finding.title;
  const auth = finding.author;
  if (tit.status === "unknown" && auth.status === "unknown") return null;
  // Same string for title+author → adespota-by-author, not a titled specific work.
  if (tit.status === "known" && auth.status === "known") {
    const nt = normDedupePart(tit.value);
    const na = normDedupePart(auth.value);
    if (nt.length > 0 && nt === na) {
      return `${AGG_AUTHOR_PREFIX}${na}`;
    }
  }
  if (tit.status === "unknown") {
    if (auth.status === "known") {
      return `${AGG_AUTHOR_PREFIX}${normDedupePart(auth.value)}`;
    }
    return null;
  }
  const titlePart = normDedupePart(tit.value);
  if (auth.status === "known") {
    return `${SPECIFIC_PREFIX}${titlePart}::${normDedupePart(auth.value)}`;
  }
  return `${AGG_TITLE_PREFIX}${titlePart}`;
}

function initialGhostFromFinding(finding: AiFlowLlmFinding): GhostWork {
  const titleKnown = finding.title.status === "known";
  const authorKnown = finding.author.status === "known";
  const titleVal =
    finding.title.status === "known" ? finding.title.value.trim() : "";
  const authorVal =
    finding.author.status === "known" ? finding.author.value.trim() : "";

  if (!titleKnown && authorKnown && authorVal.length > 0) {
    const ghostKind: GhostKind = "adespota";
    return {
      id: crypto.randomUUID(),
      ghostKind,
      title: "Adespota",
      author: authorVal,
      titleMeta: finding.title,
      authorMeta: finding.author,
      evidence: [],
      briefOverview: null,
      whatIsKnown: null,
      whatIsKnownSourceRefs: null,
      droppedClaimsCount: null,
    };
  }
  if (titleKnown && titleVal.length > 0 && !authorKnown) {
    const ghostKind: GhostKind = "adespota";
    return {
      id: crypto.randomUUID(),
      ghostKind,
      title: "Adespota",
      author: null,
      titleMeta: finding.title,
      authorMeta: finding.author,
      evidence: [],
      briefOverview: null,
      whatIsKnown: null,
      whatIsKnownSourceRefs: null,
      droppedClaimsCount: null,
    };
  }
  if (titleKnown && authorKnown && titleVal.length > 0 && authorVal.length > 0) {
    if (normDedupePart(titleVal) === normDedupePart(authorVal)) {
      return {
        id: crypto.randomUUID(),
        ghostKind: "adespota",
        title: "Adespota",
        author: authorVal,
        titleMeta: unknownField(),
        authorMeta: knownField(authorVal),
        evidence: [],
        briefOverview: null,
        whatIsKnown: null,
        whatIsKnownSourceRefs: null,
        droppedClaimsCount: null,
      };
    }
    return {
      id: crypto.randomUUID(),
      ghostKind: "specific",
      title: titleVal,
      author: authorVal,
      titleMeta: finding.title,
      authorMeta: finding.author,
      evidence: [],
      briefOverview: null,
      whatIsKnown: null,
      whatIsKnownSourceRefs: null,
      droppedClaimsCount: null,
    };
  }

  throw new Error("initialGhostFromFinding: unsupported finding shape");
}

function appendEvidence(
  ghost: GhostWork,
  workId: string,
  excerptIds: string[],
): void {
  const uniq = [...new Set(excerptIds)];
  const block = ghost.evidence.find((e) => e.workId === workId);
  if (block) {
    block.excerptIds = [...new Set([...block.excerptIds, ...uniq])];
  } else {
    ghost.evidence.push({ workId, excerptIds: uniq });
  }
}

function validateExcerptIds(work: Work, ids: string[]): boolean {
  const allowed = new Set(work.excerpts.map((e) => e.id));
  return ids.every((id) => allowed.has(id));
}

function applyFinding(
  workId: string,
  finding: AiFlowLlmFinding,
  ghostByKey: Map<string, GhostWork>,
  edgeKeys: Set<string>,
): void {
  const key = ghostMergeKey(finding);
  if (key === null) return;
  let ghost = ghostByKey.get(key);
  if (!ghost) {
    ghost = initialGhostFromFinding(finding);
    ghostByKey.set(key, ghost);
  }
  appendEvidence(ghost, workId, finding.excerptIds);
  edgeKeys.add(`${workId}\t${ghost.id}`);
}

const SYNTH_PER_EXCERPT_CHAR_CAP = 6000;
const SYNTH_TOTAL_CHAR_BUDGET = 48_000;

function truncateForSynth(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  if (maxLen <= 3) return text.slice(0, maxLen);
  return `${text.slice(0, maxLen - 3)}...`;
}

function resolveGhostExcerptRows(
  ghost: GhostWork,
  worksById: Map<string, Work>,
  sourceNByWorkId: Map<string, number>,
): GhostSynthExcerpt[] {
  const rows: GhostSynthExcerpt[] = [];
  const seen = new Set<string>();
  for (const ev of ghost.evidence) {
    const work = worksById.get(ev.workId);
    if (!work) continue;
    const sourceN = sourceNByWorkId.get(work.id);
    if (sourceN === undefined) continue;
    const byId = new Map(work.excerpts.map((e) => [e.id, e]));
    for (const excerptId of ev.excerptIds) {
      const key = `${work.id}\t${excerptId}`;
      if (seen.has(key)) continue;
      const ex = byId.get(excerptId);
      if (!ex) continue;
      seen.add(key);
      rows.push({
        workId: work.id,
        workTitle: work.title,
        workAuthor: work.author,
        excerptId,
        text: excerptTextForPipeline(ex),
        sourceN,
      });
    }
  }
  return rows;
}

function capRowsForSynth(
  rows: readonly GhostSynthExcerpt[],
): GhostSynthExcerpt[] {
  let used = 0;
  const out: GhostSynthExcerpt[] = [];
  for (const r of rows) {
    const room = SYNTH_TOTAL_CHAR_BUDGET - used;
    if (room <= 0) break;
    const sliceCap = Math.min(SYNTH_PER_EXCERPT_CHAR_CAP, room);
    const text = truncateForSynth(r.text, sliceCap);
    used += text.length;
    out.push({ ...r, text });
  }
  return out;
}

async function synthesizeGhostProfiles(
  apiKey: string,
  model: string,
  ghostWorks: GhostWork[],
  works: Work[],
): Promise<void> {
  const worksById = new Map(works.map((w) => [w.id, w]));

  for (const ghost of ghostWorks) {
    ghost.briefOverview = null;
    ghost.whatIsKnown = null;
    ghost.whatIsKnownSourceRefs = null;
    ghost.droppedClaimsCount = null;

    const sources = buildGhostCitationSources(ghost, worksById);
    const sourceNByWorkId = new Map(sources.map((s) => [s.workId, s.n]));
    const resolved = resolveGhostExcerptRows(ghost, worksById, sourceNByWorkId);
    const capped = capRowsForSynth(resolved);
    if (capped.length === 0 || sources.length === 0) continue;

    const profileContext = ghostProfileContextForPrompt(ghost);

    if (ghost.ghostKind !== "adespota") {
      try {
        ghost.briefOverview = await synthesizeBriefOverview({
          apiKey,
          model,
          ghost: { title: ghost.title, author: ghost.author },
          profileContext,
          sources,
          excerpts: capped,
        });
      } catch (e) {
        console.error(
          "[lacuna] Pass 3 (briefOverview) failed for ghost",
          ghost.id,
          e,
        );
        ghost.briefOverview = null;
      }
    }

    let rawWhatIsKnown: string | null = null;
    try {
      rawWhatIsKnown = await synthesizeWhatIsKnown({
        apiKey,
        model,
        ghost: { title: ghost.title, author: ghost.author },
        profileContext,
        briefOverview: ghost.briefOverview,
        sources,
        excerpts: capped,
      });
    } catch (e) {
      console.error(
        "[lacuna] Pass 4 (whatIsKnown) failed for ghost",
        ghost.id,
        e,
      );
      rawWhatIsKnown = null;
    }

    if (!rawWhatIsKnown) {
      ghost.whatIsKnown = null;
      ghost.whatIsKnownSourceRefs = null;
      ghost.droppedClaimsCount = null;
      continue;
    }

    const gate = validateWhatIsKnownCitationDetails(
      rawWhatIsKnown,
      sources.length,
    );
    if (!gate.ok) {
      console.error(
        "[lacuna] Pass 4 structural citation gate failed",
        ghost.id,
        formatCitationValidationFailure(gate),
      );
      ghost.whatIsKnown = null;
      ghost.whatIsKnownSourceRefs = null;
      ghost.droppedClaimsCount = null;
      continue;
    }

    try {
      const loop = await runVerifyRefineLoop({
        apiKey,
        model,
        whatIsKnown: rawWhatIsKnown,
        profileContext,
        sources,
        excerpts: capped,
      });
      ghost.whatIsKnown = loop.whatIsKnown;
      ghost.whatIsKnownSourceRefs = loop.whatIsKnownSourceRefs;
      ghost.droppedClaimsCount = loop.droppedClaimsCount;
    } catch (e) {
      console.error(
        "[lacuna] Pass 5 (verify/refine) failed for ghost",
        ghost.id,
        e,
      );
      ghost.whatIsKnown = rawWhatIsKnown;
      ghost.whatIsKnownSourceRefs = sources;
      ghost.droppedClaimsCount = null;
    }
  }
}

export type RunAiFlowResult =
  | { ok: true }
  | { ok: false; error: string };

export async function runLacunaAiFlowIngest(): Promise<RunAiFlowResult> {
  let apiKey: string;
  try {
    apiKey = resolveGeminiApiKey();
  } catch (e) {
    if (e instanceof MissingGeminiApiKeyError) {
      return { ok: false, error: e.message };
    }
    throw e;
  }

  const model = getGeminiModel();
  const systemPrompt = getAiFlowSystemPrompt();

  const works = await getWorks();
  await ensureExcerptPipelineTexts({ apiKey, model, works });
  const ghostByKey = new Map<string, GhostWork>();
  const edgeKeys = new Set<string>();

  try {
    for (const work of works) {
      if (work.excerpts.length === 0) continue;

      const excerptPayload = work.excerpts.map((e) => ({
        id: e.id,
        text: excerptTextForPipeline(e),
      }));

      const userPayload = {
        workId: work.id,
        title: work.title,
        author: work.author,
        excerpts: excerptPayload,
      };

      const raw = await geminiChatCompletionsJsonObject({
        apiKey,
        model,
        systemPrompt,
        userPayload,
      });

      const parsed = parseAiFlowLlmResponse(raw);

      for (const f of parsed.findings) {
        if (!validateExcerptIds(work, f.excerptIds)) {
          continue;
        }
        if (f.title.status === "unknown" && f.author.status === "unknown") {
          continue;
        }
        applyFinding(work.id, f, ghostByKey, edgeKeys);
      }
    }

    const ghostWorks = [...ghostByKey.values()];
    const edges: AiFlowEdge[] = [...edgeKeys].map((line) => {
      const [sourceWorkId, targetGhostId] = line.split("\t");
      return { sourceWorkId, targetGhostId };
    });

    await synthesizeGhostProfiles(apiKey, model, ghostWorks, works);

    await writeLacunaAiFlow({
      ghostWorks,
      edges,
      lastRunAt: new Date().toISOString(),
    });

    return { ok: true };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Analysis flow failed.";
    return { ok: false, error: msg };
  }
}
