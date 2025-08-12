import type { Modality } from '~/core/schemas/modality';
import type { ParameterMapping } from '~/core/schemas/parameter-mapping';
import type { ResolvedModel } from './alias-resolver';

export interface RequestValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export interface ModelCapabilities {
  inputModalities: Modality[];
  outputModalities: Modality[];
  contextWindow: number | null;
  maxOutputTokens: number | null;
  supportedParameters: string[];
  parameterMapping: ParameterMapping | null;
}

export interface ChatRequest {
  model: string;
  messages: Array<{
    role: string;
    content?: string | Array<{ type: string; [key: string]: any }>;
    name?: string;
    tool_calls?: Array<{ id: string; type: string; function: { name: string; arguments: string } }>;
    tool_call_id?: string;
    function_call?: { name: string; arguments: string };
  }>;
  max_tokens?: number;
  temperature?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stream?: boolean;
  response_format?: { type: string };
  // Add other OpenAI parameters as needed
}

export class ModelCapabilityMatcher {
  /**
   * Validate request parameters against model capabilities
   */
  validateRequest(request: ChatRequest, resolvedModel: ResolvedModel): RequestValidation {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Get effective capabilities (provider model overrides base model)
    const capabilities = this.getModelCapabilities(resolvedModel);

    // Validate modalities
    this.validateModalities(request, capabilities, errors, warnings);

    // Validate context window
    this.validateContextWindow(request, capabilities, errors, warnings);

    // Validate max output tokens
    this.validateMaxOutputTokens(request, capabilities, errors, warnings);

    // Validate parameters
    this.validateParameters(request, capabilities, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Get effective model capabilities (provider-specific overrides base model)
   */
  getModelCapabilities(resolvedModel: ResolvedModel): ModelCapabilities {
    const { model, providerModel } = resolvedModel;

    return {
      inputModalities: providerModel.inputModalities || model.inputModalities || ['text'],
      outputModalities: providerModel.outputModalities || model.outputModalities || ['text'],
      contextWindow: model.contextWindow,
      maxOutputTokens: providerModel.maxOutputTokens,
      supportedParameters: this.extractSupportedParameters(providerModel.parameterMapping),
      parameterMapping: providerModel.parameterMapping,
    };
  }

  /**
   * Transform OpenAI format parameters to provider-specific format
   */
  transformParameters(request: ChatRequest, resolvedModel: ResolvedModel): Record<string, any> {
    const mapping = resolvedModel.providerModel.parameterMapping;
    if (!mapping) {
      // No mapping available, return as-is (for OpenAI-compatible providers)
      return request;
    }

    const transformed: Record<string, any> = { ...request };

    // Apply parameter mappings
    if (request.max_tokens !== undefined && mapping.maxOutputTokens) {
      transformed[mapping.maxOutputTokens] = request.max_tokens;
      delete transformed.max_tokens;
    }

    if (request.temperature !== undefined && mapping.temperature) {
      transformed[mapping.temperature] = request.temperature;
      delete transformed.temperature;
    }

    if (request.top_p !== undefined && mapping.topP) {
      transformed[mapping.topP] = request.top_p;
      delete transformed.top_p;
    }

    if (request.frequency_penalty !== undefined && mapping.frequencyPenalty) {
      transformed[mapping.frequencyPenalty] = request.frequency_penalty;
      delete transformed.frequency_penalty;
    }

    if (request.presence_penalty !== undefined && mapping.presencePenalty) {
      transformed[mapping.presencePenalty] = request.presence_penalty;
      delete transformed.presence_penalty;
    }

    if (request.stream !== undefined && mapping.stream) {
      transformed[mapping.stream] = request.stream;
      delete transformed.stream;
    }

    if (request.response_format !== undefined && mapping.responseFormat) {
      transformed[mapping.responseFormat] = request.response_format;
      delete transformed.response_format;
    }

    return transformed;
  }

  /**
   * Estimate token count for messages (basic implementation)
   */
  estimateTokenCount(messages: ChatRequest['messages']): number {
    let tokenCount = 0;

    for (const message of messages) {
      // Add base tokens per message (role, formatting, etc.)
      tokenCount += 4;

      if (message.content) {
        if (typeof message.content === 'string') {
          // Simple estimation: ~4 characters per token
          tokenCount += Math.ceil(message.content.length / 4);
        } else if (Array.isArray(message.content)) {
          // Handle multi-modal content
          for (const part of message.content) {
            if (part.type === 'text' && part.text) {
              tokenCount += Math.ceil(part.text.length / 4);
            } else if (part.type === 'image') {
              // Base image tokens (this varies by provider/model)
              tokenCount += 85; // Approximate for vision models
            }
          }
        }
      }
    }

    // Add tokens for assistant response formatting
    tokenCount += 3;

    return tokenCount;
  }

  /**
   * Validate input/output modalities
   */
  private validateModalities(
    request: ChatRequest,
    capabilities: ModelCapabilities,
    errors: string[],
    warnings: string[],
  ): void {
    const hasImageContent = request.messages.some(
      (msg) => Array.isArray(msg.content) && msg.content.some((part) => part.type === 'image'),
    );

    if (hasImageContent && !capabilities.inputModalities.includes('image')) {
      errors.push('Model does not support image input');
    }

    // Check if model supports text output (should always be true for chat models)
    if (!capabilities.outputModalities.includes('text')) {
      errors.push('Model does not support text output');
    }
  }

  /**
   * Validate context window limits
   */
  private validateContextWindow(
    request: ChatRequest,
    capabilities: ModelCapabilities,
    errors: string[],
    warnings: string[],
  ): void {
    if (!capabilities.contextWindow) {
      return; // No limit specified
    }

    const estimatedTokens = this.estimateTokenCount(request.messages);
    const maxTokens = request.max_tokens || 0;
    const totalTokens = estimatedTokens + maxTokens;

    if (totalTokens > capabilities.contextWindow) {
      errors.push(
        `Total tokens (${totalTokens}) exceeds model context window (${capabilities.contextWindow})`,
      );
    } else if (totalTokens > capabilities.contextWindow * 0.9) {
      warnings.push(
        `Total tokens (${totalTokens}) is close to context window limit (${capabilities.contextWindow})`,
      );
    }
  }

  /**
   * Validate max output tokens
   */
  private validateMaxOutputTokens(
    request: ChatRequest,
    capabilities: ModelCapabilities,
    errors: string[],
    warnings: string[],
  ): void {
    if (!request.max_tokens || !capabilities.maxOutputTokens) {
      return;
    }

    if (request.max_tokens > capabilities.maxOutputTokens) {
      errors.push(
        `Requested max_tokens (${request.max_tokens}) exceeds model limit (${capabilities.maxOutputTokens})`,
      );
    }
  }

  /**
   * Validate request parameters against supported parameters
   */
  private validateParameters(
    request: ChatRequest,
    capabilities: ModelCapabilities,
    errors: string[],
    warnings: string[],
  ): void {
    if (!capabilities.parameterMapping) {
      return; // No parameter restrictions
    }

    // Check for unsupported parameters
    const requestParams = new Set(Object.keys(request));
    const supportedParams = new Set(['model', 'messages', ...capabilities.supportedParameters]);

    for (const param of requestParams) {
      if (!supportedParams.has(param)) {
        warnings.push(`Parameter '${param}' may not be supported by this model`);
      }
    }

    // Validate parameter ranges (could be extended based on model specs)
    if (request.temperature !== undefined) {
      if (request.temperature < 0 || request.temperature > 2) {
        errors.push('Temperature must be between 0 and 2');
      }
    }

    if (request.top_p !== undefined) {
      if (request.top_p < 0 || request.top_p > 1) {
        errors.push('top_p must be between 0 and 1');
      }
    }

    if (request.frequency_penalty !== undefined) {
      if (request.frequency_penalty < -2 || request.frequency_penalty > 2) {
        errors.push('frequency_penalty must be between -2 and 2');
      }
    }

    if (request.presence_penalty !== undefined) {
      if (request.presence_penalty < -2 || request.presence_penalty > 2) {
        errors.push('presence_penalty must be between -2 and 2');
      }
    }
  }

  /**
   * Extract supported parameters from parameter mapping
   */
  private extractSupportedParameters(mapping: ParameterMapping | null): string[] {
    if (!mapping) {
      return [];
    }

    const params: string[] = [];

    if (mapping.maxOutputTokens) params.push('max_tokens');
    if (mapping.temperature) params.push('temperature');
    if (mapping.topP) params.push('top_p');
    if (mapping.minP) params.push('min_p');
    if (mapping.topK) params.push('top_k');
    if (mapping.topA) params.push('top_a');
    if (mapping.frequencyPenalty) params.push('frequency_penalty');
    if (mapping.repetitionPenalty) params.push('repetition_penalty');
    if (mapping.presencePenalty) params.push('presence_penalty');
    if (mapping.responseFormat) params.push('response_format');
    if (mapping.logitBias) params.push('logit_bias');
    if (mapping.topLogprobs) params.push('top_logprobs');
    if (mapping.reasoning) params.push('reasoning');
    if (mapping.stream) params.push('stream');
    if (mapping.seed) params.push('seed');
    if (mapping.webSearchOptions) params.push('web_search');

    return params;
  }
}
