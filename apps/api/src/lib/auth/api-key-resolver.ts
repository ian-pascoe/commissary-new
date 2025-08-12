import { and, eq } from 'drizzle-orm';
import {
  apiKeyBindingsTable,
  apiKeysTable,
  environmentsTable,
  organizationsTable,
  teamsTable,
} from '../../../../../drizzle/schema';
import type { Database } from '../database';

export interface ApiKeyContext {
  apiKey: {
    id: string;
    userId: string;
    name: string | null;
    enabled: boolean;
    permissions: string | null;
    metadata: string | null;
  };
  binding: {
    id: string;
    scope: 'env' | 'team' | 'org';
    organizationId: string | null;
    teamId: string | null;
    environmentId: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string | null;
  } | null;
  team: {
    id: string;
    name: string;
  } | null;
  environment: {
    id: string;
    name: string;
    type: 'dev' | 'staging' | 'prod' | 'custom';
  } | null;
}

export interface ApiKeyResolverOptions {
  enableCache?: boolean;
  cacheKeyPrefix?: string;
  cacheTtlSeconds?: number;
}

export class ApiKeyResolver {
  private cache?: Map<string, { context: ApiKeyContext; expiresAt: number }>;
  private cacheKeyPrefix: string;
  private cacheTtlMs: number;

  constructor(
    private db: Database,
    options: ApiKeyResolverOptions = {},
  ) {
    this.cacheKeyPrefix = options.cacheKeyPrefix || 'api_key_context:';
    this.cacheTtlMs = (options.cacheTtlSeconds || 300) * 1000; // Default 5 minutes

    if (options.enableCache !== false) {
      this.cache = new Map();
    }
  }

  /**
   * Extract API key from Authorization header
   * Supports formats:
   * - Bearer sk-...
   * - sk-...
   */
  extractApiKey(authHeader: string | undefined): string | null {
    if (!authHeader) {
      return null;
    }

    // Handle "Bearer sk-..." format
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      return token.startsWith('sk-') ? token : null;
    }

    // Handle direct "sk-..." format
    return authHeader.startsWith('sk-') ? authHeader : null;
  }

  /**
   * Resolve API key to full context including team/environment scope
   */
  async resolveApiKey(apiKey: string): Promise<ApiKeyContext | null> {
    // Check cache first
    if (this.cache) {
      const cacheKey = `${this.cacheKeyPrefix}${apiKey}`;
      const cached = this.cache.get(cacheKey);

      if (cached && cached.expiresAt > Date.now()) {
        return cached.context;
      }

      // Remove expired entry
      if (cached) {
        this.cache.delete(cacheKey);
      }
    }

    try {
      // Query API key with its binding and related entities
      const result = await this.db
        .select({
          // API Key fields
          apiKeyId: apiKeysTable.id,
          apiKeyUserId: apiKeysTable.userId,
          apiKeyName: apiKeysTable.name,
          apiKeyEnabled: apiKeysTable.enabled,
          apiKeyPermissions: apiKeysTable.permissions,
          apiKeyMetadata: apiKeysTable.metadata,

          // Binding fields
          bindingId: apiKeyBindingsTable.id,
          bindingScope: apiKeyBindingsTable.scope,
          bindingOrganizationId: apiKeyBindingsTable.organizationId,
          bindingTeamId: apiKeyBindingsTable.teamId,
          bindingEnvironmentId: apiKeyBindingsTable.environmentId,

          // Organization fields
          organizationId: organizationsTable.id,
          organizationName: organizationsTable.name,
          organizationSlug: organizationsTable.slug,

          // Team fields
          teamId: teamsTable.id,
          teamName: teamsTable.name,

          // Environment fields
          environmentId: environmentsTable.id,
          environmentName: environmentsTable.name,
          environmentType: environmentsTable.type,
        })
        .from(apiKeysTable)
        .innerJoin(apiKeyBindingsTable, eq(apiKeysTable.id, apiKeyBindingsTable.apiKeyId))
        .leftJoin(organizationsTable, eq(apiKeyBindingsTable.organizationId, organizationsTable.id))
        .leftJoin(teamsTable, eq(apiKeyBindingsTable.teamId, teamsTable.id))
        .leftJoin(environmentsTable, eq(apiKeyBindingsTable.environmentId, environmentsTable.id))
        .where(and(eq(apiKeysTable.key, apiKey), eq(apiKeysTable.enabled, true)))
        .limit(1);

      if (!result[0]) {
        return null;
      }

      const row = result[0];

      const context: ApiKeyContext = {
        apiKey: {
          id: row.apiKeyId,
          userId: row.apiKeyUserId,
          name: row.apiKeyName,
          enabled: row.apiKeyEnabled ?? false, // Handle null case
          permissions: row.apiKeyPermissions,
          metadata: row.apiKeyMetadata,
        },
        binding: {
          id: row.bindingId,
          scope: (row.bindingScope ?? 'team') as 'env' | 'team' | 'org',
          organizationId: row.bindingOrganizationId,
          teamId: row.bindingTeamId,
          environmentId: row.bindingEnvironmentId,
        },
        organization:
          row.organizationId && row.organizationName
            ? {
                id: row.organizationId,
                name: row.organizationName,
                slug: row.organizationSlug,
              }
            : null,
        team:
          row.teamId && row.teamName
            ? {
                id: row.teamId,
                name: row.teamName,
              }
            : null,
        environment:
          row.environmentId && row.environmentName && row.environmentType
            ? {
                id: row.environmentId,
                name: row.environmentName,
                type: row.environmentType as 'dev' | 'staging' | 'prod' | 'custom',
              }
            : null,
      };

      // Cache the result
      if (this.cache) {
        const cacheKey = `${this.cacheKeyPrefix}${apiKey}`;
        this.cache.set(cacheKey, {
          context,
          expiresAt: Date.now() + this.cacheTtlMs,
        });
      }

      return context;
    } catch (error) {
      console.error('Failed to resolve API key:', error);
      return null;
    }
  }

  /**
   * Validate that the API key has access to the requested scope
   */
  validateScope(
    context: ApiKeyContext,
    requiredScope: {
      organizationId?: string;
      teamId?: string;
      environmentId?: string;
    },
  ): boolean {
    const { binding } = context;

    // Check organization access
    if (requiredScope.organizationId) {
      if (binding.scope === 'env' || binding.scope === 'team') {
        // For env/team scoped keys, check if they belong to the required org
        return context.organization?.id === requiredScope.organizationId;
      }
      if (binding.scope === 'org') {
        return binding.organizationId === requiredScope.organizationId;
      }
    }

    // Check team access
    if (requiredScope.teamId) {
      if (binding.scope === 'env') {
        // For env scoped keys, check if they belong to the required team
        return context.team?.id === requiredScope.teamId;
      }
      if (binding.scope === 'team' || binding.scope === 'org') {
        return binding.teamId === requiredScope.teamId;
      }
    }

    // Check environment access
    if (requiredScope.environmentId) {
      if (binding.scope === 'env') {
        return binding.environmentId === requiredScope.environmentId;
      }
      // Team and org scoped keys have access to all environments in their scope
      if (binding.scope === 'team' || binding.scope === 'org') {
        return context.environment?.id === requiredScope.environmentId;
      }
    }

    return true;
  }

  /**
   * Clear cache entry for a specific API key
   */
  invalidateCache(apiKey: string): void {
    if (this.cache) {
      const cacheKey = `${this.cacheKeyPrefix}${apiKey}`;
      this.cache.delete(cacheKey);
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
