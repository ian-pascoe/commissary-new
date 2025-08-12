import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { Metadata } from '~/core/schemas/metadata';
import type { Modality } from '~/core/schemas/modality';
import type { ParameterMapping } from '~/core/schemas/parameter-mapping';
import { apiKeysTable, organizationsTable, teamsTable, usersTable } from './auth';
import { baseModel } from './utils';

// Environments scoped to a Team (teamsTable acts as the project boundary)
export const environmentsTable = pgTable(
  'environments',
  {
    ...baseModel('env'),
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id, { onDelete: 'cascade' }),

    name: text('name').notNull(), // e.g., "Development"
    type: text('type', { enum: ['dev', 'staging', 'prod', 'custom'] }).notNull(),
    metadata: jsonb('metadata').$type<Metadata>(),
  },
  (t) => [
    index('env_team_idx').on(t.teamId),
    uniqueIndex('env_team_name_unq').on(t.teamId, t.name),
    index('env_team_type_idx').on(t.teamId, t.type),
  ],
);

// Bind Better-Auth API keys to Team and Environment without modifying auth tables
export const apiKeyBindingsTable = pgTable(
  'api_key_bindings',
  {
    ...baseModel('apib'),
    apiKeyId: text('api_key_id')
      .notNull()
      .references(() => apiKeysTable.id, { onDelete: 'cascade' }),
    organizationId: text('organization_id').references(() => organizationsTable.id, {
      onDelete: 'cascade',
    }),
    teamId: text('team_id').references(() => teamsTable.id, {
      onDelete: 'cascade',
    }),
    environmentId: text('environment_id').references(() => environmentsTable.id, {
      onDelete: 'cascade',
    }),
    scope: text('scope', { enum: ['env', 'team', 'org'] }).default('team'),
  },
  (t) => [
    index('apib_api_key_idx').on(t.apiKeyId),
    index('apib_team_env_idx').on(t.teamId, t.environmentId),
    index('apib_org_idx').on(t.organizationId),
    uniqueIndex('apib_unique_binding').on(
      t.apiKeyId,
      t.organizationId,
      t.teamId,
      t.environmentId,
      t.scope,
    ),
  ],
);

// Provider and model catalog
export const providersTable = pgTable(
  'providers',
  {
    ...baseModel('prov'),

    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    status: text('status', { enum: ['active', 'degraded', 'disabled'] }),
    baseUrl: text('base_url'),
    metadata: jsonb('metadata').$type<Metadata>(),
  },
  (t) => [index('prov_status_idx').on(t.status), index('prov_name_idx').on(t.name)],
);

export const modelsTable = pgTable(
  'models',
  {
    ...baseModel('model'),

    slug: text('slug').notNull().unique(),
    displayName: text('display_name').notNull(),
    // Multiple modalities allowed; store as JSON array of strings
    inputModalities: jsonb('input_modalities').$type<Modality[]>(),
    outputModalities: jsonb('output_modalities').$type<Modality[]>(),
    contextWindow: integer('context_window'),
    metadata: jsonb('metadata').$type<Metadata>(),
  },
  (t) => [index('model_name_idx').on(t.displayName)],
);

export const providerModelsTable = pgTable(
  'provider_models',
  {
    ...baseModel('pmodel'),
    providerId: text('provider_id')
      .notNull()
      .references(() => providersTable.id, { onDelete: 'cascade' }),
    modelId: text('model_id')
      .notNull()
      .references(() => modelsTable.id, { onDelete: 'cascade' }),

    slug: text('slug').notNull(), // provider-specific model identifier
    endpointPath: text('endpoint_path').notNull(),
    apiSpec: text('api_spec', { enum: ['openai', 'anthropic', 'google', 'unknown'] }).notNull(),
    inputModalities: jsonb('input_modalities').$type<Modality[]>(),
    outputModalities: jsonb('output_modalities').$type<Modality[]>(),
    maxOutputTokens: integer('max_output_tokens'),
    tokenizer: text('tokenizer'),
    quantization: text('quantization', {
      enum: ['int4', 'int8', 'fp4', 'fp6', 'fp8', 'fp16', 'bf16', 'fp32', 'unknown'],
    }),
    dimensions: integer('dimensions'), // For embedding models
    parameterMapping: jsonb('parameter_mapping').$type<ParameterMapping>(), // Mapping their supported parameters to ours
    safetyFeatures: jsonb('safety_features').$type<string[]>(), // e.g., ["content-filter", "rate-limits"]
    metadata: jsonb('metadata').$type<Metadata>(),
  },
  (t) => [
    index('pmodel_provider_idx').on(t.providerId),
    index('pmodel_model_idx').on(t.modelId),
    uniqueIndex('pmodel_provider_slug_unq').on(t.providerId, t.slug),
  ],
);

