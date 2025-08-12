import type {
  Provider,
  ProviderModel,
  RoutingPolicy,
  RoutingRule,
  RoutingTarget,
} from '~/core/schemas/database';

export interface RoutingContext {
  teamId: string;
  environmentId: string;
  organizationId?: string;
  requestedModel: string;
  requestMetadata?: Record<string, unknown>;
  userRegion?: string;
}

export interface RoutingDecision {
  providerModelId: string;
  policyId: string;
  ruleId: string;
  targetId: string;
  weight: number;
  timeoutMs?: number;
  maxRetries?: number;
  reason: string;
  fallbackOptions?: RoutingDecision[];
}

export interface PolicyWithRules {
  policy: RoutingPolicy;
  rules: RuleWithTargets[];
}

export interface RuleWithTargets {
  rule: RoutingRule;
  targets: TargetWithModel[];
}

export interface TargetWithModel {
  target: RoutingTarget;
  providerModel: ProviderModel & { provider?: Provider };
  isHealthy: boolean;
  latencyMs?: number;
  costScore?: number;
}

export type RoutingType = 'deterministic' | 'weighted' | 'performance' | 'cost' | 'hybrid';

export interface RoutingMetrics {
  avgLatencyMs: number;
  successRate: number;
  costPerToken: number;
  lastUpdated: Date;
}
