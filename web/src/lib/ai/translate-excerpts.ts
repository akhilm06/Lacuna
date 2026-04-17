import { excerptMarkedAsPipelineLang, type Work, replaceAllWorks } from "@/lib/works";

import { getPipelineLang } from "./config";
import { geminiChatCompletionsJsonObject } from "./chat-completions-json";

const TRANSLATE_BATCH_TEXT_CHAR_BUDGET = 28_000;

export function excerptKey(workId: string, excerptId: string): string {
  return `${workId}\t${excerptId}`;
}

function parseExcerptKey(key: string): { workId: string; excerptId: string } {
  const tab = key.indexOf("\t");
  if (tab <= 0) throw new Error(`Invalid excerptKey: ${key}`);
  return { workId: key.slice(0, tab), excerptId: key.slice(tab + 1) };
}

function pipelinePrimaryTag(pipelineLang: string): string {
  return pipelineLang.trim().toLowerCase().split("-")[0] || "en";
}

function applyEnglishSentenceCase(s: string): string {
  const t = s.trim();
  if (!t) return s;
  let out = t;
  const c0 = out[0];
  if (c0 >= "a" && c0 <= "z") {
    out = c0.toUpperCase() + out.slice(1);
  }
  out = out.replace(/([.!?])(\s+)([a-z])/g, (full, punct, ws, letter, offset) => {
    const before = out.slice(0, offset).trimEnd();
    if (
      /(e\.g|i\.e|cf\.|viz\.|vs\.|etc\.|al\.)$/i.test(before) ||
      /(?:^|\s)(Mr|Mrs|Ms|Mx|Dr|Prof|St)\s*$/i.test(before) ||
      /(?:^|\s)([A-Z])$/i.test(before)
    ) {
      return full;
    }
    return punct + ws + letter.toUpperCase();
  });
  return out;
}

function normalizePipelineTranslation(
  text: string,
  pipelineLang: string,
): string {
  const t = text.trim();
  if (!t) return text;
  if (pipelinePrimaryTag(pipelineLang) === "en") {
    return applyEnglishSentenceCase(t);
  }
  return t;
}

const TRANSLATE_SYSTEM_PROMPT = `You are a precise literary translation assistant for a scholarly corpus tool.

The user message is JSON: { "pipelineLang": string, "items": [ { "excerptKey": string, "text": string, "sourceLangOverride": string | null } ] }.

For EVERY item you MUST output exactly one result object with the same excerptKey.

Rules:
- Detect the language of "text" and return it as detectedSourceLang (BCP-47 primary tag preferred: en, de, fr, la, el, etc.).
- If sourceLangOverride is a non-empty string, treat that as the source language instead of guessing (still translate into pipelineLang unless it already matches).
- If the text is already in pipelineLang (the target), set translatedText to the same text (trim internal whitespace runs only if needed) and detectedSourceLang to pipelineLang.
- Otherwise translate into pipelineLang faithfully. Preserve meaning; keep proper names; do not add commentary.

Capitalization and typography (critical):
- Follow normal orthography for pipelineLang. When pipelineLang is English (en): use standard English capitalization—capitalize the first word of each sentence; capitalize proper nouns (names of persons, places, and well-known works when they are normally capitalized in English scholarly prose); do not output all-lowercase or all-caps body text unless the source deliberately uses that style.
- When pipelineLang is not English, apply the usual capitalization rules for that language (e.g. German nouns capitalized).

Respond with JSON only, shape:
{ "results": [ { "excerptKey": string, "detectedSourceLang": string, "translatedText": string } ] }
No other keys. The results array must have the same length as items and cover every excerptKey exactly once.`;

type TranslateItem = {
  excerptKey: string;
  text: string;
  sourceLangOverride: string | null;
};

function parseTranslateResponse(raw: unknown): Map<string, { detectedSourceLang: string; translatedText: string }> {
  if (!raw || typeof raw !== "object") {
    throw new Error("Translate response: expected object.");
  }
  const r = raw as { results?: unknown };
  if (!Array.isArray(r.results)) {
    throw new Error('Translate response: missing "results" array.');
  }
  const out = new Map<string, { detectedSourceLang: string; translatedText: string }>();
  for (const row of r.results) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const key =
      typeof o.excerptKey === "string" ? o.excerptKey.trim() : "";
    const detectedSourceLang =
      typeof o.detectedSourceLang === "string" ? o.detectedSourceLang.trim() : "";
    const translatedText =
      typeof o.translatedText === "string" ? o.translatedText : "";
    if (!key || !detectedSourceLang) {
      throw new Error("Translate response: invalid result row.");
    }
    out.set(key, { detectedSourceLang, translatedText });
  }
  return out;
}

