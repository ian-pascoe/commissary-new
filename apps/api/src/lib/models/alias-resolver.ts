import { and, eq, or } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import {
  modelAliasesTable,
  providerModelsTable,
  modelsTable,
  providersTable,
} from '../../../../../drizzle/schema';
import type { Modality } from '~/core/schemas/modality';
import type { ParameterMapping } from '~/core/schemas/parameter-mapping';
import type { Metadata } from '~/core/schemas/metadata';

export interface ResolvedModel {
  // Provider model info
  providerModel: {
    id: string;
    slug: string;
    endpointPath: string | null;
    inputModalities: Modality[] | null;
    outputModalities: Modality[] | null;
    maxOutputTokens: number | null;
    tokenizer: string | null;
    quantization: string | null;
    dimensions: number | null;
    parameterMapping: ParameterMapping | null;
    safetyFeatures: any;
    metadata: Metadata | null;
  };
  // Base model info
  model: {
    id: string;
    slug: string;
    displayName: string;
    inputModalities: Modality[] | null;
    outputModalities: Modality[] | null;
    contextWindow: number | null;
    metadata: Metadata | null;
  };
  // Provider info
  provider: {
    id: string;
    name: string;
    slug: string;
    status: 'active' | 'degraded' | 'disabled' | null;
    baseUrl: string | null;
    metadata: any;
  };
  // Alias info (if resolved via alias)
  alias?: {
    id: string;
    alias: string;
    scope: 'env' | 'team' | 'org' | 'global';
  };
}

export interface ModelAliasResolverOptions {
  enableCache?: boolean;
  cacheKeyPrefix?: string;
  cacheTtlSeconds?: number;
}

export class ModelAliasResolver {
  private cache?: Map<string, { model: ResolvedModel; expiresAt: number }>;
  private cacheKeyPrefix: string;
  private cacheTtlMs: number;

  constructor(
    private db: PostgresJsDatabase<any>,
    options: ModelAliasResolverOptions = {},
  ) {
    this.cacheKeyPrefix = options.cacheKeyPrefix || 'model_resolution:';
    this.cacheTtlMs = (options.cacheTtlSeconds || 300) * 1000; // Default 5 minutes

    if (options.enableCache !== false) {
      this.cache = new Map();
    }
  }

  /**
   * Resolve model name to concrete provider model
   * Handles scope-based aliases: global → org → team → env
   */
  async resolveModel(
    modelName: string,
    context: {
      organizationId?: string | null;
      teamId?: string | null;
      environmentId?: string | null;
    },
  ): Promise<ResolvedModel | null> {
    // Build cache key including context for proper scoping
    const contextKey = `${context.organizationId || 'null'}-${context.teamId || 'null'}-${context.environmentId || 'null'}`;
    const cacheKey = `${this.cacheKeyPrefix}${modelName}:${contextKey}`;

    // Check cache first
    if (this.cache) {
      const cached = this.cache.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        return cached.model;
      }
      if (cached) {
        this.cache.delete(cacheKey);
      }
    }

