import {
  boolean,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

import { createId } from '~/core/utils/id';
import {
  apiKeysTable,
  organizationsTable,
  teamsTable,
  usersTable,
} from './auth';

// Environments scoped to a Team (teamsTable acts as the project boundary)
export const environmentsTable = pgTable('environments', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('env')),
  teamId: text('team_id')
    .notNull()
    .references(() => teamsTable.id, { onDelete: 'cascade' }),
  name: text('name').notNull(), // e.g., "Development"
  type: text('type', { enum: ['dev', 'staging', 'prod', 'custom'] }).notNull(),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
  metadata: jsonb('metadata'),
});

// Bind Better-Auth API keys to Team and Environment without modifying auth tables
export const apiKeyBindingsTable = pgTable('api_key_bindings', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('akb')),
  apiKeyId: text('api_key_id')
    .notNull()
    .references(() => apiKeysTable.id, { onDelete: 'cascade' }),
  scope: text('scope', { enum: ['env', 'team', 'org'] }).default('team'),
  organizationId: text('organization_id').references(
    () => organizationsTable.id,
    { onDelete: 'cascade' },
  ),
  teamId: text('team_id').references(() => teamsTable.id, {
    onDelete: 'cascade',
  }),
  environmentId: text('environment_id').references(() => environmentsTable.id, {
    onDelete: 'cascade',
  }),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// Per-key restrictions and allow/deny lists
