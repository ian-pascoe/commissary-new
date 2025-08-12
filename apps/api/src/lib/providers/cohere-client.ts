import { BaseProviderClient } from './base-client';
import type { ProviderRequest, ProviderResponse, RequestContext, ProviderModel } from './types';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatMessage,
} from '~/core/schemas/openai';
import {
  ProviderRequest as ProviderRequestSchema,
  ProviderResponse as ProviderResponseSchema,
} from '~/core/schemas/provider';

interface CohereMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface CohereRequest {
  model: string;
  messages: CohereMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  stop_sequences?: string[];
  frequency_penalty?: number;
  presence_penalty?: number;
  k?: number;
  p?: number;
}

interface CohereUsage {
  input_tokens: number;
  output_tokens: number;
}

interface CohereResponse {
  id: string;
  message: {
    role: 'assistant';
    content: Array<{
      type: 'text';
      text: string;
    }>;
  };
  finish_reason:
    | 'COMPLETE'
    | 'MAX_TOKENS'
    | 'ERROR'
    | 'ERROR_TOXIC'
    | 'ERROR_LIMIT'
    | 'USER_CANCEL';
  usage?: CohereUsage;
}

export class CohereProviderClient extends BaseProviderClient {
  override transformRequest(
    request: ChatCompletionRequest,
    model: ProviderModel,
    _context: RequestContext,
  ): ProviderRequest {
    const url = `${this.getBaseUrl()}/v2/chat`;

    // Convert OpenAI format to Cohere format
    const cohereRequest = this.convertToCohereFormat(request, model);

    const providerRequest: ProviderRequest = {
      method: 'POST',
      url,
      headers: this.getAuthHeaders(),
      body: cohereRequest,
      timeout: 60000, // 60 second timeout
    };

    // Validate the request with our schema
    const validationResult = ProviderRequestSchema.safeParse(providerRequest);
    if (!validationResult.success) {
      throw this.createProviderError(
        `Invalid provider request: ${validationResult.error.message}`,
        'INVALID_REQUEST',
        400,
        validationResult.error,
        false,
      );
    }

    return validationResult.data;
  }

  override transformResponse(
    response: ProviderResponse,
    _model: ProviderModel,
    originalRequest: ChatCompletionRequest,
  ): ChatCompletionResponse {
    // First validate the provider response structure
    const responseValidation = ProviderResponseSchema.safeParse(response);
    if (!responseValidation.success) {
      throw this.createProviderError(
        `Invalid provider response structure: ${responseValidation.error.message}`,
        'INVALID_RESPONSE',
        500,
        responseValidation.error,
        false,
      );
    }

    if (response.status !== 200) {
      throw this.createProviderError(
        `Cohere API error: ${response.statusText}`,
        'API_ERROR',
        response.status,
        response.body,
        response.status >= 500 || response.status === 429,
      );
    }

    const data = response.body as CohereResponse;

    // Convert Cohere response to OpenAI format
    return this.convertFromCohereFormat(data, originalRequest);
  }

  private convertToCohereFormat(
    request: ChatCompletionRequest,
    model: ProviderModel,
  ): CohereRequest {
    // Apply parameter mapping if available
    const transformedParams = model.parameterMapping
      ? this.applyParameterMapping(request, model.parameterMapping)
      : {};

    // Convert messages to Cohere format
    const messages = this.convertMessages(request.messages);

    // Build the request
    const cohereRequest: CohereRequest = {
      model: model.slug,
      messages,
      ...transformedParams,
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      ...(request.max_tokens && { max_tokens: request.max_tokens }),
      ...(request.stream !== undefined && { stream: request.stream }),
      ...(request.stop && {
        stop_sequences: Array.isArray(request.stop) ? request.stop : [request.stop],
      }),
      ...(request.frequency_penalty !== undefined && {
        frequency_penalty: request.frequency_penalty,
      }),
      ...(request.presence_penalty !== undefined && { presence_penalty: request.presence_penalty }),
      ...(request.top_p !== undefined && { p: request.top_p }), // Cohere uses 'p' instead of 'top_p'
    };

    return cohereRequest;
  }

