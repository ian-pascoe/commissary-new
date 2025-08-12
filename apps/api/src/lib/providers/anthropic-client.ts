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

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<{ type: 'text'; text: string }>;
}

interface AnthropicRequest {
  model: string;
  max_tokens: number;
  messages: AnthropicMessage[];
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop_sequences?: string[];
  system?: string;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<{
    type: 'text';
    text: string;
  }>;
  model: string;
  stop_reason: 'end_turn' | 'max_tokens' | 'stop_sequence';
  stop_sequence?: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProviderClient extends BaseProviderClient {
  override transformRequest(
    request: ChatCompletionRequest,
    model: ProviderModel,
    _context: RequestContext,
  ): ProviderRequest {
    const url = `${this.getBaseUrl()}/v1/messages`;

    // Convert OpenAI format to Anthropic format
    const anthropicRequest = this.convertToAnthropicFormat(request, model);

    const providerRequest: ProviderRequest = {
      method: 'POST',
      url,
      headers: {
        ...this.getAuthHeaders(),
        'anthropic-version': '2023-06-01',
      },
      body: anthropicRequest,
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
        `Anthropic API error: ${response.statusText}`,
        'API_ERROR',
        response.status,
        response.body,
        response.status >= 500 || response.status === 429,
      );
    }

    const data = response.body as AnthropicResponse;

    // Convert Anthropic response to OpenAI format
    return this.convertFromAnthropicFormat(data, originalRequest);
  }

  private convertToAnthropicFormat(
    request: ChatCompletionRequest,
    model: ProviderModel,
  ): AnthropicRequest {
    // Apply parameter mapping if available
    const transformedParams = model.parameterMapping
      ? this.applyParameterMapping(request, model.parameterMapping)
      : {};

    // Convert messages to Anthropic format
    const { messages, system } = this.convertMessages(request.messages);

    // Build the request
    const anthropicRequest: AnthropicRequest = {
      model: model.slug,
      max_tokens: request.max_tokens || 4096,
      messages,
      ...(system && { system }),
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      ...(request.top_p !== undefined && { top_p: request.top_p }),
      ...(request.stop && {
        stop_sequences: Array.isArray(request.stop) ? request.stop : [request.stop],
      }),
      ...transformedParams,
    };

    return anthropicRequest;
  }

  private convertMessages(messages: ChatMessage[]): {
    messages: AnthropicMessage[];
    system?: string;
  } {
    let system: string | undefined;
    const anthropicMessages: AnthropicMessage[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        // Anthropic uses a separate system parameter instead of system messages
        system =
          typeof message.content === 'string' ? message.content : message.content?.[0]?.text || '';
      } else if (message.role === 'user' || message.role === 'assistant') {
        // Convert content to appropriate format
        let content: string | Array<{ type: 'text'; text: string }>;

        if (typeof message.content === 'string') {
          content = message.content;
        } else if (Array.isArray(message.content)) {
          // Handle multimodal content (for now, just extract text)
          content = message.content
            .filter((item: any) => item.type === 'text')
            .map((item: any) => ({ type: 'text', text: item.text }));

          if (content.length === 1) {
            content = (content as any)[0].text;
          }
        } else {
          content = message.content || '';
        }

        anthropicMessages.push({
          role: message.role,
          content,
        });
      }
      // Skip function, tool, and developer roles as they're not directly supported
    }

    return { messages: anthropicMessages, system };
  }

  private convertFromAnthropicFormat(
    anthropicResponse: AnthropicResponse,
    originalRequest: ChatCompletionRequest,
  ): ChatCompletionResponse {
    // Extract text content from Anthropic response
    const content = anthropicResponse.content
      .filter((item) => item.type === 'text')
      .map((item) => item.text)
      .join('');

    // Map stop reasons
    const finishReasonMap: Record<string, 'stop' | 'length'> = {
      end_turn: 'stop',
      max_tokens: 'length',
      stop_sequence: 'stop',
    };

    return {
      id: anthropicResponse.id,
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
          finish_reason: finishReasonMap[anthropicResponse.stop_reason] || 'stop',
        },
      ],
      usage: {
        prompt_tokens: anthropicResponse.usage.input_tokens,
        completion_tokens: anthropicResponse.usage.output_tokens,
        total_tokens: anthropicResponse.usage.input_tokens + anthropicResponse.usage.output_tokens,
      },
    };
  }

  protected override getBaseUrl(): string {
    return this.provider.baseUrl || 'https://api.anthropic.com';
  }

  protected override getHealthCheckUrl(): string {
    return `${this.getBaseUrl()}/v1/messages`;
  }

  protected override getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'commissary/1.0.0',
    };

    switch (this.credentials.type) {
      case 'api-key':
        headers['x-api-key'] = this.credentials.value;
        break;
      case 'oauth':
        headers.Authorization = `Bearer ${this.credentials.value}`;
        break;
      default:
        throw this.createProviderError(
          `Unsupported authentication type for Anthropic: ${this.credentials.type}`,
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

    // Map OpenAI parameters to Anthropic-specific parameters
    if (request.max_tokens && mapping.maxOutputTokens) {
      transformedParams[mapping.maxOutputTokens] = request.max_tokens;
    }

    if (request.temperature !== undefined && mapping.temperature) {
      transformedParams[mapping.temperature] = request.temperature;
    }

    if (request.top_p !== undefined && mapping.topP) {
      transformedParams[mapping.topP] = request.top_p;
    }

    // Anthropic-specific parameters
    if (mapping.topK) {
      transformedParams[mapping.topK] = 250; // Default top_k for Anthropic
    }

    return transformedParams;
  }
}
