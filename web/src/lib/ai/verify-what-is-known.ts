import {
  geminiChatCompletionsJsonObject,
  getVerifyWhatIsKnownSystemPrompt,
} from "./chat-completions-json";
import {
  parseVerifyWhatIsKnownResponse,
  type VerifyWhatIsKnownResult,
} from "./ai-flow-response";

export type VerifyLineInput = {
  lineId: string;
  claim: string;
  citedExcerpts: {
    sourceN: number;
    excerptId: string;
    text: string;
  }[];
};

export type VerifyOutcome = {
  lineId: string;
  verdict: "supported" | "unsupported";
  quote: string;
  modelVerdict: "supported" | "unsupported";
  reason?: string;
};

function normalizeForSubstring(s: string): string {
  return s.replace(/\s+/g, " ").trim().toLowerCase();
}

function quoteIsSubstringOfAnyCited(
  quote: string,
  cited: readonly { text: string }[],
): boolean {
  const q = normalizeForSubstring(quote);
  if (q.length === 0) return false;
  for (const c of cited) {
    if (normalizeForSubstring(c.text).includes(q)) return true;
  }
  return false;
}

export async function verifyWhatIsKnownLines(args: {
  apiKey: string;
  model: string;
  lines: readonly VerifyLineInput[];
  profileContext?: Record<string, string>;
}): Promise<VerifyOutcome[]> {
  if (args.lines.length === 0) return [];

  const userPayload = {
    ...(args.profileContext ? { profileContext: args.profileContext } : {}),
    lines: args.lines.map((l) => ({
      lineId: l.lineId,
      claim: l.claim,
      citedExcerpts: l.citedExcerpts.map((e) => ({
        sourceN: e.sourceN,
        excerptId: e.excerptId,
        text: e.text,
      })),
    })),
  };

  const raw = await geminiChatCompletionsJsonObject({
    apiKey: args.apiKey,
    model: args.model,
    systemPrompt: getVerifyWhatIsKnownSystemPrompt(),
    userPayload,
  });
  const parsed = parseVerifyWhatIsKnownResponse(raw);

  const byLineId = new Map<string, VerifyWhatIsKnownResult>();
  for (const r of parsed.results) {
    if (!byLineId.has(r.lineId)) byLineId.set(r.lineId, r);
  }

  const out: VerifyOutcome[] = [];
  for (const line of args.lines) {
    const r = byLineId.get(line.lineId);
    if (!r) {
      out.push({
        lineId: line.lineId,
        verdict: "unsupported",
        quote: "",
        modelVerdict: "unsupported",
        reason: "verifier returned no result for this line",
      });
      continue;
    }
    const modelVerdict = r.verdict;
    const quoteRaw = r.quote.trim();
    const quoteOk =
      modelVerdict === "supported" &&
      quoteRaw.length > 0 &&
      quoteIsSubstringOfAnyCited(quoteRaw, line.citedExcerpts);
    out.push({
      lineId: line.lineId,
      verdict: quoteOk ? "supported" : "unsupported",
      quote: quoteOk ? quoteRaw : "",
      modelVerdict,
      reason: r.reason,
    });
  }
  return out;
}
