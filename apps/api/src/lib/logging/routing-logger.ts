import type { Database } from '../database';
import { createId } from '~/core/utils/id';

export interface RoutingDecision {
  requestId?: string;
  teamId: string;
  environmentId: string;
  requestedModel: string;
  selectedProviderId: string;
  selectedProviderModelId: string;
  routingReason: 'deterministic' | 'weighted' | 'performance' | 'cost' | 'fallback' | 'default';
  policyId?: string;
  ruleId?: string;
  weight?: number;
  latencyMs?: number;
  metadata?: Record<string, any>;
}

export class RoutingDecisionLogger {
  constructor(private db: Database) {}

  async logRoutingDecision(decision: RoutingDecision): Promise<string> {
    const decisionId = createId('route');

    // For now, we'll store this in the request metadata until we have a dedicated routing_decisions table
    // In a production system, you'd want a separate table for routing decisions

    console.log('Routing Decision:', {
      id: decisionId,
      requestId: decision.requestId,
      requestedModel: decision.requestedModel,
      selectedProvider: decision.selectedProviderId,
      reason: decision.routingReason,
      policyId: decision.policyId,
      ruleId: decision.ruleId,
      weight: decision.weight,
      latencyMs: decision.latencyMs,
    });

    return decisionId;
  }

  static createDecision(
    context: {
      requestId?: string;
      teamId: string;
      environmentId: string;
      requestedModel: string;
    },
    selection: {
      providerId: string;
      providerModelId: string;
      reason: 'deterministic' | 'weighted' | 'performance' | 'cost' | 'fallback' | 'default';
      policyId?: string;
      ruleId?: string;
      weight?: number;
      metadata?: Record<string, any>;
    },
  ): RoutingDecision {
    return {
      requestId: context.requestId,
      teamId: context.teamId,
      environmentId: context.environmentId,
      requestedModel: context.requestedModel,
      selectedProviderId: selection.providerId,
      selectedProviderModelId: selection.providerModelId,
      routingReason: selection.reason,
      policyId: selection.policyId,
      ruleId: selection.ruleId,
      weight: selection.weight,
      metadata: selection.metadata,
    };
  }
}
