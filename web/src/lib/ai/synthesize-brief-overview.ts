import type { GhostWhatIsKnownSourceRef } from "@/lib/lacuna-ai-flow-model";

import {
  geminiChatCompletionsJsonObject,
  getBriefOverviewSystemPrompt,
} from "./chat-completions-json";
import { parseBriefOverviewLlmResponse } from "./ai-flow-response";

export type GhostSynthExcerpt = {
  sourceN: number;
  workId: string;
  workTitle: string;
  workAuthor: string;
  excerptId: string;
  text: string;
};

export type SynthesizeBriefOverviewArgs = {
  apiKey: string;
  model: string;
  ghost: { title: string; author: string | null };
  profileContext: Record<string, string>;
  sources: readonly GhostWhatIsKnownSourceRef[];
  excerpts: readonly GhostSynthExcerpt[];
};

export async function synthesizeBriefOverview(
  args: SynthesizeBriefOverviewArgs,
): Promise<string | null> {
  if (args.sources.length === 0 || args.excerpts.length === 0) return null;

  const userPayload = {
    ghostTitle: args.ghost.title,
    ghostAuthor: args.ghost.author,
    profileContext: args.profileContext,
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
    systemPrompt: getBriefOverviewSystemPrompt(),
    userPayload,
  });
  const parsed = parseBriefOverviewLlmResponse(raw);
  const bo = parsed.briefOverview.trim();
  return bo.length > 0 ? bo : null;
}
