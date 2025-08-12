import { and, eq, sql } from 'drizzle-orm';
import type { ProviderCredential, ProviderModel } from '~/core/schemas/database';
import {
  providerCredentialsTable,
  providerModelsTable,
  providersTable,
} from '~/drizzle/schema/general';
import type { Database } from '../database';
import type { RoutingContext, RoutingDecision, TargetWithModel } from './types';

export interface ProviderHealth {
  providerId: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latencyMs: number;
  successRate: number;
  lastCheck: Date;
  region?: string;
}

export interface LoadBalancingConfig {
  strategy: 'round_robin' | 'least_connections' | 'weighted' | 'random';
  weights?: Map<string, number>;
  maxRetries: number;
  timeoutMs: number;
}

export class ProviderSelection {
  private healthCache = new Map<string, ProviderHealth>();
  private connectionCounts = new Map<string, number>();
  private roundRobinIndex = new Map<string, number>();

  constructor(private db: Database) {}

  async selectProvider(
    context: RoutingContext,
    decision: RoutingDecision,
    config?: LoadBalancingConfig,
  ): Promise<ProviderInfo | null> {
    const providerModel = await this.getProviderModel(decision.providerModelId);
    if (!providerModel) {
      return null;
    }

    const credentials = await this.getProviderCredentials(
      providerModel.providerModel.providerId,
      context.teamId,
      context.environmentId,
    );

    if (!credentials) {
      return null;
    }

    const health = await this.getProviderHealth(
      providerModel.providerModel.providerId,
      context.userRegion,
    );

    if (!this.isProviderAvailable(health, decision)) {
      return this.handleFailover(context, decision, config);
    }

    this.updateConnectionCount(providerModel.providerModel.providerId, 1);

    return {
      providerModel: providerModel.providerModel,
      credentials,
      health,
      config: {
        timeoutMs: decision.timeoutMs || config?.timeoutMs || 30000,
        maxRetries: decision.maxRetries || config?.maxRetries || 3,
      },
    };
  }

  async getProviderModel(providerModelId: string) {
    const result = await this.db
      .select({
        providerModel: providerModelsTable,
        provider: providersTable,
      })
      .from(providerModelsTable)
      .innerJoin(providersTable, eq(providerModelsTable.providerId, providersTable.id))
      .where(eq(providerModelsTable.id, providerModelId))
      .limit(1);

    return result[0] || null;
  }

  async getProviderCredentials(providerId: string, teamId: string, environmentId: string) {
    // Try environment-specific credentials first, then team, then organization
    const credentials = await this.db
      .select()
      .from(providerCredentialsTable)
      .where(
        and(
          eq(providerCredentialsTable.providerId, providerId),
          eq(providerCredentialsTable.status, 'active'),
          sql`(
            (${providerCredentialsTable.environmentId} = ${environmentId}) OR
            (${providerCredentialsTable.teamId} = ${teamId} AND ${providerCredentialsTable.environmentId} IS NULL) OR
            (${providerCredentialsTable.orgId} IS NOT NULL AND ${providerCredentialsTable.teamId} IS NULL)
          )`,
        ),
      )
      .orderBy(
        sql`CASE 
          WHEN ${providerCredentialsTable.environmentId} = ${environmentId} THEN 1
          WHEN ${providerCredentialsTable.teamId} = ${teamId} THEN 2
          ELSE 3
        END`,
      )
      .limit(1);

    return credentials[0] || null;
  }

  async getProviderHealth(providerId: string, region?: string): Promise<ProviderHealth> {
    const cacheKey = `${providerId}:${region || 'default'}`;
    const cached = this.healthCache.get(cacheKey);

    if (cached && Date.now() - cached.lastCheck.getTime() < 60000) {
      // 1 minute cache
      return cached;
    }

    // In a real implementation, this would check actual provider health
    // For now, we'll use a simple mock based on provider status
    const provider = await this.db
      .select()
      .from(providersTable)
      .where(eq(providersTable.id, providerId))
      .limit(1);

    if (!provider[0]) {
      throw new Error(`Provider ${providerId} not found`);
    }

    const health: ProviderHealth = {
      providerId,
      status: this.mapProviderStatus(provider[0].status),
      latencyMs: this.getMockLatency(providerId, region),
      successRate: this.getMockSuccessRate(provider[0].status),
      lastCheck: new Date(),
      region,
    };

    this.healthCache.set(cacheKey, health);
    return health;
  }

  private mapProviderStatus(status: string | null): ProviderHealth['status'] {
    switch (status) {
      case 'active':
        return 'healthy';
      case 'degraded':
        return 'degraded';
      case 'disabled':
        return 'unhealthy';
      default:
        return 'unhealthy';
    }
  }

