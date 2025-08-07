import type { streamText } from 'ai';
import * as z from 'zod';
import type { Prettify } from '../types/prettify';

export type SupportedParameter = Prettify<
  | keyof Omit<
      Parameters<typeof streamText>[0],
      | 'system'
      | 'model'
      | 'prompt'
      | 'messages'
      | 'providerOptions'
      | 'prepareStep'
      | 'abortSignal'
      | 'includeRawChunks'
      | `on${string}`
      | `experimental_${string}`
      | `_${string}`
    >
  | 'stop'
  | 'includeReasoning'
  | 'reasoning'
>;

export const SupportedParameter: z.ZodType<
  SupportedParameter,
  SupportedParameter
> = z.enum([
  'activeTools',
  'frequencyPenalty',
  'headers',
  'includeReasoning',
  'maxOutputTokens',
  'maxRetries',
  'presencePenalty',
  'reasoning',
  'seed',
  'stop',
  'stopSequences',
  'stopWhen',
  'temperature',
  'toolChoice',
  'tools',
  'topK',
  'topP',
] as const satisfies SupportedParameter[]);
