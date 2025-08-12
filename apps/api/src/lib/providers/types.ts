import type { ChatCompletionRequest, ChatCompletionResponse } from '~/core/schemas/openai';
import type {
  ProviderConfig as ProviderConfigSchema,
  ProviderCredentials as ProviderCredentialsSchema,
  ProviderModelInfo as ProviderModelInfoSchema,
  ProviderRequest as ProviderRequestSchema,
  ProviderResponse as ProviderResponseSchema,
  RequestContext as RequestContextSchema,
  TokenUsage as TokenUsageSchema,
} from '~/core/schemas/provider';

// Re-export validated types from schemas
export type ProviderCredentials = ProviderCredentialsSchema;
export type ProviderConfig = ProviderConfigSchema;
export type ProviderModel = ProviderModelInfoSchema;
export type RequestContext = RequestContextSchema;
export type ProviderRequest = ProviderRequestSchema;
export type ProviderResponse = ProviderResponseSchema;
export type TokenUsage = TokenUsageSchema;

export interface ProviderError extends Error {
  code?: string;
  status?: number;
  provider: string;
  retryable: boolean;
  originalError?: unknown;
}

export interface ProviderClient {
  provider: ProviderConfig;
  credentials: ProviderCredentials;

  transformRequest(
    request: ChatCompletionRequest,
    model: ProviderModel,
    context: RequestContext,
  ): ProviderRequest;

  transformResponse(
    response: ProviderResponse,
    model: ProviderModel,
    originalRequest: ChatCompletionRequest,
  ): ChatCompletionResponse;

  makeRequest(request: ProviderRequest): Promise<ProviderResponse>;

  makeStreamingRequest(request: ProviderRequest): Promise<ReadableStream<Uint8Array>>;

  healthCheck(): Promise<boolean>;
}

export interface ProviderFactory {
  createClient(provider: ProviderConfig, credentials: ProviderCredentials): ProviderClient;

  supportsProvider(providerId: string): boolean;
}

export interface StreamingResponse {
  id: string;
  stream: ReadableStream<Uint8Array>;
  controller: ReadableStreamDefaultController<Uint8Array>;
}