export const keyRestrictionsTable = pgTable('key_restrictions', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('akr')),
  apiKeyId: text('api_key_id')
    .notNull()
    .references(() => apiKeysTable.id, { onDelete: 'cascade' }),
  ipAllowlist: jsonb('ip_allowlist'), // array of CIDRs/IPs
  ipBlocklist: jsonb('ip_blocklist'),
  originAllowlist: jsonb('origin_allowlist'), // array of origins
  pathScope: text('path_scope'), // e.g., /v1/chat/*
  qps: integer('qps'),
  qpm: integer('qpm'),
  modelAllowlist: jsonb('model_allowlist'), // array of aliases or provider_model ids
  modelDenylist: jsonb('model_denylist'),
  regionAllowlist: jsonb('region_allowlist'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// Provider and model catalog
export const providersTable = pgTable('providers', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('prov')),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  status: text('status', { enum: ['active', 'degraded', 'disabled'] }),
  authType: text('auth_type', { enum: ['api_key', 'oauth', 'custom'] }),
  baseUrl: text('base_url'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const modelsTable = pgTable('models', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('model')),
  slug: text('slug').notNull().unique(),
  displayName: text('display_name').notNull(),
  // Multiple modalities allowed; store as JSON array of strings
  inputModalities: jsonb('input_modalities'), // e.g., ["text","image","audio"]
  outputModalities: jsonb('output_modalities'),
  contextWindow: integer('context_window'),
  supportsTools: boolean('supports_tools'),
  supportsJSON: boolean('supports_json'),
  supportsStreaming: boolean('supports_streaming'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const providerModelsTable = pgTable('provider_models', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('pmod')),
  providerId: text('provider_id')
    .notNull()
    .references(() => providersTable.id, { onDelete: 'cascade' }),
  modelId: text('model_id')
    .notNull()
    .references(() => modelsTable.id, { onDelete: 'cascade' }),
  apiName: text('api_name'), // provider-specific model identifier
  endpointPath: text('endpoint_path'),
  // Multiple modalities allowed; store as JSON array of strings
  inputModalities: jsonb('input_modalities'),
  outputModalities: jsonb('output_modalities'),
  maxTokensDefault: integer('max_tokens_default'),
  tokenizerHint: text('tokenizer_hint'),
  safetyFeatures: jsonb('safety_features'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const priceBookTable = pgTable('price_book', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('price')),
  providerModelId: text('provider_model_id')
    .notNull()
    .references(() => providerModelsTable.id, { onDelete: 'cascade' }),
  region: text('region'), // optional
  unit: text('unit', {
    enum: ['token-input', 'token-output', 'request', 'image', 'audio'],
  }).notNull(),
  priceMicros: integer('price_micros').notNull(),
  currency: text('currency'), // e.g., USD
  effectiveFrom: timestamp('effective_from'),
  effectiveTo: timestamp('effective_to'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// Provider credentials per team/environment
export const providerCredentialsTable = pgTable('provider_credentials', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('pcred')),
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
  name: text('name'), // display label
  apiKey: text('api_key'), // store encrypted at rest; do not log
  region: text('region'),
  orgExternalId: text('org_external_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// Map team/env aliases to concrete provider models
export const modelAliasesTable = pgTable('model_aliases', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('alias')),
  scope: text('scope', { enum: ['env', 'team', 'org', 'global'] }).default(
    'team',
  ),
  organizationId: text('organization_id').references(
    () => organizationsTable.id,
    { onDelete: 'cascade' },
  ),
  teamId: text('team_id').references(() => teamsTable.id, {
    onDelete: 'cascade',
  }),
  environmentId: text('environment_id').references(() => environmentsTable.id, {
    onDelete: 'cascade',
  }),
  alias: text('alias').notNull(),
  providerModelId: text('provider_model_id')
    .notNull()
    .references(() => providerModelsTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// Basic routing configuration (Phase 1)
export const routingPoliciesTable = pgTable('routing_policies', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('rpol')),
  scope: text('scope', { enum: ['env', 'team', 'org', 'global'] }).default(
    'team',
  ),
  organizationId: text('organization_id').references(
    () => organizationsTable.id,
    { onDelete: 'cascade' },
  ),
  teamId: text('team_id').references(() => teamsTable.id, {
    onDelete: 'cascade',
  }),
  environmentId: text('environment_id').references(() => environmentsTable.id, {
    onDelete: 'cascade',
  }),
  type: text('type', {
    enum: ['deterministic', 'weighted', 'performance', 'cost', 'hybrid'],
  }).notNull(),
  active: boolean('active').default(true),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const routingRulesTable = pgTable('routing_rules', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('rrule')),
  policyId: text('policy_id')
    .notNull()
    .references(() => routingPoliciesTable.id, { onDelete: 'cascade' }),
  order: integer('order').notNull(),
  condition: jsonb('condition'), // JSON match conditions
  targetAlias: text('target_alias'), // points to model_aliases.alias
  active: boolean('active').default(true),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const routingTargetsTable = pgTable('routing_targets', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('rtgt')),
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
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// Traffic, messages, and responses
export const requestsTable = pgTable('requests', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('req')),
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
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const messagesTable = pgTable('messages', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('msg')),
  requestId: text('request_id')
    .notNull()
    .references(() => requestsTable.id, { onDelete: 'cascade' }),
  index: integer('index').notNull(),
  role: text('role').notNull(), // system | user | assistant | tool
  content: jsonb('content'), // parts/messages
  toolCall: jsonb('tool_call'), // summary
  functionCall: jsonb('function_call'), // JSON
});

export const responsesTable = pgTable('responses', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('resp')),
  requestId: text('request_id')
    .notNull()
    .references(() => requestsTable.id, { onDelete: 'cascade' }),
  providerModelId: text('provider_model_id').references(
    () => providerModelsTable.id,
    { onDelete: 'set null' },
  ),
  outputSize: integer('output_size'),
  finishReason: text('finish_reason'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  totalTokens: integer('total_tokens'),
  status: text('status'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// Usage and quotas
export const usageEventsTable = pgTable('usage_events', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('use')),
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
  providerModelId: text('provider_model_id').references(
    () => providerModelsTable.id,
    { onDelete: 'set null' },
  ),
  alias: text('alias'),
  inputTokens: integer('input_tokens'),
  outputTokens: integer('output_tokens'),
  images: integer('images'),
  audio: integer('audio'),
  costMicros: integer('cost_micros'),
  currency: text('currency'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const quotasTable = pgTable('quotas', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('quota')),
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
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// Webhooks
export const webhookEndpointsTable = pgTable('webhook_endpoints', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('wh')),
  teamId: text('team_id')
    .notNull()
    .references(() => teamsTable.id, { onDelete: 'cascade' }),
  environmentId: text('environment_id')
    .notNull()
    .references(() => environmentsTable.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  secret: text('secret'),
  eventTypes: jsonb('event_types'), // array of event types
  active: boolean('active').default(true),
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

export const webhookDeliveriesTable = pgTable('webhook_deliveries', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('whd')),
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
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});

// Audit logs
export const auditLogsTable = pgTable('audit_logs', {
  id: text('id')
    .primaryKey()
    .$default(() => createId('audit')),
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
  createdAt: timestamp('created_at')
    .$defaultFn(() => new Date())
    .notNull(),
});