export const priceBookTable = pgTable(
  'price_book',
  {
    ...baseModel('price'),
    providerModelId: text('provider_model_id')
      .notNull()
      .references(() => providerModelsTable.id, { onDelete: 'cascade' }),

    region: text('region'), // optional
    unit: text('unit', {
      enum: ['token-input', 'token-output', 'request', 'image', 'audio', 'web-search'],
    }).notNull(),
    priceMicros: integer('price_micros').notNull(),
    currency: text('currency'), // e.g., USD
    effectiveFrom: timestamp('effective_from'),
    effectiveTo: timestamp('effective_to'),
  },
  (t) => [
    index('price_model_idx').on(t.providerModelId),
    index('price_lookup_idx').on(t.providerModelId, t.region, t.unit, t.effectiveFrom),
  ],
);

// Provider credentials per team/environment
export const providerCredentialsTable = pgTable(
  'provider_credentials',
  {
    ...baseModel('pcred'),
    providerId: text('provider_id')
      .notNull()
      .references(() => providersTable.id, { onDelete: 'cascade' }),
    orgId: text('organization_id').references(() => organizationsTable.id, {
      onDelete: 'cascade',
    }),
    teamId: text('team_id').references(() => teamsTable.id, {
      onDelete: 'cascade',
    }),
    environmentId: text('environment_id').references(() => environmentsTable.id, {
      onDelete: 'cascade',
    }),

    type: text('type', { enum: ['api-key', 'oauth', 'aws', 'custom'] }),
    name: text('name'), // display label
    value: text('value'), // encrypted json at rest
    status: text('status', { enum: ['active', 'revoked', 'expired'] }),
    region: text('region'),
    orgExternalId: text('org_external_id'),
    lastRotateAt: timestamp('last_rotate_at', { withTimezone: true }),
    metadata: jsonb('metadata').$type<Metadata>(),
  },
  (t) => [
    index('pcred_scope_idx').on(t.teamId, t.environmentId, t.providerId),
    index('pcred_status_idx').on(t.status),
    uniqueIndex('pcred_unique_name').on(t.providerId, t.teamId, t.environmentId, t.name),
  ],
);

// Map team/env aliases to concrete provider models
export const modelAliasesTable = pgTable(
  'model_aliases',
  {
    ...baseModel('alias'),
    organizationId: text('organization_id').references(() => organizationsTable.id, {
      onDelete: 'cascade',
    }),
    teamId: text('team_id').references(() => teamsTable.id, {
      onDelete: 'cascade',
    }),
    environmentId: text('environment_id').references(() => environmentsTable.id, {
      onDelete: 'cascade',
    }),
    providerModelId: text('provider_model_id')
      .notNull()
      .references(() => providerModelsTable.id, { onDelete: 'cascade' }),

    scope: text('scope', { enum: ['env', 'team', 'org', 'global'] }).default('team'),
    alias: text('alias').notNull(),
  },
  (t) => [
    index('alias_team_env_idx').on(t.teamId, t.environmentId, t.alias),
    index('alias_provider_idx').on(t.providerModelId),
    uniqueIndex('alias_scope_unq').on(
      t.scope,
      t.organizationId,
      t.teamId,
      t.environmentId,
      t.alias,
    ),
  ],
);

export const routingPoliciesTable = pgTable(
  'routing_policies',
  {
    ...baseModel('pol'),
    organizationId: text('organization_id').references(() => organizationsTable.id, {
      onDelete: 'cascade',
    }),
    teamId: text('team_id').references(() => teamsTable.id, {
      onDelete: 'cascade',
    }),
    environmentId: text('environment_id').references(() => environmentsTable.id, {
      onDelete: 'cascade',
    }),

    scope: text('scope', { enum: ['env', 'team', 'org', 'global'] }).default('team'),
    type: text('type', {
      enum: ['deterministic', 'weighted', 'performance', 'cost', 'hybrid'],
    }).notNull(),
    active: boolean('active').default(true),
    metadata: jsonb('metadata').$type<Metadata>(),
  },
  (t) => [
    index('pol_scope_idx').on(t.teamId, t.environmentId, t.scope),
    index('pol_active_idx').on(t.active),
    index('pol_type_idx').on(t.type),
  ],
);

