import { z } from "zod";

const epistemicStringSchema = z.discriminatedUnion("status", [
  z.object({ status: z.literal("unknown") }),
  z.object({
    status: z.literal("known"),
    value: z.string().min(1).max(500),
  }),
]);

export const aiFlowFindingSchema = z.object({
  title: epistemicStringSchema,
  author: epistemicStringSchema,
  excerptIds: z.array(z.string().min(1)).min(1),
});

export const aiFlowLlmResponseSchema = z.object({
  findings: z.array(aiFlowFindingSchema),
});

export type AiFlowLlmFinding = z.infer<typeof aiFlowFindingSchema>;
export type AiFlowLlmResponse = z.infer<typeof aiFlowLlmResponseSchema>;

export function parseAiFlowLlmResponse(data: unknown): AiFlowLlmResponse {
  return aiFlowLlmResponseSchema.parse(data);
}

export const briefOverviewLlmResponseSchema = z.object({
  briefOverview: z.string().max(400),
});
export type BriefOverviewLlmResponse = z.infer<
  typeof briefOverviewLlmResponseSchema
>;
export function parseBriefOverviewLlmResponse(
  data: unknown,
): BriefOverviewLlmResponse {
  return briefOverviewLlmResponseSchema.parse(data);
}

export const whatIsKnownLlmResponseSchema = z.object({
  whatIsKnown: z.string().max(4000),
});
export type WhatIsKnownLlmResponse = z.infer<
  typeof whatIsKnownLlmResponseSchema
>;
export function parseWhatIsKnownLlmResponse(
  data: unknown,
): WhatIsKnownLlmResponse {
  return whatIsKnownLlmResponseSchema.parse(data);
}

export const verifyWhatIsKnownResultSchema = z.object({
  lineId: z.string().min(1),
  verdict: z.enum(["supported", "unsupported"]),
  quote: z.string().max(2000),
  reason: z.string().max(1000).optional(),
});
export const verifyWhatIsKnownResponseSchema = z.object({
  results: z.array(verifyWhatIsKnownResultSchema),
});
export type VerifyWhatIsKnownResult = z.infer<
  typeof verifyWhatIsKnownResultSchema
>;
export type VerifyWhatIsKnownResponse = z.infer<
  typeof verifyWhatIsKnownResponseSchema
>;
export function parseVerifyWhatIsKnownResponse(
  data: unknown,
): VerifyWhatIsKnownResponse {
  return verifyWhatIsKnownResponseSchema.parse(data);
}

export const refineWhatIsKnownReplacementSchema = z.object({
  lineId: z.string().min(1),
  newLine: z.union([z.string().max(1000), z.null()]),
});
export const refineWhatIsKnownResponseSchema = z.object({
  replacements: z.array(refineWhatIsKnownReplacementSchema),
});
export type RefineWhatIsKnownReplacement = z.infer<
  typeof refineWhatIsKnownReplacementSchema
>;
export type RefineWhatIsKnownResponse = z.infer<
  typeof refineWhatIsKnownResponseSchema
>;
export function parseRefineWhatIsKnownResponse(
  data: unknown,
): RefineWhatIsKnownResponse {
  return refineWhatIsKnownResponseSchema.parse(data);
}
