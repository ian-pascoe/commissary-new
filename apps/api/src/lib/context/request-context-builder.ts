import type { Context } from 'hono';
import type { Env } from '../../types/hono';
import { type ApiKeyContext, ApiKeyResolver } from '../auth/api-key-resolver';
import { ModelAliasResolver, type ResolvedModel } from '../models';
import type { Database } from '../database';

export interface RequestContext {
  apiKey: ApiKeyContext;
  request: {
    id: string;
    ip: string | undefined;
    userAgent: string | undefined;
    timestamp: Date;
    idempotencyKey: string | undefined;
  };
}

export interface RequestContextWithModel extends RequestContext {
  model: ResolvedModel;
}

export interface RequestContextBuilderOptions {
  enableApiKeyCache?: boolean;
  enableModelCache?: boolean;
  cacheKeyPrefix?: string;
  cacheTtlSeconds?: number;
}

export class RequestContextBuilder {
  private apiKeyResolver: ApiKeyResolver;
  private modelResolver: ModelAliasResolver;

  constructor(db: Database, options: RequestContextBuilderOptions = {}) {
    this.apiKeyResolver = new ApiKeyResolver(db, {
      enableCache: options.enableApiKeyCache,
      cacheKeyPrefix: options.cacheKeyPrefix ? `${options.cacheKeyPrefix}api_key:` : undefined,
      cacheTtlSeconds: options.cacheTtlSeconds,
    });

    this.modelResolver = new ModelAliasResolver(db, {
      enableCache: options.enableModelCache,
      cacheKeyPrefix: options.cacheKeyPrefix ? `${options.cacheKeyPrefix}model:` : undefined,
      cacheTtlSeconds: options.cacheTtlSeconds,
    });
  }

  /**
   * Build unified request context from Hono context
   */
  async buildContext(c: Context<Env>): Promise<RequestContext | null> {
    // Extract API key from Authorization header
    const authHeader = c.req.header('Authorization');
    const apiKey = this.apiKeyResolver.extractApiKey(authHeader);

    if (!apiKey) {
      return null;
    }

    // Resolve API key to full context
    const apiKeyContext = await this.apiKeyResolver.resolveApiKey(apiKey);
    if (!apiKeyContext) {
      return null;
    }

    // Build request metadata
    const requestId = c.req.header('X-Request-ID') || crypto.randomUUID();
    const ip = this.extractClientIp(c);
    const userAgent = c.req.header('User-Agent');
    const idempotencyKey = c.req.header('Idempotency-Key');

    return {
      apiKey: apiKeyContext,
      request: {
        id: requestId,
        ip,
        userAgent,
        timestamp: new Date(),
        idempotencyKey,
      },
    };
  }

  /**
   * Build request context with model resolution
   */
  async buildContextWithModel(
    c: Context<Env>,
    modelName: string,
  ): Promise<RequestContextWithModel | null> {
    // First build base context
    const baseContext = await this.buildContext(c);
    if (!baseContext) {
      return null;
    }

    // Resolve model with scope from API key context
    const resolvedModel = await this.modelResolver.resolveModel(modelName, {
      organizationId: baseContext.apiKey.organization?.id,
      teamId: baseContext.apiKey.team?.id,
      environmentId: baseContext.apiKey.environment?.id,
    });

    if (!resolvedModel) {
      return null;
    }

    return {
      ...baseContext,
      model: resolvedModel,
    };
  }

  /**
   * Extract client IP address with proxy support
   */
  private extractClientIp(c: Context<Env>): string | undefined {
    // Check common proxy headers
    const xForwardedFor = c.req.header('X-Forwarded-For');
    if (xForwardedFor) {
      // X-Forwarded-For can contain multiple IPs, take the first one
      return xForwardedFor.split(',')[0]?.trim();
    }

    const xRealIp = c.req.header('X-Real-IP');
    if (xRealIp) {
      return xRealIp;
    }

    const cfConnectingIp = c.req.header('CF-Connecting-IP');
    if (cfConnectingIp) {
      return cfConnectingIp;
    }

    // Fallback to Hono's built-in method if available
    // Note: This might not be available in all environments
    try {
      // @ts-ignore - Hono's req might have remoteAddr
      return c.req.remoteAddr || undefined;
    } catch {
      return undefined;
    }
  }

  /**
   * Validate scope access for the current context
   */
  validateAccess(
    context: RequestContext,
    requiredScope: {
      organizationId?: string;
      teamId?: string;
      environmentId?: string;
    },
  ): boolean {
    return this.apiKeyResolver.validateScope(context.apiKey, requiredScope);
  }

  /**
   * Clear API key cache
   */
  clearApiKeyCache(): void {
    this.apiKeyResolver.clearCache();
  }

  /**
   * Clear model cache
   */
  clearModelCache(): void {
    this.modelResolver.clearCache();
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.clearApiKeyCache();
    this.clearModelCache();
  }

  /**
   * Get cache statistics
   */
  getCacheStats() {
    return {
      apiKey: this.apiKeyResolver.getCacheStats(),
      model: this.modelResolver.getCacheStats(),
    };
  }
}