export const routingRulesTable = pgTable(
  'routing_rules',
  {
    ...baseModel('rule'),
    policyId: text('policy_id')
      .notNull()
      .references(() => routingPoliciesTable.id, { onDelete: 'cascade' }),

    order: integer('order').notNull(),
    condition: jsonb('condition').$type<any>(), // JSON match conditions
    targetAlias: text('target_alias'), // points to model_aliases.alias
    active: boolean('active').default(true),
  },
  (t) => [
    index('rule_policy_idx').on(t.policyId),
    uniqueIndex('rule_order_unq').on(t.policyId, t.order),
    index('rule_active_idx').on(t.active),
  ],
);

export const routingTargetsTable = pgTable(
  'routing_targets',
  {
    ...baseModel('targ'),
    ruleId: text('rule_id')
      .notNull()
      .references(() => routingRulesTable.id, { onDelete: 'cascade' }),
    providerModelId: text('provider_model_id')
      .notNull()
      .references(() => providerModelsTable.id, { onDelete: 'cascade' }),

    weight: integer('weight').default(1),
    timeoutMs: integer('timeout_ms'),
    maxRetries: integer('max_retries'),
    jitterMs: integer('jitter_ms'),
    regionAllowlist: jsonb('region_allowlist'),
  },
  (t) => [
    index('targ_rule_idx').on(t.ruleId),
    uniqueIndex('targ_unique').on(t.ruleId, t.providerModelId),
  ],
);

// Traffic, messages, and responses
export const requestsTable = pgTable(
  'requests',
  {
    ...baseModel('req'),
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id, { onDelete: 'cascade' }),
    environmentId: text('environment_id')
      .notNull()
      .references(() => environmentsTable.id, { onDelete: 'cascade' }),
    apiKeyId: text('api_key_id').references(() => apiKeysTable.id, {
      onDelete: 'set null',
    }),
    userId: text('user_id').references(() => usersTable.id, {
      onDelete: 'set null',
    }),

    idempotencyKey: text('idempotency_key'),
    requestType: text('request_type', {
      enum: ['chat', 'completions', 'embeddings', 'images', 'audio'],
    }).notNull(),
    requestedModel: text('requested_model'), // alias or model id requested
    inputSize: integer('input_size'),
    routingDecisionId: text('routing_decision_id'),
    latencyMs: integer('latency_ms'),
    status: text('status'),
    errorClass: text('error_class'),
    metadata: jsonb('metadata').$type<Metadata>(),
  },
  (t) => [
    index('req_scope_time_idx').on(t.teamId, t.environmentId, t.createdAt),
    uniqueIndex('req_idem_unq').on(t.teamId, t.idempotencyKey),
    index('req_api_user_idx').on(t.apiKeyId, t.userId),
    index('req_type_model_idx').on(t.requestType, t.requestedModel),
  ],
);

export const messagesTable = pgTable(
  'messages',
  {
    ...baseModel('mess'),
    requestId: text('request_id')
      .notNull()
      .references(() => requestsTable.id, { onDelete: 'cascade' }),

    role: text('role', {
      enum: ['system', 'user', 'assistant', 'tool', 'function', 'developer'],
    }).notNull(),
    content: jsonb('content').$type<any>(), // parts/messages
  },
  (t) => [index('mess_req_idx').on(t.requestId)],
);

