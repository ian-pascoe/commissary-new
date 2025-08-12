import { and, eq, sql } from 'drizzle-orm';
import type { RoutingPolicy, RoutingRule } from '~/core/schemas/database';
import { RoutingCondition } from '~/core/schemas/routing-condition';
import {
  providerModelsTable,
  providersTable,
  routingPoliciesTable,
  routingRulesTable,
  routingTargetsTable,
} from '~/drizzle/schema/general';
import type { Database } from '../database';
import type {
  PolicyWithRules,
  RoutingContext,
  RoutingDecision,
  RoutingType,
  RuleWithTargets,
  TargetWithModel,
} from './types';

export class PolicyEngine {
  constructor(private db: Database) {}

  async loadActivePolicies(context: RoutingContext): Promise<PolicyWithRules[]> {
    // Load policies in scope priority order: env > team > org > global
    const policies: RoutingPolicy[] = await this.db
      .select()
      .from(routingPoliciesTable)
      .where(
        and(
          eq(routingPoliciesTable.active, true),
          sql`(
            (${routingPoliciesTable.scope} = 'env' AND ${routingPoliciesTable.environmentId} = ${context.environmentId}) OR
            (${routingPoliciesTable.scope} = 'team' AND ${routingPoliciesTable.teamId} = ${context.teamId}) OR
            (${routingPoliciesTable.scope} = 'org' AND ${routingPoliciesTable.organizationId} = ${context.organizationId}) OR
            (${routingPoliciesTable.scope} = 'global')
          )`,
        ),
      )
      .orderBy(
        sql`CASE ${routingPoliciesTable.scope}
          WHEN 'env' THEN 1
          WHEN 'team' THEN 2
          WHEN 'org' THEN 3
          WHEN 'global' THEN 4
        END`,
      );

    const policiesWithRules: PolicyWithRules[] = [];

    for (const policy of policies) {
      const rules = await this.loadRulesForPolicy(policy.id);
      if (rules.length > 0) {
        policiesWithRules.push({
          policy,
          rules,
        });
      }
    }

    return policiesWithRules;
  }

  private async loadRulesForPolicy(policyId: string): Promise<RuleWithTargets[]> {
    const rules: RoutingRule[] = await this.db
      .select()
      .from(routingRulesTable)
      .where(and(eq(routingRulesTable.policyId, policyId), eq(routingRulesTable.active, true)))
      .orderBy(routingRulesTable.order);

    const rulesWithTargets: RuleWithTargets[] = [];

    for (const rule of rules) {
      const targets = await this.loadTargetsForRule(rule.id);
      if (targets.length > 0) {
        rulesWithTargets.push({
          rule,
          targets,
        });
      }
    }

    return rulesWithTargets;
  }

  private async loadTargetsForRule(ruleId: string): Promise<TargetWithModel[]> {
    const targetsWithModels = await this.db
      .select({
        target: routingTargetsTable,
        providerModel: providerModelsTable,
        provider: providersTable,
      })
      .from(routingTargetsTable)
      .innerJoin(
        providerModelsTable,
        eq(routingTargetsTable.providerModelId, providerModelsTable.id),
      )
      .innerJoin(providersTable, eq(providerModelsTable.providerId, providersTable.id))
      .where(eq(routingTargetsTable.ruleId, ruleId));

    return targetsWithModels.map((row: any) => ({
      target: row.target,
      providerModel: {
        ...row.providerModel,
        provider: row.provider,
      },
      isHealthy: row.provider.status === 'active',
      latencyMs: undefined,
      costScore: undefined,
    }));
  }

  async executeRouting(
    context: RoutingContext,
    policies: PolicyWithRules[],
  ): Promise<RoutingDecision | null> {
    for (const { policy, rules } of policies) {
      const decision = await this.executePolicy(context, policy, rules);
      if (decision) {
        return decision;
      }
    }

    return null;
  }

  private async executePolicy(
    context: RoutingContext,
    policy: any,
    rules: RuleWithTargets[],
  ): Promise<RoutingDecision | null> {
    for (const { rule, targets } of rules) {
      if (await this.evaluateCondition(context, rule.condition)) {
        const decision = await this.selectFromTargets(
          policy.type as RoutingType,
          targets,
          policy.id,
          rule.id,
        );
        if (decision) {
          return decision;
        }
      }
    }

    return null;
  }

  private async evaluateCondition(context: RoutingContext, condition: any): Promise<boolean> {
    if (!condition) {
      return true;
    }

    try {
      const parsedCondition = RoutingCondition.parse(condition);
      return this.matchesCondition(context, parsedCondition);
    } catch {
      return false;
    }
  }

