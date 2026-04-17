import {
  geminiChatCompletionsJsonObject,
  getRefineWhatIsKnownSystemPrompt,
} from "./chat-completions-json";
import {
  parseRefineWhatIsKnownResponse,
  type RefineWhatIsKnownReplacement,
} from "./ai-flow-response";

export type RefineLineInput = {
  lineId: string;
  originalLine: string;
  claim: string;
  citedSourceNs: number[];
  citedExcerpts: {
    sourceN: number;
    excerptId: string;
    text: string;
  }[];
  reason?: string;
};

export type RefineOutcome = {
  lineId: string;
  newLine: string | null;
};

export async function refineWhatIsKnownLines(args: {
  apiKey: string;
  model: string;
  lines: readonly RefineLineInput[];
  profileContext?: Record<string, string>;
}): Promise<RefineOutcome[]> {
  if (args.lines.length === 0) return [];

  const userPayload = {
    ...(args.profileContext ? { profileContext: args.profileContext } : {}),
    lines: args.lines.map((l) => ({
      lineId: l.lineId,
      originalLine: l.originalLine,
      claim: l.claim,
      citedSourceNs: l.citedSourceNs,
      citedExcerpts: l.citedExcerpts.map((e) => ({
        sourceN: e.sourceN,
        excerptId: e.excerptId,
        text: e.text,
      })),
      reason: l.reason ?? "",
    })),
  };

  const raw = await geminiChatCompletionsJsonObject({
    apiKey: args.apiKey,
    model: args.model,
    systemPrompt: getRefineWhatIsKnownSystemPrompt(),
    userPayload,
  });
  const parsed = parseRefineWhatIsKnownResponse(raw);

  const byLineId = new Map<string, RefineWhatIsKnownReplacement>();
  for (const r of parsed.replacements) {
    if (!byLineId.has(r.lineId)) byLineId.set(r.lineId, r);
  }

  const out: RefineOutcome[] = [];
  for (const line of args.lines) {
    const r = byLineId.get(line.lineId);
    if (!r) {
      out.push({ lineId: line.lineId, newLine: null });
      continue;
    }
    if (r.newLine === null) {
      out.push({ lineId: line.lineId, newLine: null });
      continue;
    }
    const trimmed = r.newLine.trim();
    out.push({
      lineId: line.lineId,
      newLine: trimmed.length > 0 ? trimmed : null,
    });
  }
  return out;
}
