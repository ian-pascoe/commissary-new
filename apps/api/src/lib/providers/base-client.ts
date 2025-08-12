import type {
  ProviderClient,
  ProviderConfig,
  ProviderCredentials,
  ProviderRequest,
  ProviderResponse,
  ProviderError,
  RequestContext,
  ProviderModel,
} from './types';
import type { ChatCompletionRequest, ChatCompletionResponse } from '~/core/schemas/openai';
import {
  ProviderRequest as ProviderRequestSchema,
  ProviderResponse as ProviderResponseSchema,
} from '~/core/schemas/provider';

export abstract class BaseProviderClient implements ProviderClient {
  constructor(
    public provider: ProviderConfig,
    public credentials: ProviderCredentials,
  ) {}

  abstract transformRequest(
    request: ChatCompletionRequest,
    model: ProviderModel,
    context: RequestContext,
  ): ProviderRequest;

  abstract transformResponse(
    response: ProviderResponse,
    model: ProviderModel,
    originalRequest: ChatCompletionRequest,
  ): ChatCompletionResponse;

  async makeStreamingRequest(request: ProviderRequest): Promise<ReadableStream<Uint8Array>> {
    // Validate request before making it
    const requestValidation = ProviderRequestSchema.safeParse(request);
    if (!requestValidation.success) {
      throw this.createProviderError(
        `Invalid provider request: ${requestValidation.error.message}`,
        'INVALID_REQUEST',
        400,
        requestValidation.error,
        false,
      );
    }

    try {
      const controller = new AbortController();
      const timeoutId = request.timeout
        ? setTimeout(() => controller.abort(), request.timeout)
        : null;

      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      if (!response.ok) {
        const errorBody = await response.text();
        throw this.createProviderError(
          `HTTP ${response.status}: ${errorBody}`,
          'HTTP_ERROR',
          response.status,
          null,
          response.status >= 500,
        );
      }

      if (!response.body) {
        throw this.createProviderError(
          'No response body for streaming request',
          'NO_STREAM',
          500,
          null,
          false,
        );
      }

      return response.body;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createProviderError('Request timeout', 'TIMEOUT', 408, error, false);
      }

      // Re-throw provider errors as-is
      if (error instanceof Error && 'provider' in error) {
        throw error;
      }

      throw this.createProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        'NETWORK_ERROR',
        0,
        error,
        true,
      );
    }
  }

  async makeRequest(request: ProviderRequest): Promise<ProviderResponse> {
    // Validate request before making it
    const requestValidation = ProviderRequestSchema.safeParse(request);
    if (!requestValidation.success) {
      throw this.createProviderError(
        `Invalid provider request: ${requestValidation.error.message}`,
        'INVALID_REQUEST',
        400,
        requestValidation.error,
        false,
      );
    }

    const startTime = performance.now();

    try {
      const controller = new AbortController();
      const timeoutId = request.timeout
        ? setTimeout(() => controller.abort(), request.timeout)
        : null;

      const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body ? JSON.stringify(request.body) : undefined,
        signal: controller.signal,
      });

      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      const latencyMs = performance.now() - startTime;
      const body = await response.json();

      const providerResponse: ProviderResponse = {
        status: response.status,
        statusText: response.statusText,
        headers: Object.fromEntries(response.headers.entries()),
        body,
        latencyMs,
      };

      // Validate response before returning it
      const responseValidation = ProviderResponseSchema.safeParse(providerResponse);
      if (!responseValidation.success) {
        throw this.createProviderError(
          `Invalid provider response: ${responseValidation.error.message}`,
          'INVALID_RESPONSE',
          500,
          responseValidation.error,
          false,
        );
      }

      return responseValidation.data;
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw this.createProviderError('Request timeout', 'TIMEOUT', 408, error, false);
      }

      // Re-throw provider errors as-is
      if (error instanceof Error && 'provider' in error) {
        throw error;
      }

      throw this.createProviderError(
        error instanceof Error ? error.message : 'Unknown error',
        'NETWORK_ERROR',
        0,
        error,
        true,
      );
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      const healthRequest: ProviderRequest = {
        method: 'GET',
        url: this.getHealthCheckUrl(),
        headers: this.getAuthHeaders(),
        timeout: 5000,
      };

      const response = await this.makeRequest(healthRequest);
      return response.status >= 200 && response.status < 300;
    } catch {
      return false;
    }
  }

  protected createProviderError(
    message: string,
    code: string,
    status: number,
    originalError?: unknown,
    retryable: boolean = false,
  ): ProviderError {
    const error = new Error(message) as ProviderError;
    error.code = code;
    error.status = status;
    error.provider = this.provider.slug;
    error.retryable = retryable;
    error.originalError = originalError;
    return error;
  }

  protected getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'commissary/1.0.0',
    };

    switch (this.credentials.type) {
      case 'api-key':
        headers.Authorization = `Bearer ${this.credentials.value}`;
        break;
      case 'oauth':
        headers.Authorization = `Bearer ${this.credentials.value}`;
        break;
      case 'aws':
        // AWS signing would be implemented here
        break;
      case 'custom':
        // Custom auth logic would be implemented here
        break;
    }

    return headers;
  }

  protected getBaseUrl(): string {
    return this.provider.baseUrl || '';
  }

  protected getHealthCheckUrl(): string {
    // Default health check - can be overridden by providers
    return `${this.getBaseUrl()}/health`;
  }

  protected applyParameterMapping(
    request: ChatCompletionRequest,
    mapping: Record<string, string>,
  ): Record<string, unknown> {
    const transformedParams: Record<string, unknown> = {};

    // Map OpenAI parameters to provider-specific parameters
    if (request.max_tokens && mapping.maxOutputTokens) {
      transformedParams[mapping.maxOutputTokens] = request.max_tokens;
    }

    if (request.temperature !== undefined && mapping.temperature) {
      transformedParams[mapping.temperature] = request.temperature;
    }

    if (request.top_p !== undefined && mapping.topP) {
      transformedParams[mapping.topP] = request.top_p;
    }

    if (request.frequency_penalty !== undefined && mapping.frequencyPenalty) {
      transformedParams[mapping.frequencyPenalty] = request.frequency_penalty;
    }

    if (request.presence_penalty !== undefined && mapping.presencePenalty) {
      transformedParams[mapping.presencePenalty] = request.presence_penalty;
    }

    if (request.stream !== undefined && mapping.stream) {
      transformedParams[mapping.stream] = request.stream;
    }

    if (request.seed !== undefined && mapping.seed) {
      transformedParams[mapping.seed] = request.seed;
    }

    if (request.response_format && mapping.responseFormat) {
      transformedParams[mapping.responseFormat] = request.response_format;
    }

    if (request.logit_bias && mapping.logitBias) {
      transformedParams[mapping.logitBias] = request.logit_bias;
    }

    return transformedParams;
  }

  protected generateRequestId(): string {
    return `chatcmpl-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  }

  protected getCurrentTimestamp(): number {
    return Math.floor(Date.now() / 1000);
  }
}
