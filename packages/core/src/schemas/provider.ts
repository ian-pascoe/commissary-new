import * as z from 'zod';
import { ParameterMapping } from './parameter-mapping';
import { Metadata } from './metadata';

// Provider HTTP Request/Response schemas
export const ProviderRequest = z.object({
  method: z.enum(['POST', 'GET', 'PUT', 'DELETE']),
  url: z.string().min(1),
  headers: z.record(z.string(), z.string()),
  body: z.unknown().optional(),
  timeout: z.number().positive().optional(),
});
export type ProviderRequest = z.infer<typeof ProviderRequest>;

export const ProviderResponse = z.object({
  status: z.number().int().min(100).max(599),
  statusText: z.string(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown(),
  latencyMs: z.number().nonnegative(),
});
export type ProviderResponse = z.infer<typeof ProviderResponse>;

// Provider configuration schemas
export const ProviderCredentials = z.object({
  type: z.enum(['api-key', 'oauth', 'aws', 'custom']),
  value: z.string(),
  region: z.string().optional(),
  orgExternalId: z.string().optional(),
  metadata: Metadata.optional(),
});
export type ProviderCredentials = z.infer<typeof ProviderCredentials>;

export const ProviderConfig = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  baseUrl: z.string().min(1).optional(),
  status: z.enum(['active', 'degraded', 'disabled']),
  metadata: Metadata.optional(),
});
export type ProviderConfig = z.infer<typeof ProviderConfig>;

export const ProviderModelInfo = z.object({
  id: z.string(),
  providerId: z.string(),
  modelId: z.string(),
  slug: z.string(),
  endpointPath: z.string().optional(),
  maxOutputTokens: z.number().int().positive().optional(),
  tokenizer: z.string().optional(),
  parameterMapping: ParameterMapping.optional(),
  metadata: Metadata.optional(),
});
export type ProviderModelInfo = z.infer<typeof ProviderModelInfo>;

// Request context schema
export const RequestContext = z.object({
  teamId: z.string(),
  environmentId: z.string(),
  apiKeyId: z.string().optional(),
  userId: z.string().optional(),
  ip: z.string().optional(),
  userAgent: z.string().optional(),
});
export type RequestContext = z.infer<typeof RequestContext>;

// OpenAI API specific response schemas
export const OpenAIUsage = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  completion_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
  prompt_tokens_details: z
    .object({
      cached_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
  completion_tokens_details: z
    .object({
      reasoning_tokens: z.number().int().nonnegative().optional(),
    })
    .optional(),
});
export type OpenAIUsage = z.infer<typeof OpenAIUsage>;

// Embeddings usage schema for OpenAI
export const OpenAIEmbeddingUsage = z.object({
  prompt_tokens: z.number().int().nonnegative(),
  total_tokens: z.number().int().nonnegative(),
});
export type OpenAIEmbeddingUsage = z.infer<typeof OpenAIEmbeddingUsage>;

// Embedding response schema for OpenAI
export const OpenAIEmbedding = z.object({
  object: z.literal('embedding'),
  embedding: z.array(z.number()),
  index: z.number().int().nonnegative(),
});
export type OpenAIEmbedding = z.infer<typeof OpenAIEmbedding>;

export const OpenAIEmbeddingResponse = z.object({
  object: z.literal('list'),
  data: z.array(OpenAIEmbedding),
  model: z.string(),
  usage: OpenAIEmbeddingUsage,
});
export type OpenAIEmbeddingResponse = z.infer<typeof OpenAIEmbeddingResponse>;

export const OpenAIChoice = z.object({
  index: z.number().int().nonnegative(),
  message: z.object({
    role: z.literal('assistant'),
    content: z.string().nullable(),
    tool_calls: z
      .array(
        z.object({
          id: z.string(),
          type: z.literal('function'),
          function: z.object({
            name: z.string(),
            arguments: z.string(),
          }),
        }),
      )
      .optional(),
    function_call: z
      .object({
        name: z.string(),
        arguments: z.string(),
      })
      .optional(),
  }),
  finish_reason: z
    .enum(['stop', 'length', 'tool_calls', 'content_filter', 'function_call'])
    .nullable(),
  logprobs: z
    .object({
      content: z
        .array(
          z.object({
            token: z.string(),
            logprob: z.number(),
            bytes: z.array(z.number()).nullable(),
            top_logprobs: z.array(
              z.object({
                token: z.string(),
                logprob: z.number(),
                bytes: z.array(z.number()).nullable(),
              }),
            ),
          }),
        )
        .nullable(),
    })
    .nullable()
    .optional(),
});
export type OpenAIChoice = z.infer<typeof OpenAIChoice>;

export const OpenAIApiResponse = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number().int().positive(),
  model: z.string(),
  choices: z.array(OpenAIChoice),
  usage: OpenAIUsage.optional(),
  system_fingerprint: z.string().optional(),
});
export type OpenAIApiResponse = z.infer<typeof OpenAIApiResponse>;

// Error schemas
export const ProviderError = z.object({
  message: z.string(),
  code: z.string().optional(),
  status: z.number().int().optional(),
  provider: z.string(),
  retryable: z.boolean(),
  originalError: z.unknown().optional(),
});
export type ProviderError = z.infer<typeof ProviderError>;

// Parameter mapping validation
export const TransformedParameters = z.record(z.string(), z.unknown());
export type TransformedParameters = z.infer<typeof TransformedParameters>;

// Provider client factory schemas
export const SupportedProviders = z.enum(['openai', 'anthropic', 'google-ai', 'cohere']);
export type SupportedProviders = z.infer<typeof SupportedProviders>;

// Supported endpoints enum
export const SupportedEndpoints = z.enum([
  'chat/completions',
  'embeddings',
  'images/generations',
  'models',
]);
export type SupportedEndpoints = z.infer<typeof SupportedEndpoints>;

// Token usage schema
export const TokenUsage = z.object({
  promptTokens: z.number().int().nonnegative(),
  completionTokens: z.number().int().nonnegative(),
  totalTokens: z.number().int().nonnegative(),
});
export type TokenUsage = z.infer<typeof TokenUsage>;
