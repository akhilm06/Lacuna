import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

const MAX_OPTIONAL_EXCERPT_FIELD_CHARS = 32_000;

export type WorkExcerpt = {
  id: string;
  text: string;
  sourceLang?: string;
  pipelineText?: string;
  detectedSourceLang?: string;
};

export type Work = {
  id: string;
  title: string;
  author: string;
  createdAt: string;
  excerpts: WorkExcerpt[];
};

const worksFilePath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "data",
  "works.json",
);

const starterWorksFilePath = path.join(
  /* turbopackIgnore: true */ process.cwd(),
  "data",
  "works.starter.json",
);

async function ensureDataDir(): Promise<void> {
  await mkdir(path.dirname(worksFilePath), { recursive: true });
}

export function excerptTextForPipeline(e: WorkExcerpt): string {
  const p = e.pipelineText?.trim();
  if (p && p.length > 0) return p;
  return e.text;
}

function normLang(s: string | undefined): string {
  return (s ?? "").trim().toLowerCase().split("-")[0] ?? "";
}

export function excerptMarkedAsPipelineLang(
  e: WorkExcerpt,
  pipelineLang: string,
): boolean {
  const sl = normLang(e.sourceLang);
  if (!sl) return false;
  return sl === normLang(pipelineLang);
}

async function readStarterWorks(): Promise<Work[]> {
  try {
    const raw = await readFile(starterWorksFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeWorkRow)
      .filter(
        (w) =>
          w.id.length > 0 && w.title.length > 0 && w.author.length > 0,
      );
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") return [];
    if (e instanceof SyntaxError) return [];
    throw e;
  }
}

async function bootstrapWorksFromStarterIfMissing(): Promise<Work[]> {
  const starter = await readStarterWorks();
  if (starter.length === 0) return [];
  await ensureDataDir();
  await writeFile(
    worksFilePath,
    `${JSON.stringify(starter, null, 2)}\n`,
    "utf8",
  );
  return starter;
}

export async function getWorks(): Promise<Work[]> {
  try {
    const raw = await readFile(worksFilePath, "utf8");
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeWorkRow);
  } catch (e) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      return bootstrapWorksFromStarterIfMissing();
    }
    throw e;
  }
}

export async function restoreWorksFromStarter(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  const starter = await readStarterWorks();
  if (starter.length === 0) {
    return {
      ok: false,
      error:
        "Starter library is empty or invalid. Edit web/data/works.starter.json (array of works with id, title, author, excerpts).",
    };
  }
  await ensureDataDir();
  await writeFile(
    worksFilePath,
    `${JSON.stringify(starter, null, 2)}\n`,
    "utf8",
  );
  return { ok: true };
}

export async function appendWork(input: {
  title: string;
  author: string;
  excerpts?: WorkExcerpt[];
}): Promise<Work> {
  await ensureDataDir();
  const works = await getWorks();
  const excerpts = sanitizeExcerpts(input.excerpts ?? []);
  const work: Work = {
    id: crypto.randomUUID(),
    title: input.title,
    author: input.author,
    createdAt: new Date().toISOString(),
    excerpts,
  };
  works.push(work);
  await writeFile(worksFilePath, `${JSON.stringify(works, null, 2)}\n`, "utf8");
  return work;
}

function pickOptionalExcerptString(
  v: unknown,
  maxLen: number,
): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (t.length === 0) return undefined;
  return t.length > maxLen ? t.slice(0, maxLen) : t;
}

function normalizeExcerptFromJson(e: WorkExcerpt): WorkExcerpt {
  const id = String(e.id ?? "").trim();
  const text = String(e.text ?? "").trim();
  const sourceLang = pickOptionalExcerptString(
    e.sourceLang,
    MAX_OPTIONAL_EXCERPT_FIELD_CHARS,
  );
  const pipelineText = pickOptionalExcerptString(
    e.pipelineText,
    MAX_OPTIONAL_EXCERPT_FIELD_CHARS,
  );
  const detectedSourceLang = pickOptionalExcerptString(
    e.detectedSourceLang,
    64,
  );
  const out: WorkExcerpt = { id, text };
  if (sourceLang) out.sourceLang = sourceLang;
  if (pipelineText) out.pipelineText = pipelineText;
  if (detectedSourceLang) out.detectedSourceLang = detectedSourceLang;
  return out;
}