  private matchesCondition(context: RoutingContext, condition: RoutingCondition): boolean {
    if (condition.model && condition.model !== context.requestedModel) {
      return false;
    }

    if (condition.modelPattern) {
      const regex = new RegExp(condition.modelPattern);
      if (!regex.test(context.requestedModel)) {
        return false;
      }
    }

    if (condition.region && condition.region !== context.userRegion) {
      return false;
    }

    if (condition.timeOfDay) {
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = parseInt(condition.timeOfDay.start.split(':')[0] || '0');
      const endHour = parseInt(condition.timeOfDay.end.split(':')[0] || '24');

      if (currentHour < startHour || currentHour > endHour) {
        return false;
      }
    }

    if (condition.requestSize && context.requestMetadata?.inputSize) {
      const inputSize = context.requestMetadata.inputSize as number;
      if (condition.requestSize.min && inputSize < condition.requestSize.min) {
        return false;
      }
      if (condition.requestSize.max && inputSize > condition.requestSize.max) {
        return false;
      }
    }

    if (condition.metadata && context.requestMetadata) {
      for (const [key, value] of Object.entries(condition.metadata)) {
        if (context.requestMetadata[key] !== value) {
          return false;
        }
      }
    }

    return true;
  }

  private async selectFromTargets(
    routingType: RoutingType,
    targets: TargetWithModel[],
    policyId: string,
    ruleId: string,
  ): Promise<RoutingDecision | null> {
    const healthyTargets = targets.filter((t) => t.isHealthy);
    if (healthyTargets.length === 0) {
      return null;
    }

    let selectedTarget: TargetWithModel;

    switch (routingType) {
      case 'deterministic':
        selectedTarget = healthyTargets[0]!;
        break;

      case 'weighted':
        selectedTarget = this.selectWeightedTarget(healthyTargets);
        break;

      case 'performance':
        selectedTarget = this.selectPerformanceTarget(healthyTargets);
        break;

      case 'cost':
        selectedTarget = this.selectCostTarget(healthyTargets);
        break;

      case 'hybrid':
        selectedTarget = this.selectHybridTarget(healthyTargets);
        break;

      default:
        selectedTarget = healthyTargets[0]!;
    }

    return {
      providerModelId: selectedTarget.target.providerModelId,
      policyId,
      ruleId,
      targetId: selectedTarget.target.id,
      weight: selectedTarget.target.weight || 1,
      timeoutMs: selectedTarget.target.timeoutMs || undefined,
      maxRetries: selectedTarget.target.maxRetries || undefined,
      reason: `Selected via ${routingType} routing`,
      fallbackOptions: this.getFallbackOptions(healthyTargets, selectedTarget, policyId, ruleId),
    };
  }

  private selectWeightedTarget(targets: TargetWithModel[]): TargetWithModel {
    const totalWeight = targets.reduce((sum, t) => sum + (t.target.weight || 1), 0);
    const random = Math.random() * totalWeight;

    let currentWeight = 0;
    for (const target of targets) {
      currentWeight += target.target.weight || 1;
      if (random <= currentWeight) {
        return target;
      }
    }

    return targets[0]!;
  }

  private selectPerformanceTarget(targets: TargetWithModel[]): TargetWithModel {
    const sortedTargets = [...targets].sort((a, b) => {
      const latencyA = a.latencyMs || Number.MAX_SAFE_INTEGER;
      const latencyB = b.latencyMs || Number.MAX_SAFE_INTEGER;
      return latencyA - latencyB;
    });

    return sortedTargets[0]!;
  }

  private selectCostTarget(targets: TargetWithModel[]): TargetWithModel {
    const sortedTargets = [...targets].sort((a, b) => {
      const costA = a.costScore || Number.MAX_SAFE_INTEGER;
      const costB = b.costScore || Number.MAX_SAFE_INTEGER;
      return costA - costB;
    });

    return sortedTargets[0]!;
  }

  private selectHybridTarget(targets: TargetWithModel[]): TargetWithModel {
    const scoredTargets = targets.map((target) => {
      const latencyScore = (target.latencyMs || 1000) / 1000;
      const costScore = (target.costScore || 1) / 10;
      const hybridScore = latencyScore * 0.6 + costScore * 0.4;

      return { target, score: hybridScore };
    });

    scoredTargets.sort((a, b) => a.score - b.score);
    return scoredTargets[0]!.target;
  }

  private getFallbackOptions(
    allTargets: TargetWithModel[],
    selectedTarget: TargetWithModel,
    policyId: string,
    ruleId: string,
  ): RoutingDecision[] {
    return allTargets
      .filter((t) => t.target.id !== selectedTarget.target.id)
      .map((target) => ({
        providerModelId: target.target.providerModelId,
        policyId,
        ruleId,
        targetId: target.target.id,
        weight: target.target.weight || 1,
        timeoutMs: target.target.timeoutMs || undefined,
        maxRetries: target.target.maxRetries || undefined,
        reason: 'Fallback option',
      }));
  }
}
