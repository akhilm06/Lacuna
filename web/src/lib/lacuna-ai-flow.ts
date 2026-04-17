import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

import {
  isNonWritableFilesystemError,
  READ_ONLY_FILESYSTEM_USER_MESSAGE,
} from "@/lib/fs-non-writable";
import type {
  AiFlowEdge,
  GhostEvidence,
  GhostWhatIsKnownSourceRef,
  GhostWork,
  LacunaAiFlowState,
} from "@/lib/lacuna-ai-flow-model";
import {
  type GhostEpistemicField,
  type GhostKind,
  knownField,
  unknownField,
} from "@/lib/lacuna-epistemic-field";
export type {
  AiFlowEdge,
  GhostEvidence,
  GhostWhatIsKnownSourceRef,
  GhostWork,
  LacunaAiFlowState,
} from "@/lib/lacuna-ai-flow-model";

const DATA_DIR = path.join(/* turbopackIgnore: true */ process.cwd(), "data");
const AI_FLOW_FILE = path.join(DATA_DIR, "lacuna-ai-flow.json");
const STARTER_AI_FLOW_FILE = path.join(DATA_DIR, "lacuna-ai-flow.starter.json");
/** @deprecated Legacy path; still read until migrated. */
const LEGACY_STEP1_FILE = path.join(DATA_DIR, "lacuna-step1.json");

const EMPTY_STATE: LacunaAiFlowState = {
  ghostWorks: [],
  edges: [],
  lastRunAt: null,
};

async function ensureDataDir(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
}

