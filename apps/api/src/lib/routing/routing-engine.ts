import type { Database } from '../database';
import { PolicyEngine } from './policy-engine';
import { ProviderSelection, type ProviderInfo } from './provider-selection';
import type { RoutingContext, RoutingDecision } from './types';

export interface RoutingResult {
  decision: RoutingDecision;
  providerInfo: ProviderInfo;
  routingTime: number;
  fallbacksUsed: number;
}

export interface RoutingEngineConfig {
  enableFallback: boolean;
  maxFallbackAttempts: number;
  healthCheckEnabled: boolean;
  cacheEnabled: boolean;
  defaultTimeoutMs: number;
}

export class RoutingEngine {
  private policyEngine: PolicyEngine;
  private providerSelection: ProviderSelection;
  private config: RoutingEngineConfig;

  constructor(db: Database, config: Partial<RoutingEngineConfig> = {}) {
    this.policyEngine = new PolicyEngine(db);
    this.providerSelection = new ProviderSelection(db);
    this.config = {
      enableFallback: true,
      maxFallbackAttempts: 3,
      healthCheckEnabled: true,
      cacheEnabled: true,
      defaultTimeoutMs: 30000,
      ...config,
    };
  }

  async route(context: RoutingContext): Promise<RoutingResult | null> {
    const startTime = Date.now();

    try {
      // Step 1: Load and evaluate routing policies
      const policies = await this.policyEngine.loadActivePolicies(context);
      if (policies.length === 0) {
        throw new Error('No active routing policies found');
      }

      // Step 2: Execute routing decision
      const decision = await this.policyEngine.executeRouting(context, policies);
      if (!decision) {
        throw new Error('No routing decision could be made');
      }

      // Step 3: Select and validate provider
      const providerInfo = await this.attemptProviderSelection(
        context,
        decision,
        0, // fallback attempt count
      );

      if (!providerInfo) {
        throw new Error('No available providers found');
      }

      const routingTime = Date.now() - startTime;

      return {
        decision,
        providerInfo,
        routingTime,
        fallbacksUsed: this.countFallbacksUsed(decision),
      };
    } catch (error) {
      console.error('Routing failed:', error);
      return null;
    }
  }

  private async attemptProviderSelection(
    context: RoutingContext,
    decision: RoutingDecision,
    fallbackAttempt: number,
  ): Promise<ProviderInfo | null> {
    // Attempt to select the primary target
    const providerInfo = await this.providerSelection.selectProvider(context, decision);

    if (providerInfo) {
      return providerInfo;
    }

    // If primary fails and fallbacks are enabled, try fallback options
    if (
      this.config.enableFallback &&
      fallbackAttempt < this.config.maxFallbackAttempts &&
      decision.fallbackOptions &&
      decision.fallbackOptions.length > 0
    ) {
      for (const fallbackDecision of decision.fallbackOptions) {
        const fallbackProvider = await this.attemptProviderSelection(
          context,
          fallbackDecision,
          fallbackAttempt + 1,
        );

        if (fallbackProvider) {
          return fallbackProvider;
        }
      }
    }

    return null;
  }

  private countFallbacksUsed(decision: RoutingDecision): number {
    return decision.fallbackOptions?.length || 0;
  }

  // Region-based routing utilities
  async routeWithRegionPreference(
    context: RoutingContext,
    preferredRegions: string[],
  ): Promise<RoutingResult | null> {
    // Try each preferred region in order
    for (const region of preferredRegions) {
      const regionContext = { ...context, userRegion: region };
      const result = await this.route(regionContext);

      if (result) {
        return result;
      }
    }

    // Fall back to default routing without region preference
    return this.route(context);
  }

  // Circuit breaker pattern for provider health
  async routeWithCircuitBreaker(
    context: RoutingContext,
    circuitBreakerThreshold: number = 0.5,
  ): Promise<RoutingResult | null> {
    const result = await this.route(context);

    if (!result) {
      return null;
    }

    // Check if provider health is below threshold
    if (result.providerInfo.health.successRate < circuitBreakerThreshold) {
      console.warn(
        `Provider ${result.providerInfo.providerModel.providerId} below health threshold: ${result.providerInfo.health.successRate}`,
      );

      // Mark provider as degraded and attempt fallback
      const fallbackContext = { ...context };
      return this.route(fallbackContext);
    }

    return result;
  }

  // Batch routing for multiple requests
  async routeBatch(contexts: RoutingContext[]): Promise<(RoutingResult | null)[]> {
    // Route requests in parallel for better performance
    const routingPromises = contexts.map((context) => this.route(context));
    return Promise.all(routingPromises);
  }

  // Health check and monitoring utilities
  async performSystemHealthCheck(): Promise<{
    healthyProviders: number;
    degradedProviders: number;
    unhealthyProviders: number;
    totalProviders: number;
  }> {
    const healthStatus = this.providerSelection.getHealthStatus();

    let healthy = 0;
    let degraded = 0;
    let unhealthy = 0;

    for (const health of healthStatus.values()) {
      switch (health.status) {
        case 'healthy':
          healthy++;
          break;
        case 'degraded':
          degraded++;
          break;
        case 'unhealthy':
          unhealthy++;
          break;
      }
    }

    return {
      healthyProviders: healthy,
      degradedProviders: degraded,
      unhealthyProviders: unhealthy,
      totalProviders: healthStatus.size,
    };
  }

  // Cache management
  clearHealthCache() {
    this.providerSelection.clearHealthCache();
  }

  // Configuration updates
  updateConfig(newConfig: Partial<RoutingEngineConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  getConfig(): RoutingEngineConfig {
    return { ...this.config };
  }

  // Utility method for testing routing decisions without actually routing
  async dryRunRouting(context: RoutingContext): Promise<{
    policies: any[];
    decision: RoutingDecision | null;
    availableProviders: number;
  }> {
    const policies = await this.policyEngine.loadActivePolicies(context);
    const decision = await this.policyEngine.executeRouting(context, policies);

    let availableProviders = 0;
    if (decision) {
      const providerInfo = await this.providerSelection.getProviderModel(decision.providerModelId);
      if (providerInfo) {
        availableProviders = 1;
        if (decision.fallbackOptions) {
          for (const fallback of decision.fallbackOptions) {
            const fallbackProvider = await this.providerSelection.getProviderModel(
              fallback.providerModelId,
            );
            if (fallbackProvider) {
              availableProviders++;
            }
          }
        }
      }
    }

    return {
      policies,
      decision,
      availableProviders,
    };
  }
}
