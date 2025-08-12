import { BaseProviderClient } from './base-client';
import type { ProviderRequest, ProviderResponse, RequestContext, ProviderModel } from './types';
import type {
  ChatCompletionRequest,
  ChatCompletionResponse,
  ChatCompletionUsage,
  EmbeddingRequest,
  EmbeddingResponse,
  ImageGenerationRequest,
  ImageResponse,
} from '~/core/schemas/openai';
import {
  OpenAIApiResponse,
  OpenAIUsage,
  OpenAIEmbeddingResponse,
  ProviderRequest as ProviderRequestSchema,
  ProviderResponse as ProviderResponseSchema,
} from '~/core/schemas/provider';

export class OpenAIProviderClient extends BaseProviderClient {
  override transformRequest(
    request: ChatCompletionRequest,
    model: ProviderModel,
    _context: RequestContext,
  ): ProviderRequest {
    const url = `${this.getBaseUrl()}/v1/chat/completions`;

    // Apply parameter mapping if available
    const transformedParams = model.parameterMapping
      ? this.applyParameterMapping(request, model.parameterMapping)
      : {};

    // Build the request body using the provider model's slug
    const body = {
      model: model.slug,
      messages: request.messages,
      ...transformedParams,
      // Include unmapped parameters that might be supported
      ...(request.max_tokens &&
        !transformedParams.max_tokens && { max_tokens: request.max_tokens }),
      ...(request.temperature !== undefined &&
        !transformedParams.temperature && { temperature: request.temperature }),
      ...(request.top_p !== undefined && !transformedParams.top_p && { top_p: request.top_p }),
      ...(request.n !== undefined && { n: request.n }),
      ...(request.stream !== undefined && !transformedParams.stream && { stream: request.stream }),
      ...(request.stop && { stop: request.stop }),
      ...(request.presence_penalty !== undefined &&
        !transformedParams.presence_penalty && { presence_penalty: request.presence_penalty }),
      ...(request.frequency_penalty !== undefined &&
        !transformedParams.frequency_penalty && { frequency_penalty: request.frequency_penalty }),
      ...(request.logit_bias &&
        !transformedParams.logit_bias && { logit_bias: request.logit_bias }),
      ...(request.user && { user: request.user }),
      ...(request.response_format &&
        !transformedParams.response_format && { response_format: request.response_format }),
      ...(request.seed !== undefined && !transformedParams.seed && { seed: request.seed }),
      ...(request.tools && { tools: request.tools }),
      ...(request.tool_choice && { tool_choice: request.tool_choice }),
      ...(request.functions && { functions: request.functions }),
      ...(request.function_call && { function_call: request.function_call }),
    };

    const providerRequest: ProviderRequest = {
      method: 'POST',
      url,
      headers: {
        ...this.getAuthHeaders(),
        ...(this.credentials.orgExternalId && {
          'OpenAI-Organization': this.credentials.orgExternalId,
        }),
      },
      body,
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
        `OpenAI API error: ${response.statusText}`,
        'API_ERROR',
        response.status,
        response.body,
        response.status >= 500 || response.status === 429,
      );
    }

    // Validate OpenAI API response structure
    const apiResponseValidation = OpenAIApiResponse.safeParse(response.body);
    if (!apiResponseValidation.success) {
      throw this.createProviderError(
        `Invalid OpenAI API response format: ${apiResponseValidation.error.message}`,
        'INVALID_RESPONSE',
        500,
        apiResponseValidation.error,
        false,
      );
    }

    const data = apiResponseValidation.data;