function normalizeState(raw: unknown): LacunaAiFlowState {
  if (!raw || typeof raw !== "object") return { ...EMPTY_STATE };
  const o = raw as Record<string, unknown>;
  const ghostsRaw = o.ghostWorks;
  const edgesRaw = o.edges;
  const ghostWorks: GhostWork[] = Array.isArray(ghostsRaw)
    ? ghostsRaw
        .filter(
          (g): g is GhostWork =>
            !!g &&
            typeof g === "object" &&
            typeof (g as GhostWork).id === "string" &&
            typeof (g as GhostWork).title === "string" &&
            Array.isArray((g as GhostWork).evidence),
        )
        .map((g) => {
          const raw = g as Record<string, unknown>;
          const briefRaw = (g as GhostWork).briefOverview;
          const knownRaw = (g as GhostWork).whatIsKnown;
          const briefOverview =
            briefRaw === null || briefRaw === undefined
              ? null
              : String(briefRaw).trim() || null;
          const whatIsKnown =
            knownRaw === null || knownRaw === undefined
              ? null
              : String(knownRaw).trim() || null;
          const refsRaw = (g as GhostWork).whatIsKnownSourceRefs;
          let whatIsKnownSourceRefs: GhostWhatIsKnownSourceRef[] | null = null;
          if (Array.isArray(refsRaw)) {
            const parsed = refsRaw
              .filter(
                (r): r is GhostWhatIsKnownSourceRef =>
                  !!r &&
                  typeof r === "object" &&
                  typeof (r as GhostWhatIsKnownSourceRef).n === "number" &&
                  typeof (r as GhostWhatIsKnownSourceRef).workId === "string" &&
                  typeof (r as GhostWhatIsKnownSourceRef).title === "string" &&
                  typeof (r as GhostWhatIsKnownSourceRef).author === "string",
              )
              .map((r) => ({
                n: Number((r as GhostWhatIsKnownSourceRef).n),
                workId: String((r as GhostWhatIsKnownSourceRef).workId),
                title: String((r as GhostWhatIsKnownSourceRef).title),
                author: String((r as GhostWhatIsKnownSourceRef).author),
              }))
              .filter((r) => Number.isInteger(r.n) && r.n >= 1);
            if (parsed.length > 0) whatIsKnownSourceRefs = parsed;
          }
          const droppedRaw = (g as GhostWork).droppedClaimsCount;
          let droppedClaimsCount: number | null = null;
          if (typeof droppedRaw === "number" && Number.isFinite(droppedRaw)) {
            const asInt = Math.trunc(droppedRaw);
            if (asInt >= 0) droppedClaimsCount = asInt;
          }
          let titleStr = String((g as GhostWork).title ?? "").trim() || "Untitled";
          let authorStr =
            g.author === null || g.author === undefined
              ? null
              : String(g.author).trim() || null;

          const parseMeta = (v: unknown): GhostEpistemicField | undefined => {
            if (!v || typeof v !== "object") return undefined;
            const om = v as Record<string, unknown>;
            if (om.status === "unknown") return unknownField();
            if (om.status === "known" && typeof om.value === "string") {
              const t = om.value.trim();
              if (t.length > 0) return knownField(t);
            }
            return undefined;
          };

          const titleMeta =
            parseMeta(raw["titleMeta"]) ?? knownField(titleStr);
          const authorMeta =
            parseMeta(raw["authorMeta"]) ??
            (authorStr ? knownField(authorStr) : unknownField());
          let ghostKind: GhostKind = "specific";
          if (raw["ghostKind"] === "adespota") ghostKind = "adespota";
          else if (raw["ghostKind"] === "specific") ghostKind = "specific";
          else {
            const legacyAdespota =
              titleStr === "Untitled lost work(s)" ||
              titleStr.includes("— untitled lost work");
            if (legacyAdespota) ghostKind = "adespota";
          }

          if (
            ghostKind === "specific" &&
            authorMeta.status === "unknown" &&
            titleMeta.status === "known"
          ) {
            ghostKind = "adespota";
            titleStr = "Adespota";
            authorStr = null;
          }

          if (ghostKind === "adespota") {
            if (
              titleStr === "Untitled lost work(s)" ||
              titleStr.includes("— untitled lost work") ||
              titleStr.endsWith("— untitled lost work(s)")
            ) {
              titleStr = "Adespota";
            }
          }

          return {
            id: g.id,
            ghostKind,
            title: titleStr,
            author: authorStr,
            titleMeta,
            authorMeta,
            evidence: Array.isArray(g.evidence)
              ? g.evidence
                  .filter(
                    (e): e is GhostEvidence =>
                      !!e &&
                      typeof e === "object" &&
                      typeof (e as GhostEvidence).workId === "string" &&
                      Array.isArray((e as GhostEvidence).excerptIds),
                  )
                  .map((e) => ({
                    workId: e.workId,
                    excerptIds: e.excerptIds.map(String),
                  }))
              : [],
            briefOverview,
            whatIsKnown,
            whatIsKnownSourceRefs,
            droppedClaimsCount,
          };
        })
    : [];
  const edges: AiFlowEdge[] = Array.isArray(edgesRaw)
    ? edgesRaw
        .filter(
          (e): e is AiFlowEdge =>
            !!e &&
            typeof e === "object" &&
            typeof (e as AiFlowEdge).sourceWorkId === "string" &&
            typeof (e as AiFlowEdge).targetGhostId === "string",
        )
        .map((e) => ({
          sourceWorkId: e.sourceWorkId,
          targetGhostId: e.targetGhostId,
        }))
    : [];
  const lastRunAt =
    o.lastRunAt === null || o.lastRunAt === undefined
      ? null
      : String(o.lastRunAt);
  return { ghostWorks, edges, lastRunAt };
}

function starterAiFlowHasContent(state: LacunaAiFlowState): boolean {
  return (
    state.ghostWorks.length > 0 ||
    state.edges.length > 0 ||
    state.lastRunAt !== null
  );
}

