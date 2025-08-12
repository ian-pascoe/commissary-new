import * as z from 'zod';

export const ParameterMapping = z.object({
  maxOutputTokens: z.optional(z.string()),
  temperature: z.optional(z.string()),
  topP: z.optional(z.string()),
  minP: z.optional(z.string()),
  topK: z.optional(z.string()),
  topA: z.optional(z.string()),
  frequencyPenalty: z.optional(z.string()),
  repetitionPenalty: z.optional(z.string()),
  presencePenalty: z.optional(z.string()),
  responseFormat: z.optional(z.string()),
  logitBias: z.optional(z.string()),
  topLogprobs: z.optional(z.string()),
  reasoning: z.optional(z.string()),
  stream: z.optional(z.string()),
  seed: z.optional(z.string()),
  webSearchOptions: z.optional(z.string()),
});
export type ParameterMapping = z.infer<typeof ParameterMapping>;