  private convertMessages(messages: ChatMessage[]): CohereMessage[] {
    const cohereMessages: CohereMessage[] = [];

    for (const message of messages) {
      if (message.role === 'system' || message.role === 'user' || message.role === 'assistant') {
        const content = this.extractTextContent(message);
        if (content) {
          cohereMessages.push({
            role: message.role,
            content,
          });
        }
      }
      // Skip function, tool, and developer roles as they may not be supported
    }

    return cohereMessages;
  }

  private extractTextContent(message: ChatMessage): string {
    if (typeof message.content === 'string') {
      return message.content;
    } else if (Array.isArray(message.content)) {
      return message.content
        .filter((item: any) => item.type === 'text')
        .map((item: any) => item.text)
        .join('');
    }
    return message.content || '';
  }

  private convertFromCohereFormat(
    cohereResponse: CohereResponse,
    originalRequest: ChatCompletionRequest,
  ): ChatCompletionResponse {
    // Extract text content from Cohere response
    const content = cohereResponse.message.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('');

    // Map finish reasons
    const finishReasonMap: Record<string, 'stop' | 'length' | 'content_filter'> = {
      COMPLETE: 'stop',
      MAX_TOKENS: 'length',
      ERROR_TOXIC: 'content_filter',
      ERROR_LIMIT: 'length',
      ERROR: 'stop',
      USER_CANCEL: 'stop',
    };

    return {
      id: cohereResponse.id,
      object: 'chat.completion',
      created: this.getCurrentTimestamp(),
      model: originalRequest.model, // Use the requested model alias
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
          },
          finish_reason: finishReasonMap[cohereResponse.finish_reason] || 'stop',
        },
      ],
      usage: cohereResponse.usage
        ? {
            prompt_tokens: cohereResponse.usage.input_tokens,
            completion_tokens: cohereResponse.usage.output_tokens,
            total_tokens: cohereResponse.usage.input_tokens + cohereResponse.usage.output_tokens,
          }
        : undefined,
    };
  }

  protected override getBaseUrl(): string {
    return this.provider.baseUrl || 'https://api.cohere.ai';
  }

  protected override getHealthCheckUrl(): string {
    return `${this.getBaseUrl()}/v1/models`;
  }

  protected override getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'commissary/1.0.0',
    };

    switch (this.credentials.type) {
      case 'api-key':
        headers['Authorization'] = `Bearer ${this.credentials.value}`;
        break;
      default:
        throw this.createProviderError(
          `Unsupported authentication type for Cohere: ${this.credentials.type}`,
          'UNSUPPORTED_AUTH',
          400,
          null,
          false,
        );
    }

    return headers;
  }

  protected override applyParameterMapping(
    request: ChatCompletionRequest,
    mapping: Record<string, string>,
  ): Record<string, unknown> {
    const transformedParams: Record<string, unknown> = {};

    // Map OpenAI parameters to Cohere-specific parameters
    if (request.max_tokens && mapping.maxTokens) {
      transformedParams[mapping.maxTokens] = request.max_tokens;
    }

    if (request.temperature !== undefined && mapping.temperature) {
      transformedParams[mapping.temperature] = request.temperature;
    }

    if (request.top_p !== undefined && mapping.p) {
      transformedParams[mapping.p] = request.top_p;
    }

    // Cohere-specific parameters
    if (mapping.k) {
      transformedParams[mapping.k] = 0; // Default k for Cohere (nucleus sampling threshold)
    }

    if (request.frequency_penalty !== undefined && mapping.frequencyPenalty) {
      transformedParams[mapping.frequencyPenalty] = request.frequency_penalty;
    }

    if (request.presence_penalty !== undefined && mapping.presencePenalty) {
      transformedParams[mapping.presencePenalty] = request.presence_penalty;
    }

    return transformedParams;
  }
}