function mergeExcerptsPreserveOrInvalidatePipeline(
  previous: WorkExcerpt[],
  incoming: WorkExcerpt[],
): WorkExcerpt[] {
  const prevById = new Map(previous.map((ex) => [ex.id, ex]));
  return incoming.map((e) => {
    const prev = prevById.get(e.id);
    const textNow = e.text.trim();
    const langNow = (e.sourceLang ?? "").trim();
    const langPrev = (prev?.sourceLang ?? "").trim();
    const unchanged =
      prev &&
      prev.text.trim() === textNow &&
      langPrev === langNow;
    if (unchanged && prev) {
      const merged: WorkExcerpt = {
        id: e.id,
        text: textNow,
      };
      if (langNow.length > 0) merged.sourceLang = langNow;
      if (prev.pipelineText?.trim())
        merged.pipelineText = prev.pipelineText.trim();
      if (prev.detectedSourceLang?.trim())
        merged.detectedSourceLang = prev.detectedSourceLang.trim();
      return merged;
    }
    const fresh: WorkExcerpt = { id: e.id, text: textNow };
    if (langNow.length > 0) fresh.sourceLang = langNow;
    return fresh;
  });
}

export async function deleteWorkById(id: string): Promise<boolean> {
  const works = await getWorks();
  const idx = works.findIndex((w) => w.id === id);
  if (idx === -1) return false;
  works.splice(idx, 1);
  await writeFile(worksFilePath, `${JSON.stringify(works, null, 2)}\n`, "utf8");
  return true;
}

export async function updateWorkById(
  id: string,
  patch: { title: string; author: string; excerpts: WorkExcerpt[] },
): Promise<Work | null> {
  const works = await getWorks();
  const idx = works.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  const previous = works[idx];
  const mergedExcerpts = mergeExcerptsPreserveOrInvalidatePipeline(
    previous.excerpts,
    patch.excerpts,
  );
  const updated: Work = {
    ...previous,
    title: patch.title,
    author: patch.author,
    excerpts: sanitizeExcerpts(mergedExcerpts),
  };
  works[idx] = updated;
  await writeFile(worksFilePath, `${JSON.stringify(works, null, 2)}\n`, "utf8");
  return updated;
}

export async function replaceAllWorks(works: readonly Work[]): Promise<void> {
  await ensureDataDir();
  await writeFile(
    worksFilePath,
    `${JSON.stringify([...works], null, 2)}\n`,
    "utf8",
  );
}

function normalizeWorkRow(row: unknown): Work {
  const w = row as Partial<Work> & { excerpts?: unknown };
  const raw = w.excerpts;
  const excerpts: WorkExcerpt[] = Array.isArray(raw)
    ? raw
        .filter(
          (e): e is WorkExcerpt =>
            !!e &&
            typeof e === "object" &&
            typeof (e as WorkExcerpt).id === "string" &&
            typeof (e as WorkExcerpt).text === "string",
        )
        .map((e) => normalizeExcerptFromJson(e))
    : [];
  return {
    id: String(w.id ?? ""),
    title: String(w.title ?? ""),
    author: String(w.author ?? ""),
    createdAt: String(w.createdAt ?? new Date().toISOString()),
    excerpts,
  };
}

function sanitizeExcerpts(excerpts: WorkExcerpt[]): WorkExcerpt[] {
  return excerpts
    .filter((e) => typeof e.id === "string" && e.id.length > 0)
    .map((e) => {
      const base: WorkExcerpt = {
        id: e.id,
        text: e.text.trim(),
      };
      const sl = pickOptionalExcerptString(
        e.sourceLang,
        MAX_OPTIONAL_EXCERPT_FIELD_CHARS,
      );
      if (sl) base.sourceLang = sl;
      const pt = pickOptionalExcerptString(
        e.pipelineText,
        MAX_OPTIONAL_EXCERPT_FIELD_CHARS,
      );
      if (pt) base.pipelineText = pt;
      const dl = pickOptionalExcerptString(e.detectedSourceLang, 64);
      if (dl) base.detectedSourceLang = dl;
      return base;
    })
    .filter((e) => e.text.length > 0);
}

export async function clearAllWorks(): Promise<void> {
  await ensureDataDir();
  await writeFile(worksFilePath, "[]\n", "utf8");
}
