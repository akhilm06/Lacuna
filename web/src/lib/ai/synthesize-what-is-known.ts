import type { GhostWhatIsKnownSourceRef } from "@/lib/lacuna-ai-flow-model";

import {
  geminiChatCompletionsJsonObject,
  getWhatIsKnownSystemPrompt,
} from "./chat-completions-json";
import { parseWhatIsKnownLlmResponse } from "./ai-flow-response";
import type { GhostSynthExcerpt } from "./synthesize-brief-overview";

export type SynthesizeWhatIsKnownArgs = {
  apiKey: string;
  model: string;
  ghost: { title: string; author: string | null };
  profileContext: Record<string, string>;
  briefOverview: string | null;
  sources: readonly GhostWhatIsKnownSourceRef[];
  excerpts: readonly GhostSynthExcerpt[];
};

export async function synthesizeWhatIsKnown(
  args: SynthesizeWhatIsKnownArgs,
): Promise<string | null> {
  if (args.sources.length === 0 || args.excerpts.length === 0) return null;

  const userPayload = {
    ghostTitle: args.ghost.title,
    ghostAuthor: args.ghost.author,
    profileContext: args.profileContext,
    briefOverview: args.briefOverview ?? "",
    sources: args.sources.map((s) => ({
      n: s.n,
      workId: s.workId,
      title: s.title,
      author: s.author,
    })),
    excerpts: args.excerpts.map((r) => ({
      sourceN: r.sourceN,
      workId: r.workId,
      workTitle: r.workTitle,
      workAuthor: r.workAuthor,
      excerptId: r.excerptId,
      text: r.text,
    })),
  };

  const raw = await geminiChatCompletionsJsonObject({
    apiKey: args.apiKey,
    model: args.model,
    systemPrompt: getWhatIsKnownSystemPrompt(),
    userPayload,
  });
  const parsed = parseWhatIsKnownLlmResponse(raw);
  const wk = parsed.whatIsKnown.trim();
  return wk.length > 0 ? wk : null;
}
