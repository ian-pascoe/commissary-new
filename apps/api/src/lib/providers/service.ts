import { eq, and } from 'drizzle-orm';
import { DefaultProviderFactory } from './factory';
import type {
  ProviderClient,
  ProviderConfig,
  ProviderCredentials,
  ProviderModel,
  RequestContext,
} from './types';
import type { ChatCompletionRequest, ChatCompletionResponse } from '~/core/schemas/openai';
import type { Database } from '../database';
import {
  providersTable,
  providerModelsTable,
  providerCredentialsTable,
} from '~/drizzle/schema/general';
import {
  ProviderConfig as ProviderConfigSchema,
  ProviderCredentials as ProviderCredentialsSchema,
  ProviderModelInfo as ProviderModelSchema,
} from '~/core/schemas/provider';

export class ProviderService {
  private factory: DefaultProviderFactory;
  private clientCache = new Map<string, ProviderClient>();
  private db: Database;

  constructor(database: Database) {
    this.factory = DefaultProviderFactory.getInstance();
    this.db = database;
  }

  async executeRequest(
    request: ChatCompletionRequest,
    providerModelId: string,
    context: RequestContext,
  ): Promise<ChatCompletionResponse> {
    try {
      // Get provider model details
      const providerModel = await this.getProviderModel(providerModelId);
      if (!providerModel) {
        throw new Error(`Provider model not found: ${providerModelId}`);
      }

      // Get provider client
      const client = await this.getProviderClient(providerModel.providerId, context);

      // Transform and execute request
      const providerRequest = client.transformRequest(request, providerModel, context);
      const providerResponse = await client.makeRequest(providerRequest);

      // Transform response back to OpenAI format
      const response = client.transformResponse(providerResponse, providerModel, request);

      return response;
    } catch (error) {
      if (error instanceof Error && 'provider' in error) {
        throw error; // Re-throw provider errors as-is
      }

      throw new Error(
        `Provider execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async executeStreamingRequest(
    request: ChatCompletionRequest,
    providerModelId: string,
    context: RequestContext,
  ): Promise<ReadableStream<Uint8Array>> {
    try {
      // Get provider model details
      const providerModel = await this.getProviderModel(providerModelId);
      if (!providerModel) {
        throw new Error(`Provider model not found: ${providerModelId}`);
      }

      // Get provider client
      const client = await this.getProviderClient(providerModel.providerId, context);

      // Transform request and execute streaming request
      const providerRequest = client.transformRequest(request, providerModel, context);
      
      // Ensure streaming is enabled in the request
      if (providerRequest.body && typeof providerRequest.body === 'object') {
        (providerRequest.body as any).stream = true;
      }

      const stream = await client.makeStreamingRequest(providerRequest);

      return stream;
    } catch (error) {
      if (error instanceof Error && 'provider' in error) {
        throw error; // Re-throw provider errors as-is
      }

      throw new Error(
        `Provider streaming execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  async getProviderModel(providerModelId: string): Promise<ProviderModel | null> {
    const result = await this.db
      .select({
        id: providerModelsTable.id,
        providerId: providerModelsTable.providerId,
        modelId: providerModelsTable.modelId,
        slug: providerModelsTable.slug,
        endpointPath: providerModelsTable.endpointPath,
        maxOutputTokens: providerModelsTable.maxOutputTokens,
        tokenizer: providerModelsTable.tokenizer,
        parameterMapping: providerModelsTable.parameterMapping,
        metadata: providerModelsTable.metadata,
      })
      .from(providerModelsTable)
      .where(eq(providerModelsTable.id, providerModelId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0]!;

    // Validate the database result with our schema
    const validationResult = ProviderModelSchema.safeParse({
      id: row.id,
      providerId: row.providerId,
      modelId: row.modelId,
      slug: row.slug,
      endpointPath: row.endpointPath || undefined,
      maxOutputTokens: row.maxOutputTokens || undefined,
      tokenizer: row.tokenizer || undefined,
      parameterMapping: row.parameterMapping || undefined,
      metadata: row.metadata || undefined,
    });

    if (!validationResult.success) {
      console.error('Provider model validation failed:', validationResult.error);
      throw new Error(`Invalid provider model data: ${validationResult.error.message}`);
    }

    return validationResult.data;
  }

  async getProviderClient(providerId: string, context: RequestContext): Promise<ProviderClient> {
    const cacheKey = `${providerId}-${context.teamId}-${context.environmentId}`;

    // Check cache first
    if (this.clientCache.has(cacheKey)) {
      return this.clientCache.get(cacheKey)!;
    }

    // Get provider config
    const provider = await this.getProviderConfig(providerId);
    if (!provider) {
      throw new Error(`Provider not found: ${providerId}`);
    }

    // Get provider credentials
    const credentials = await this.getProviderCredentials(
      providerId,
      context.teamId,
      context.environmentId,
    );
    if (!credentials) {
      throw new Error(
        `No credentials found for provider ${providerId} in team ${context.teamId}, environment ${context.environmentId}`,
      );
    }

    // Create client
    const client = this.factory.createClient(provider, credentials);

    // Cache the client
    this.clientCache.set(cacheKey, client);

    return client;
  }

  async checkProviderHealth(providerId: string, context: RequestContext): Promise<boolean> {
    try {
      const client = await this.getProviderClient(providerId, context);
      return await client.healthCheck();
    } catch {
      return false;
    }
  }

  private async getProviderConfig(providerId: string): Promise<ProviderConfig | null> {
    const result = await this.db
      .select({
        id: providersTable.id,
        name: providersTable.name,
        slug: providersTable.slug,
        baseUrl: providersTable.baseUrl,
        status: providersTable.status,
        metadata: providersTable.metadata,
      })
      .from(providersTable)
      .where(eq(providersTable.id, providerId))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const row = result[0]!;

    // Validate the database result with our schema
    const validationResult = ProviderConfigSchema.safeParse({
      id: row.id,
      name: row.name,
      slug: row.slug,
      baseUrl: row.baseUrl || undefined,
      status: row.status || 'active',
      metadata: row.metadata || undefined,
    });

    if (!validationResult.success) {
      console.error('Provider config validation failed:', validationResult.error);
      throw new Error(`Invalid provider config data: ${validationResult.error.message}`);
    }

    return validationResult.data;
  }

  private async getProviderCredentials(
    providerId: string,
    teamId: string,
    environmentId: string,
  ): Promise<ProviderCredentials | null> {
    // Try to find credentials scoped to the specific environment first
    let result = await this.db
      .select({
        type: providerCredentialsTable.type,
        value: providerCredentialsTable.value,
        region: providerCredentialsTable.region,
        orgExternalId: providerCredentialsTable.orgExternalId,
        metadata: providerCredentialsTable.metadata,
      })
      .from(providerCredentialsTable)
      .where(
        and(
          eq(providerCredentialsTable.providerId, providerId),
          eq(providerCredentialsTable.teamId, teamId),
          eq(providerCredentialsTable.environmentId, environmentId),
          eq(providerCredentialsTable.status, 'active'),
        ),
      )
      .limit(1);

    // If no environment-specific credentials, try team-level
    if (result.length === 0) {
      result = await this.db
        .select({
          type: providerCredentialsTable.type,
          value: providerCredentialsTable.value,
          region: providerCredentialsTable.region,
          orgExternalId: providerCredentialsTable.orgExternalId,
          metadata: providerCredentialsTable.metadata,
        })
        .from(providerCredentialsTable)
        .where(
          and(
            eq(providerCredentialsTable.providerId, providerId),
            eq(providerCredentialsTable.teamId, teamId),
            eq(providerCredentialsTable.status, 'active'),
          ),
        )
        .limit(1);
    }

    if (result.length === 0) {
      return null;
    }

    const row = result[0]!;

    // Validate the database result with our schema
    const validationResult = ProviderCredentialsSchema.safeParse({
      type: row.type,
      value: row.value || '',
      region: row.region || undefined,
      orgExternalId: row.orgExternalId || undefined,
      metadata: row.metadata || undefined,
    });

    if (!validationResult.success) {
      console.error('Provider credentials validation failed:', validationResult.error);
      throw new Error(`Invalid provider credentials data: ${validationResult.error.message}`);
    }

    return validationResult.data;
  }

  clearCache(): void {
    this.clientCache.clear();
  }

  clearCacheForTeam(teamId: string, environmentId?: string): void {
    const keysToDelete: string[] = [];

    for (const key of this.clientCache.keys()) {
      const [, keyTeamId, keyEnvironmentId] = key.split('-');
      if (keyTeamId === teamId && (!environmentId || keyEnvironmentId === environmentId)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.clientCache.delete(key);
    }
  }
}