    try {
      // Try to resolve via alias first (prioritizing most specific scope)
      const aliasResult = await this.resolveViaAlias(modelName, context);
      if (aliasResult) {
        this.cacheResult(cacheKey, aliasResult);
        return aliasResult;
      }

      // Fallback: Try to resolve as direct provider model slug
      const directResult = await this.resolveDirect(modelName);
      if (directResult) {
        this.cacheResult(cacheKey, directResult);
        return directResult;
      }

      return null;
    } catch (error) {
      console.error('Failed to resolve model:', error);
      return null;
    }
  }

  /**
   * Resolve model via alias with scope precedence: env → team → org → global
   */
  private async resolveViaAlias(
    modelName: string,
    context: {
      organizationId?: string | null;
      teamId?: string | null;
      environmentId?: string | null;
    },
  ): Promise<ResolvedModel | null> {
    // Build scope-based query conditions in order of precedence
    const scopeConditions = [];

    // Environment scope (highest precedence)
    if (context.environmentId) {
      scopeConditions.push(
        and(
          eq(modelAliasesTable.scope, 'env'),
          eq(modelAliasesTable.environmentId, context.environmentId),
          eq(modelAliasesTable.alias, modelName),
        ),
      );
    }

    // Team scope
    if (context.teamId) {
      scopeConditions.push(
        and(
          eq(modelAliasesTable.scope, 'team'),
          eq(modelAliasesTable.teamId, context.teamId),
          eq(modelAliasesTable.alias, modelName),
        ),
      );
    }

    // Organization scope
    if (context.organizationId) {
      scopeConditions.push(
        and(
          eq(modelAliasesTable.scope, 'org'),
          eq(modelAliasesTable.organizationId, context.organizationId),
          eq(modelAliasesTable.alias, modelName),
        ),
      );
    }

    // Global scope (lowest precedence)
    scopeConditions.push(
      and(eq(modelAliasesTable.scope, 'global'), eq(modelAliasesTable.alias, modelName)),
    );

    // Try each scope in order of precedence
    for (const condition of scopeConditions) {
      const result = await this.db
        .select({
          // Alias fields
          aliasId: modelAliasesTable.id,
          aliasName: modelAliasesTable.alias,
          aliasScope: modelAliasesTable.scope,

          // Provider model fields
          providerModelId: providerModelsTable.id,
          providerModelSlug: providerModelsTable.slug,
          providerModelEndpointPath: providerModelsTable.endpointPath,
          providerModelInputModalities: providerModelsTable.inputModalities,
          providerModelOutputModalities: providerModelsTable.outputModalities,
          providerModelMaxOutputTokens: providerModelsTable.maxOutputTokens,
          providerModelTokenizer: providerModelsTable.tokenizer,
          providerModelQuantization: providerModelsTable.quantization,
          providerModelDimensions: providerModelsTable.dimensions,
          providerModelParameterMapping: providerModelsTable.parameterMapping,
          providerModelSafetyFeatures: providerModelsTable.safetyFeatures,
          providerModelMetadata: providerModelsTable.metadata,

          // Model fields
          modelId: modelsTable.id,
          modelSlug: modelsTable.slug,
          modelDisplayName: modelsTable.displayName,
          modelInputModalities: modelsTable.inputModalities,
          modelOutputModalities: modelsTable.outputModalities,
          modelContextWindow: modelsTable.contextWindow,
          modelMetadata: modelsTable.metadata,

          // Provider fields
          providerId: providersTable.id,
          providerName: providersTable.name,
          providerSlug: providersTable.slug,
          providerStatus: providersTable.status,
          providerBaseUrl: providersTable.baseUrl,
          providerMetadata: providersTable.metadata,
        })
        .from(modelAliasesTable)
        .innerJoin(
          providerModelsTable,
          eq(modelAliasesTable.providerModelId, providerModelsTable.id),
        )
        .innerJoin(modelsTable, eq(providerModelsTable.modelId, modelsTable.id))
        .innerJoin(providersTable, eq(providerModelsTable.providerId, providersTable.id))
        .where(condition)
        .limit(1);

      if (result.length > 0) {
        const row = result[0]!;
        return this.buildResolvedModel(row, true);
      }
    }

    return null;
  }

  /**
   * Resolve model directly by provider model slug (format: provider/model)
   */
  private async resolveDirect(modelName: string): Promise<ResolvedModel | null> {
    // Check if model name contains provider prefix (e.g., "openai/gpt-4")
    const [providerSlug, modelSlug] = modelName.includes('/')
      ? modelName.split('/', 2)
      : [null, modelName];

    const query = this.db
      .select({
        // Provider model fields
        providerModelId: providerModelsTable.id,
        providerModelSlug: providerModelsTable.slug,
        providerModelEndpointPath: providerModelsTable.endpointPath,
        providerModelInputModalities: providerModelsTable.inputModalities,
        providerModelOutputModalities: providerModelsTable.outputModalities,
        providerModelMaxOutputTokens: providerModelsTable.maxOutputTokens,
        providerModelTokenizer: providerModelsTable.tokenizer,
        providerModelQuantization: providerModelsTable.quantization,
        providerModelDimensions: providerModelsTable.dimensions,
        providerModelParameterMapping: providerModelsTable.parameterMapping,
        providerModelSafetyFeatures: providerModelsTable.safetyFeatures,
        providerModelMetadata: providerModelsTable.metadata,

        // Model fields
        modelId: modelsTable.id,
        modelSlug: modelsTable.slug,
        modelDisplayName: modelsTable.displayName,
        modelInputModalities: modelsTable.inputModalities,
        modelOutputModalities: modelsTable.outputModalities,
        modelContextWindow: modelsTable.contextWindow,
        modelMetadata: modelsTable.metadata,

        // Provider fields
        providerId: providersTable.id,
        providerName: providersTable.name,
        providerSlug: providersTable.slug,
        providerStatus: providersTable.status,
        providerBaseUrl: providersTable.baseUrl,
        providerMetadata: providersTable.metadata,
      })
      .from(providerModelsTable)
      .innerJoin(modelsTable, eq(providerModelsTable.modelId, modelsTable.id))
      .innerJoin(providersTable, eq(providerModelsTable.providerId, providersTable.id));

    // Apply filtering based on model name format
    if (providerSlug && modelSlug) {
      // Provider-specific lookup: "openai/gpt-4"
      const result = await query
        .where(
          and(
            eq(providersTable.slug, providerSlug),
            or(eq(providerModelsTable.slug, modelSlug), eq(modelsTable.slug, modelSlug)),
          ),
        )
        .limit(1);

      if (result.length > 0) {
        const row = result[0]!;
        return this.buildResolvedModel(row, false);
      }
    } else {
      // Generic lookup: just "gpt-4"
      const result = await query
        .where(or(eq(providerModelsTable.slug, modelName), eq(modelsTable.slug, modelName)))
        .limit(1);

      if (result.length > 0) {
        const row = result[0]!;
        return this.buildResolvedModel(row, false);
      }
    }

    return null;
  }

  /**
   * Build ResolvedModel object from query result
   */
  private buildResolvedModel(row: any, fromAlias: boolean): ResolvedModel {
    const resolved: ResolvedModel = {
      providerModel: {
        id: row.providerModelId,
        slug: row.providerModelSlug,
        endpointPath: row.providerModelEndpointPath,
        inputModalities: row.providerModelInputModalities,
        outputModalities: row.providerModelOutputModalities,
        maxOutputTokens: row.providerModelMaxOutputTokens,
        tokenizer: row.providerModelTokenizer,
        quantization: row.providerModelQuantization,
        dimensions: row.providerModelDimensions,
        parameterMapping: row.providerModelParameterMapping,
        safetyFeatures: row.providerModelSafetyFeatures,
        metadata: row.providerModelMetadata,
      },
      model: {
        id: row.modelId,
        slug: row.modelSlug,
        displayName: row.modelDisplayName,
        inputModalities: row.modelInputModalities,
        outputModalities: row.modelOutputModalities,
        contextWindow: row.modelContextWindow,
        metadata: row.modelMetadata,
      },
      provider: {
        id: row.providerId,
        name: row.providerName,
        slug: row.providerSlug,
        status: row.providerStatus,
        baseUrl: row.providerBaseUrl,
        metadata: row.providerMetadata,
      },
    };

    // Add alias info if resolved via alias
    if (fromAlias) {
      resolved.alias = {
        id: row.aliasId,
        alias: row.aliasName,
        scope: row.aliasScope,
      };
    }

    return resolved;
  }

  /**
   * Cache the resolution result
   */
  private cacheResult(cacheKey: string, model: ResolvedModel): void {
    if (this.cache) {
      this.cache.set(cacheKey, {
        model,
        expiresAt: Date.now() + this.cacheTtlMs,
      });
    }
  }

  /**
   * Clear cache for specific model and context
   */
  invalidateCache(
    modelName: string,
    context?: {
      organizationId?: string | null;
      teamId?: string | null;
      environmentId?: string | null;
    },
  ): void {
    if (!this.cache) return;

    if (context) {
      const contextKey = `${context.organizationId || 'null'}-${context.teamId || 'null'}-${context.environmentId || 'null'}`;
      const cacheKey = `${this.cacheKeyPrefix}${modelName}:${contextKey}`;
      this.cache.delete(cacheKey);
    } else {
      // Clear all entries for this model name
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${this.cacheKeyPrefix}${modelName}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Clear all cache entries
   */
  clearCache(): void {
    if (this.cache) {
      this.cache.clear();
    }
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; enabled: boolean } {
    return {
      enabled: !!this.cache,
      size: this.cache?.size || 0,
    };
  }
}
