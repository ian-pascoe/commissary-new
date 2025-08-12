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

interface GoogleAIPart {
  text?: string;
  inlineData?: {
    mimeType: string;
    data: string;
  };
}

interface GoogleAIContent {
  role?: 'user' | 'model';
  parts: GoogleAIPart[];
}

interface GoogleAIRequest {
  contents: GoogleAIContent[];
  generationConfig?: {
    temperature?: number;
    topP?: number;
    topK?: number;
    candidateCount?: number;
    maxOutputTokens?: number;
    stopSequences?: string[];
  };
  safetySettings?: Array<{
    category: string;
    threshold: string;
  }>;
  systemInstruction?: {
    role: string;
    parts: GoogleAIPart[];
  };
}

interface GoogleAICandidate {
  content: {
    parts: GoogleAIPart[];
    role: string;
  };
  finishReason?:
    | 'FINISH_REASON_UNSPECIFIED'
    | 'STOP'
    | 'MAX_TOKENS'
    | 'SAFETY'
    | 'RECITATION'
    | 'OTHER';
  index: number;
  safetyRatings?: Array<{
    category: string;
    probability: string;
  }>;
}

interface GoogleAIResponse {
  candidates: GoogleAICandidate[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
}

export class GoogleAIProviderClient extends BaseProviderClient {
  override transformRequest(
    request: ChatCompletionRequest,
    model: ProviderModel,
    _context: RequestContext,
  ): ProviderRequest {
    const url = `${this.getBaseUrl()}/v1beta/models/${model.slug}:generateContent`;

    // Convert OpenAI format to Google AI format
    const googleRequest = this.convertToGoogleAIFormat(request, model);

    const providerRequest: ProviderRequest = {
      method: 'POST',
      url,
      headers: this.getAuthHeaders(),
      body: googleRequest,
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
        `Google AI API error: ${response.statusText}`,
        'API_ERROR',
        response.status,
        response.body,
        response.status >= 500 || response.status === 429,
      );
    }

    const data = response.body as GoogleAIResponse;

    // Convert Google AI response to OpenAI format
    return this.convertFromGoogleAIFormat(data, originalRequest);
  }

  private convertToGoogleAIFormat(
    request: ChatCompletionRequest,
    model: ProviderModel,
  ): GoogleAIRequest {
    // Apply parameter mapping if available
    const transformedParams = model.parameterMapping
      ? this.applyParameterMapping(request, model.parameterMapping)
      : {};

    // Convert messages to Google AI format
    const { contents, systemInstruction } = this.convertMessages(request.messages);

    // Build generation config
    const generationConfig: GoogleAIRequest['generationConfig'] = {
      ...transformedParams,
      ...(request.temperature !== undefined && { temperature: request.temperature }),
      ...(request.top_p !== undefined && { topP: request.top_p }),
      ...(request.max_tokens && { maxOutputTokens: request.max_tokens }),
      ...(request.n !== undefined && { candidateCount: request.n }),
      ...(request.stop && {
        stopSequences: Array.isArray(request.stop) ? request.stop : [request.stop],
      }),
    };

    // Build the request
    const googleRequest: GoogleAIRequest = {
      contents,
      ...(Object.keys(generationConfig).length > 0 && { generationConfig }),
      ...(systemInstruction && { systemInstruction }),
    };

    return googleRequest;
  }

  private convertMessages(messages: ChatMessage[]): {
    contents: GoogleAIContent[];
    systemInstruction?: { role: string; parts: GoogleAIPart[] };
  } {
    let systemInstruction: { role: string; parts: GoogleAIPart[] } | undefined;
    const contents: GoogleAIContent[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        // Google AI uses systemInstruction instead of system messages
        const content = this.extractTextContent(message);
        if (content) {
          systemInstruction = {
            role: 'system',
            parts: [{ text: content }],
          };
        }
      } else if (message.role === 'user') {
        contents.push({
          role: 'user',
          parts: this.convertContentToParts(message),
        });
      } else if (message.role === 'assistant') {
        contents.push({
          role: 'model', // Google AI uses 'model' instead of 'assistant'
          parts: this.convertContentToParts(message),
        });
      }
      // Skip function, tool, and developer roles as they're not directly supported
    }

    return { contents, systemInstruction };
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

  private convertContentToParts(message: ChatMessage): GoogleAIPart[] {
    if (typeof message.content === 'string') {
      return [{ text: message.content }];
    } else if (Array.isArray(message.content)) {
      return message.content.map((item: any) => {
        if (item.type === 'text') {
          return { text: item.text };
        } else if (item.type === 'image_url') {
          // Handle base64 encoded images
          const url = item.image_url?.url;
          if (url && url.startsWith('data:')) {
            const [mimeType, data] = url.split(',');
            return {
              inlineData: {
                mimeType: mimeType.split(':')[1].split(';')[0],
                data: data,
              },
            };
          }
        }
        // For unsupported types, convert to text
        return { text: JSON.stringify(item) };
      });
    } else if (message.content) {
      return [{ text: message.content }];
    }
    return [{ text: '' }];
  }

  private convertFromGoogleAIFormat(
    googleResponse: GoogleAIResponse,
    originalRequest: ChatCompletionRequest,
  ): ChatCompletionResponse {
    const choices = googleResponse.candidates.map((candidate, index) => {
      // Extract text content from parts
      const content = candidate.content.parts
        .filter((part) => part.text)
        .map((part) => part.text)
        .join('');

      // Map finish reasons
      const finishReasonMap: Record<string, 'stop' | 'length' | 'content_filter'> = {
        STOP: 'stop',
        MAX_TOKENS: 'length',
        SAFETY: 'content_filter',
        RECITATION: 'content_filter',
        OTHER: 'stop',
        FINISH_REASON_UNSPECIFIED: 'stop',
      };

      return {
        index,
        message: {
          role: 'assistant' as const,
          content,
        },
        finish_reason: finishReasonMap[candidate.finishReason || 'STOP'] || 'stop',
      };
    });

    return {
      id: this.generateRequestId(),
      object: 'chat.completion',
      created: this.getCurrentTimestamp(),
      model: originalRequest.model, // Use the requested model alias
      choices,
      usage: googleResponse.usageMetadata
        ? {
            prompt_tokens: googleResponse.usageMetadata.promptTokenCount,
            completion_tokens: googleResponse.usageMetadata.candidatesTokenCount,
            total_tokens: googleResponse.usageMetadata.totalTokenCount,
          }
        : undefined,
    };
  }

  protected override getBaseUrl(): string {
    return this.provider.baseUrl || 'https://generativelanguage.googleapis.com';
  }

  protected override getHealthCheckUrl(): string {
    return `${this.getBaseUrl()}/v1beta/models`;
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
          `Unsupported authentication type for Google AI: ${this.credentials.type}`,
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

    // Map OpenAI parameters to Google AI-specific parameters
    if (request.max_tokens && mapping.maxOutputTokens) {
      transformedParams[mapping.maxOutputTokens] = request.max_tokens;
    }

    if (request.temperature !== undefined && mapping.temperature) {
      transformedParams[mapping.temperature] = request.temperature;
    }

    if (request.top_p !== undefined && mapping.topP) {
      transformedParams[mapping.topP] = request.top_p;
    }

    // Google AI-specific parameters
    if (mapping.topK) {
      transformedParams[mapping.topK] = 40; // Default top_k for Google AI
    }

    if (request.n !== undefined && mapping.candidateCount) {
      transformedParams[mapping.candidateCount] = request.n;
    }

    return transformedParams;
  }
}