async function readBundledStarterAiFlow(): Promise<LacunaAiFlowState | null> {
  try {
    const raw = await readFile(STARTER_AI_FLOW_FILE, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    return normalizeState(parsed);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return null;
    if (e instanceof SyntaxError) return null;
    throw e;
  }
}

async function readStarterAiFlowForBootstrap(): Promise<LacunaAiFlowState> {
  const bundle = await readBundledStarterAiFlow();
  return bundle ?? { ...EMPTY_STATE };
}

async function readStateFromDisk(): Promise<LacunaAiFlowState> {
  for (const filePath of [AI_FLOW_FILE, LEGACY_STEP1_FILE]) {
    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      return normalizeState(parsed);
    } catch (e) {
      const err = e as NodeJS.ErrnoException;
      if (err.code === "ENOENT") continue;
      throw e;
    }
  }
  return bootstrapAiFlowFromStarterIfMissing();
}

export async function getLacunaAiFlow(): Promise<LacunaAiFlowState> {
  return readStateFromDisk();
}

export async function writeLacunaAiFlow(state: LacunaAiFlowState): Promise<void> {
  await ensureDataDir();
  const payload: LacunaAiFlowState = {
    ghostWorks: state.ghostWorks,
    edges: state.edges,
    lastRunAt: state.lastRunAt,
  };
  await writeFile(
    AI_FLOW_FILE,
    `${JSON.stringify(payload, null, 2)}\n`,
    "utf8",
  );
  try {
    await unlink(LEGACY_STEP1_FILE);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code !== "ENOENT") throw e;
  }
}

async function bootstrapAiFlowFromStarterIfMissing(): Promise<LacunaAiFlowState> {
  const starter = await readStarterAiFlowForBootstrap();
  if (!starterAiFlowHasContent(starter)) return { ...EMPTY_STATE };
  try {
    await writeLacunaAiFlow(starter);
  } catch (e) {
    if (isNonWritableFilesystemError(e)) return starter;
    throw e;
  }
  return starter;
}

export async function restoreAiFlowFromStarter(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const starter = await readBundledStarterAiFlow();
  if (starter === null) {
    return {
      ok: false,
      error:
        "Starter analysis flow file is missing. Add web/data/lacuna-ai-flow.starter.json (ghostWorks, edges, lastRunAt).",
    };
  }
  try {
    await writeLacunaAiFlow(starter);
  } catch (e) {
    if (isNonWritableFilesystemError(e)) {
      return { ok: false, error: READ_ONLY_FILESYSTEM_USER_MESSAGE };
    }
    throw e;
  }
  return { ok: true };
}

export function stateAfterDeletingWork(
  state: LacunaAiFlowState,
  deletedWorkId: string,
): LacunaAiFlowState {
  const nextGhosts: GhostWork[] = [];
  for (const g of state.ghostWorks) {
    const evidence = g.evidence.filter((e) => e.workId !== deletedWorkId);
    if (evidence.length === 0) continue;

    let whatIsKnownSourceRefs = g.whatIsKnownSourceRefs;
    if (whatIsKnownSourceRefs && whatIsKnownSourceRefs.length > 0) {
      const refs = whatIsKnownSourceRefs.filter(
        (r) => r.workId !== deletedWorkId,
      );
      whatIsKnownSourceRefs = refs.length > 0 ? refs : null;
    }

    nextGhosts.push({
      ...g,
      evidence,
      whatIsKnownSourceRefs,
    });
  }

  const keptGhostIds = new Set(nextGhosts.map((x) => x.id));
  const edges = state.edges.filter(
    (e) =>
      e.sourceWorkId !== deletedWorkId && keptGhostIds.has(e.targetGhostId),
  );

  return {
    ghostWorks: nextGhosts,
    edges,
    lastRunAt: state.lastRunAt,
  };
}

export async function pruneLacunaAiFlowForDeletedWork(
  deletedWorkId: string,
): Promise<void> {
  const state = await getLacunaAiFlow();
  await writeLacunaAiFlow(stateAfterDeletingWork(state, deletedWorkId));
}

export async function clearLacunaAiFlow(): Promise<void> {
  await writeLacunaAiFlow({ ...EMPTY_STATE });
}