function fallbackPipelineResult(
  it: TranslateItem,
  pipelineLang: string,
): { detectedSourceLang: string; translatedText: string } {
  return {
    detectedSourceLang: pipelineLang,
    translatedText: normalizePipelineTranslation(it.text.trim(), pipelineLang),
  };
}

async function translateBatchOnce(
  apiKey: string,
  model: string,
  pipelineLang: string,
  items: TranslateItem[],
): Promise<Map<string, { detectedSourceLang: string; translatedText: string }>> {
  if (items.length === 0) {
    return new Map();
  }
  const raw = await geminiChatCompletionsJsonObject({
    apiKey,
    model,
    systemPrompt: TRANSLATE_SYSTEM_PROMPT,
    userPayload: { pipelineLang, items },
  });
  return parseTranslateResponse(raw);
}

async function translateBatch(
  apiKey: string,
  model: string,
  pipelineLang: string,
  items: TranslateItem[],
): Promise<Map<string, { detectedSourceLang: string; translatedText: string }>> {
  if (items.length === 0) {
    return new Map();
  }
  const map = await translateBatchOnce(apiKey, model, pipelineLang, items);
  const missing = items.filter((it) => !map.has(it.excerptKey));
  if (missing.length === 0) {
    return map;
  }

  // Gemini sometimes drops rows in larger batches; retry each missing excerpt alone.
  for (const it of missing) {
    try {
      const one = await translateBatchOnce(apiKey, model, pipelineLang, [it]);
      const v = one.get(it.excerptKey);
      if (v) {
        map.set(it.excerptKey, v);
      } else {
        console.warn(
          "[lacuna] Translate single-item retry still missing key; using pipeline fallback.",
          it.excerptKey.slice(0, 64),
        );
        map.set(it.excerptKey, fallbackPipelineResult(it, pipelineLang));
      }
    } catch (e) {
      console.error(
        "[lacuna] Translate single-item retry failed; using pipeline fallback.",
        it.excerptKey.slice(0, 64),
        e,
      );
      map.set(it.excerptKey, fallbackPipelineResult(it, pipelineLang));
    }
  }

  return map;
}

function itemCharWeight(it: TranslateItem): number {
  return it.text.length + it.excerptKey.length + 32;
}

export async function ensureExcerptPipelineTexts(args: {
  apiKey: string;
  model: string;
  works: Work[];
}): Promise<void> {
  const pipelineLang = getPipelineLang();
  let dirty = false;

  const pending: TranslateItem[] = [];
  let batchSize = 0;

  const flush = async () => {
    if (pending.length === 0) return;
    const batch = pending.splice(0, pending.length);
    batchSize = 0;
    const map = await translateBatch(args.apiKey, args.model, pipelineLang, batch);
    for (const it of batch) {
      const v = map.get(it.excerptKey);
      if (!v) continue;
      const { workId, excerptId } = parseExcerptKey(it.excerptKey);
      const work = args.works.find((w) => w.id === workId);
      if (!work) continue;
      const ex = work.excerpts.find((e) => e.id === excerptId);
      if (!ex) continue;
      ex.detectedSourceLang = v.detectedSourceLang;
      ex.pipelineText = normalizePipelineTranslation(
        v.translatedText,
        pipelineLang,
      );
      dirty = true;
    }
  };

  for (const work of args.works) {
    for (const ex of work.excerpts) {
      const pt = ex.pipelineText?.trim();
      if (pt && pt.length > 0) {
        continue;
      }

      if (excerptMarkedAsPipelineLang(ex, pipelineLang)) {
        ex.pipelineText = normalizePipelineTranslation(
          ex.text.trim(),
          pipelineLang,
        );
        ex.detectedSourceLang = pipelineLang;
        dirty = true;
        continue;
      }

      const it: TranslateItem = {
        excerptKey: excerptKey(work.id, ex.id),
        text: ex.text,
        sourceLangOverride: ex.sourceLang?.trim() || null,
      };
      const w = itemCharWeight(it);
      if (
        pending.length > 0 &&
        batchSize + w > TRANSLATE_BATCH_TEXT_CHAR_BUDGET
      ) {
        await flush();
      }
      pending.push(it);
      batchSize += w;
    }
  }

  await flush();

  if (dirty) {
    await replaceAllWorks(args.works);
  }
}