    // Return the response as-is since OpenAI is the canonical format
    return {
      id: data.id || this.generateRequestId(),
      object: 'chat.completion',
      created: data.created || this.getCurrentTimestamp(),
      model: originalRequest.model, // Use the requested model alias
      choices: data.choices || [],
      usage: data.usage ? this.transformUsage(data.usage) : undefined,
      system_fingerprint: data.system_fingerprint,
    };
  }

  // Embeddings support
  async createEmbedding(
    request: EmbeddingRequest,
    model: ProviderModel,
    _context: RequestContext,
  ): Promise<EmbeddingResponse> {
    const url = `${this.getBaseUrl()}/v1/embeddings`;

    // Apply parameter mapping if available
    const transformedParams = model.parameterMapping
      ? this.applyParameterMappingForEmbeddings(request, model.parameterMapping)
      : {};

    const body = {
      model: model.slug,
      input: request.input,
      ...transformedParams,
      ...(request.encoding_format &&
        !transformedParams.encoding_format && { encoding_format: request.encoding_format }),
      ...(request.dimensions &&
        !transformedParams.dimensions && { dimensions: request.dimensions }),
      ...(request.user && { user: request.user }),
    };

    const providerRequest: ProviderRequest = {
      method: 'POST',
      url,
      headers: {
        ...this.getAuthHeaders(),
        ...(this.credentials.orgExternalId && {
          'OpenAI-Organization': this.credentials.orgExternalId,
        }),
      },
      body,
      timeout: 60000,
    };

    const providerResponse = await this.makeRequest(providerRequest);
    return this.transformEmbeddingResponse(providerResponse, request);
  }

  // Image generation support
  async generateImage(
    request: ImageGenerationRequest,
    model: ProviderModel,
    _context: RequestContext,
  ): Promise<ImageResponse> {
    const url = `${this.getBaseUrl()}/v1/images/generations`;

    // Apply parameter mapping if available
    const transformedParams = model.parameterMapping
      ? this.applyParameterMappingForImages(request, model.parameterMapping)
      : {};

    const body = {
      model: model.slug,
      prompt: request.prompt,
      ...transformedParams,
      ...(request.n !== undefined && !transformedParams.n && { n: request.n }),
      ...(request.quality && !transformedParams.quality && { quality: request.quality }),
      ...(request.response_format &&
        !transformedParams.response_format && { response_format: request.response_format }),
      ...(request.size && !transformedParams.size && { size: request.size }),
      ...(request.style && !transformedParams.style && { style: request.style }),
      ...(request.user && { user: request.user }),
    };

    const providerRequest: ProviderRequest = {
      method: 'POST',
      url,
      headers: {
        ...this.getAuthHeaders(),
        ...(this.credentials.orgExternalId && {
          'OpenAI-Organization': this.credentials.orgExternalId,
        }),
      },
      body,
      timeout: 120000, // 2 minute timeout for image generation
    };

    const providerResponse = await this.makeRequest(providerRequest);
    return this.transformImageResponse(providerResponse, request);
  }

  private transformEmbeddingResponse(
    response: ProviderResponse,
    originalRequest: EmbeddingRequest,
  ): EmbeddingResponse {
    if (response.status !== 200) {
      throw this.createProviderError(
        `OpenAI API error: ${response.statusText}`,
        'API_ERROR',
        response.status,
        response.body,
        response.status >= 500 || response.status === 429,
      );
    }

    // Validate OpenAI embedding response structure
    const apiResponseValidation = OpenAIEmbeddingResponse.safeParse(response.body);
    if (!apiResponseValidation.success) {
      throw this.createProviderError(
        `Invalid OpenAI embedding response format: ${apiResponseValidation.error.message}`,
        'INVALID_RESPONSE',
        500,
        apiResponseValidation.error,
        false,
      );
    }

    const data = apiResponseValidation.data;

    return {
      object: 'list',
      data: data.data,
      model: originalRequest.model, // Use the requested model alias
      usage: data.usage,
    };
  }

  private transformImageResponse(
    response: ProviderResponse,
    _originalRequest: ImageGenerationRequest,
  ): ImageResponse {
    if (response.status !== 200) {
      throw this.createProviderError(
        `OpenAI API error: ${response.statusText}`,
        'API_ERROR',
        response.status,
        response.body,
        response.status >= 500 || response.status === 429,
      );
    }

    // For images, we expect the response to already be in the correct format
    // since OpenAI is the canonical format
    return response.body as ImageResponse;
  }

  protected override getBaseUrl(): string {
    return this.provider.baseUrl || 'https://api.openai.com';
  }

  protected override getHealthCheckUrl(): string {
    return `${this.getBaseUrl()}/v1/models`;
  }

  private transformUsage(usage: unknown): ChatCompletionUsage {
    // Validate usage data with our schema
    const validationResult = OpenAIUsage.safeParse(usage);
    if (!validationResult.success) {
      throw this.createProviderError(
        `Invalid usage data: ${validationResult.error.message}`,
        'INVALID_USAGE',
        500,
        validationResult.error,
        false,
      );
    }

    return validationResult.data;
  }

  private applyParameterMappingForEmbeddings(
    request: EmbeddingRequest,
    mapping: Record<string, string>,
  ): Record<string, unknown> {
    const transformedParams: Record<string, unknown> = {};

    if (request.dimensions !== undefined && mapping.dimensions) {
      transformedParams[mapping.dimensions] = request.dimensions;
    }

    if (request.encoding_format && mapping.encodingFormat) {
      transformedParams[mapping.encodingFormat] = request.encoding_format;
    }

    return transformedParams;
  }

  private applyParameterMappingForImages(
    request: ImageGenerationRequest,
    mapping: Record<string, string>,
  ): Record<string, unknown> {
    const transformedParams: Record<string, unknown> = {};

    if (request.n !== undefined && mapping.n) {
      transformedParams[mapping.n] = request.n;
    }

    if (request.quality && mapping.quality) {
      transformedParams[mapping.quality] = request.quality;
    }

    if (request.response_format && mapping.responseFormat) {
      transformedParams[mapping.responseFormat] = request.response_format;
    }

    if (request.size && mapping.size) {
      transformedParams[mapping.size] = request.size;
    }

    if (request.style && mapping.style) {
      transformedParams[mapping.style] = request.style;
    }

    return transformedParams;
  }
}