  private getMockLatency(_providerId: string, region?: string): number {
    // Mock latency based on provider and region
    const baseLatency = 100;
    const regionMultiplier = region ? 1.2 : 1.0;
    const providerVariance = Math.random() * 50;
    return Math.round(baseLatency * regionMultiplier + providerVariance);
  }

  private getMockSuccessRate(status: string | null): number {
    switch (status) {
      case 'active':
        return 0.99;
      case 'degraded':
        return 0.85;
      case 'disabled':
        return 0.0;
      default:
        return 0.0;
    }
  }

  private isProviderAvailable(health: ProviderHealth, decision: RoutingDecision): boolean {
    if (health.status === 'unhealthy') {
      return false;
    }

    if (health.status === 'degraded' && health.successRate < 0.8) {
      return false;
    }

    // Check region constraints if specified
    if (decision.targetId && health.region) {
      // This would be expanded to check routing target region constraints
    }

    return true;
  }

  private async handleFailover(
    context: RoutingContext,
    decision: RoutingDecision,
    config?: LoadBalancingConfig,
  ): Promise<ProviderInfo | null> {
    if (!decision.fallbackOptions || decision.fallbackOptions.length === 0) {
      return null;
    }

    // Try fallback options in order
    for (const fallback of decision.fallbackOptions) {
      const fallbackProvider = await this.selectProvider(context, fallback, config);
      if (fallbackProvider) {
        return fallbackProvider;
      }
    }

    return null;
  }

  private updateConnectionCount(providerId: string, delta: number) {
    const current = this.connectionCounts.get(providerId) || 0;
    this.connectionCounts.set(providerId, Math.max(0, current + delta));
  }

  // Load balancing methods for when we have multiple healthy providers
  selectByRoundRobin(providers: TargetWithModel[], groupKey: string): TargetWithModel {
    const currentIndex = this.roundRobinIndex.get(groupKey) || 0;
    const selectedProvider = providers[currentIndex % providers.length]!;
    this.roundRobinIndex.set(groupKey, currentIndex + 1);
    return selectedProvider;
  }

  selectByLeastConnections(providers: TargetWithModel[]): TargetWithModel {
    return providers.reduce((least, current) => {
      const leastConnections = this.connectionCounts.get(least.providerModel.providerId) || 0;
      const currentConnections = this.connectionCounts.get(current.providerModel.providerId) || 0;
      return currentConnections < leastConnections ? current : least;
    });
  }

  selectByWeight(providers: TargetWithModel[]): TargetWithModel {
    const totalWeight = providers.reduce((sum, p) => sum + (p.target.weight || 1), 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const provider of providers) {
      currentWeight += provider.target.weight || 1;
      if (random <= currentWeight) {
        return provider;
      }
    }

    return providers[0]!;
  }

  selectByRandom(providers: TargetWithModel[]): TargetWithModel {
    const randomIndex = Math.floor(Math.random() * providers.length);
    return providers[randomIndex]!;
  }

  // Cleanup method to reset connection counts
  releaseProvider(providerId: string) {
    this.updateConnectionCount(providerId, -1);
  }

  // Health check methods
  async performHealthCheck(providerId: string, region?: string): Promise<ProviderHealth> {
    // In a real implementation, this would make an actual health check request
    // For now, we'll update the cache with fresh mock data
    const cacheKey = `${providerId}:${region || 'default'}`;
    const health = await this.getProviderHealth(providerId, region);
    this.healthCache.set(cacheKey, health);
    return health;
  }

  async performBulkHealthCheck(
    providerIds: string[],
    region?: string,
  ): Promise<Map<string, ProviderHealth>> {
    const results = new Map<string, ProviderHealth>();

    // In production, these would be performed in parallel
    for (const providerId of providerIds) {
      try {
        const health = await this.performHealthCheck(providerId, region);
        results.set(providerId, health);
      } catch (error) {
        // Mark as unhealthy if health check fails
        results.set(providerId, {
          providerId,
          status: 'unhealthy',
          latencyMs: Number.MAX_SAFE_INTEGER,
          successRate: 0,
          lastCheck: new Date(),
          region,
        });
      }
    }

    return results;
  }

  // Method to clear health cache (useful for testing or manual refresh)
  clearHealthCache() {
    this.healthCache.clear();
  }

  // Method to get current health status for monitoring
  getHealthStatus(): Map<string, ProviderHealth> {
    return new Map(this.healthCache);
  }
}

export interface ProviderInfo {
  providerModel: ProviderModel;
  credentials: ProviderCredential;
  health: ProviderHealth;
  config: {
    timeoutMs: number;
    maxRetries: number;
  };
}