export const responsesTable = pgTable(
  'responses',
  {
    ...baseModel('resp'),
    requestId: text('request_id')
      .notNull()
      .references(() => requestsTable.id, { onDelete: 'cascade' }),
    providerModelId: text('provider_model_id').references(() => providerModelsTable.id, {
      onDelete: 'set null',
    }),

    outputSize: integer('output_size'),
    finishReason: text('finish_reason'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    totalTokens: integer('total_tokens'),
    status: text('status'),
  },
  (t) => [
    uniqueIndex('resp_req_unq').on(t.requestId),
    index('resp_provider_idx').on(t.providerModelId),
  ],
);

// Usage and quotas
export const usageEventsTable = pgTable(
  'usage_events',
  {
    ...baseModel('use'),
    requestId: text('request_id').references(() => requestsTable.id, {
      onDelete: 'set null',
    }),
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id, { onDelete: 'cascade' }),
    environmentId: text('environment_id')
      .notNull()
      .references(() => environmentsTable.id, { onDelete: 'cascade' }),
    apiKeyId: text('api_key_id').references(() => apiKeysTable.id, {
      onDelete: 'set null',
    }),
    providerId: text('provider_id').references(() => providersTable.id, {
      onDelete: 'set null',
    }),
    modelId: text('model_id').references(() => modelsTable.id, {
      onDelete: 'set null',
    }),
    providerModelId: text('provider_model_id').references(() => providerModelsTable.id, {
      onDelete: 'set null',
    }),

    alias: text('alias'),
    inputTokens: integer('input_tokens'),
    outputTokens: integer('output_tokens'),
    images: integer('images'),
    audio: integer('audio'),
    costMicros: integer('cost_micros'),
    currency: text('currency'),
  },
  (t) => [
    index('use_scope_time_idx').on(t.teamId, t.environmentId, t.createdAt),
    index('use_provider_model_idx').on(t.providerId, t.modelId, t.providerModelId),
    index('use_request_idx').on(t.requestId),
    index('use_alias_idx').on(t.alias),
  ],
);

export const quotasTable = pgTable(
  'quotas',
  {
    ...baseModel('quota'),
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id, { onDelete: 'cascade' }),
    environmentId: text('environment_id')
      .notNull()
      .references(() => environmentsTable.id, { onDelete: 'cascade' }),
    apiKeyId: text('api_key_id').references(() => apiKeysTable.id, {
      onDelete: 'set null',
    }),

    dailyTokens: integer('daily_tokens'),
    monthlyTokens: integer('monthly_tokens'),
    spendMicros: integer('spend_micros'),
    requestsPerDay: integer('requests_per_day'),
    tokensPerMinute: integer('tokens_per_minute'),
  },
  (t) => [uniqueIndex('quota_scope_unq').on(t.teamId, t.environmentId, t.apiKeyId)],
);

// Webhooks
export const webhookEndpointsTable = pgTable(
  'webhook_endpoints',
  {
    ...baseModel('whe'),
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id, { onDelete: 'cascade' }),
    environmentId: text('environment_id')
      .notNull()
      .references(() => environmentsTable.id, { onDelete: 'cascade' }),

    url: text('url').notNull(),
    secret: text('secret'), // encrypted at rest
    eventTypes: jsonb('event_types'), // array of event types
    active: boolean('active').default(true),
  },
  (t) => [
    index('whe_scope_idx').on(t.teamId, t.environmentId),
    index('whe_url_idx').on(t.url),
    uniqueIndex('whe_scope_url_unq').on(t.teamId, t.environmentId, t.url),
  ],
);

export const webhookDeliveriesTable = pgTable(
  'webhook_deliveries',
  {
    ...baseModel('whd'),
    endpointId: text('endpoint_id')
      .notNull()
      .references(() => webhookEndpointsTable.id, { onDelete: 'cascade' }),
    requestId: text('request_id').references(() => requestsTable.id, {
      onDelete: 'set null',
    }),

    payloadHash: text('payload_hash'),
    status: text('status'),
    latencyMs: integer('latency_ms'),
    nextRetryAt: timestamp('next_retry_at'),
    retryCount: integer('retry_count'),
    lastError: text('last_error'),
  },
  (t) => [
    index('whd_endpoint_time_idx').on(t.endpointId, t.createdAt),
    index('whd_request_idx').on(t.requestId),
  ],
);

// Audit logs
export const auditLogsTable = pgTable(
  'audit_logs',
  {
    ...baseModel('alog'),
    actorUserId: text('actor_user_id').references(() => usersTable.id, {
      onDelete: 'set null',
    }),
    actorApiKeyId: text('actor_api_key_id').references(() => apiKeysTable.id, {
      onDelete: 'set null',
    }),

    action: text('action').notNull(),
    target: text('target'),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    reason: text('reason'),
  },
  (t) => [
    index('alog_actor_user_idx').on(t.actorUserId, t.createdAt),
    index('alog_actor_key_idx').on(t.actorApiKeyId, t.createdAt),
    index('alog_action_idx').on(t.action),
  ],
);
