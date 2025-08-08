import {
  index,
  integer,
  numeric,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type { Modality } from '../../schemas/modality';
import type { SupportedParameter } from '../../schemas/model';
import { baseModel } from '../utils';
import { apiKeysTable, organizationsTable, teamsTable } from './auth';

export const providersTable = sqliteTable(
  'providers',
  {
    ...baseModel('prv'),

    slug: text('slug').notNull(),
    name: text('name').notNull(),
    iconUrl: text('icon_url'),
    description: text('description'),

    modelsUrl: text('models_url'),
    completionsUrl: text('completions_url'),
    chatCompletionsUrl: text('chat_completions_url'),
    embeddingsUrl: text('embeddings_url'),
    imageUrl: text('image_url'),
    videoUrl: text('video_url'),

    privacyPolicyUrl: text('privacy_policy_url'),
    termsOfServiceUrl: text('terms_of_service_url'),
    statusPageUrl: text('status_page_url'),

    mayLogPrompts: integer('may_log_prompts', { mode: 'boolean' }).default(
      false,
    ),
    mayTrainOnData: integer('may_train_on_data', { mode: 'boolean' }).default(
      false,
    ),
    isModerated: integer('is_moderated', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (t) => [
    uniqueIndex('providers_slug_idx').on(t.slug),
    index('providers_name_idx').on(t.name),
  ],
);

export const modelsTable = sqliteTable(
  'models',
  {
    ...baseModel('mdl'),

    slug: text('slug').notNull(),
    name: text('name'),
    description: text('description'),
    huggingFaceId: text('hugging_face_id'),

    // architecture
    architecture_inputModalities: text('input_modalities', { mode: 'json' })
      .notNull()
      .$type<Array<Modality>>(),
    architecture_outputModalities: text('output_modalities', { mode: 'json' })
      .notNull()
      .$type<Array<Modality>>(),
    architecture_tokenizer: text('tokenizer').notNull(),
    architecture_contextLength: integer('context_length'),
    architecture_supportedParameters: text('supported_parameters', {
      mode: 'json',
    }).$type<Array<SupportedParameter>>(),
  },
  (t) => [
    uniqueIndex('models_slug_idx').on(t.slug),
    index('models_name_idx').on(t.name),
    index('models_hugging_face_id_idx').on(t.huggingFaceId),
  ],
);

export const providerModelsTable = sqliteTable(
  'provider_models',
  {
    ...baseModel('pmd'),
    providerId: text('provider_id')
      .notNull()
      .references(() => providersTable.id),
    modelId: text('model_id')
      .notNull()
      .references(() => modelsTable.id),

    slug: text('slug').notNull(),

    // provider-specific architecture
    architecture_inputModalities: text('input_modalities', { mode: 'json' })
      .notNull()
      .$type<Array<Modality>>(),
    architecture_outputModalities: text('output_modalities', { mode: 'json' })
      .notNull()
      .$type<Array<Modality>>(),
    architecture_quantization: text('quantization').notNull(),
    architecture_tokenizer: text('tokenizer').notNull(),
    architecture_contextLength: integer('context_length'),
    architecture_maxOutputTokens: integer('max_output_tokens'),
    architecture_supportedParameters: text('supported_parameters', {
      mode: 'json',
    }).$type<Array<SupportedParameter>>(),
  },
  (t) => [
    index('provider_models_provider_id_idx').on(t.providerId),
    index('provider_models_model_id_idx').on(t.modelId),
    uniqueIndex('provider_models_provider_model_unique_idx').on(
      t.providerId,
      t.modelId,
    ),
    uniqueIndex('provider_models_provider_id_slug_idx').on(
      t.providerId,
      t.slug,
    ),
  ],
);

// Routing & Aliases
export const modelAliasesTable = sqliteTable(
  'model_aliases',
  {
    ...baseModel('mal'),
    alias: text('alias').notNull(),
    providerModelId: text('provider_model_id')
      .notNull()
      .references(() => providerModelsTable.id),
    weight: integer('weight').notNull().default(1),
    effectiveStart: integer('effective_start', { mode: 'timestamp' }),
    effectiveEnd: integer('effective_end', { mode: 'timestamp' }),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
  },
  (t) => [
    index('model_aliases_alias_scope_idx').on(t.alias, t.teamId, t.orgId),
    index('model_aliases_provider_model_idx').on(t.providerModelId),
    index('model_aliases_effective_idx').on(t.effectiveStart, t.effectiveEnd),
  ],
);

export const routingPoliciesTable = sqliteTable(
  'routing_policies',
  {
    ...baseModel('rpo'),
    name: text('name').notNull(),
    strategy: text('strategy', {
      enum: ['balanced', 'price', 'latency', 'throughput', 'custom'],
    }).notNull(),
    config: text('config', { mode: 'json' }),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
  },
  (t) => [
    index('routing_policies_scope_idx').on(t.teamId, t.orgId),
    index('routing_policies_active_idx').on(t.active),
  ],
);

export const routingPolicyRulesTable = sqliteTable(
  'routing_policy_rules',
  {
    ...baseModel('rpr'),
    routingPolicyId: text('routing_policy_id')
      .notNull()
      .references(() => routingPoliciesTable.id),
    alias: text('alias').notNull(),
    condition: text('condition', { mode: 'json' }),
    weights: text('weights', { mode: 'json' }),
    fallback: text('fallback', { mode: 'json' }),
  },
  (t) => [
    index('routing_policy_rules_policy_idx').on(t.routingPolicyId),
    index('routing_policy_rules_alias_idx').on(t.alias),
  ],
);

export const providerPreferencesTable = sqliteTable(
  'provider_preferences',
  {
    ...baseModel('ppf'),
    orderingStrategy: text('ordering_strategy', {
      enum: ['balanced', 'price', 'latency', 'throughput'],
    }).notNull(),
    allowedProviders: text('allowed_providers', { mode: 'json' }),
    deniedProviders: text('denied_providers', { mode: 'json' }),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
  },
  (t) => [index('provider_preferences_scope_idx').on(t.teamId, t.orgId)],
);

// Pricing (USD micros)
export const pricingTiersTable = sqliteTable(
  'pricing_tiers',
  {
    ...baseModel('pti'),
    providerModelId: text('provider_model_id')
      .notNull()
      .references(() => providerModelsTable.id),
    unit: text('unit', {
      enum: [
        'tokens_1k',
        'image_mp',
        'audio_sec',
        'request',
        'embed_1k',
        'reasoning_1k',
      ],
    }).notNull(),
    currency: text('currency').notNull(), // ISO-4217, canonical USD
    pricePerUnitUsdMicros: integer('price_per_unit_usd_micros').notNull(),
    tierFrom: integer('tier_from').notNull(),
    effectiveStart: integer('effective_start', { mode: 'timestamp' }),
    effectiveEnd: integer('effective_end', { mode: 'timestamp' }),
  },
  (t) => [
    index('pricing_tiers_model_idx').on(t.providerModelId),
    index('pricing_tiers_unit_idx').on(t.unit),
    index('pricing_tiers_effective_idx').on(t.effectiveStart, t.effectiveEnd),
  ],
);

// provider_model_pricing_summary dropped for now; compute from pricing_tiers at read time.

// Metering & quotas
export const usageEventsTable = sqliteTable(
  'usage_events',
  {
    ...baseModel('uev'),
    apiKeyId: text('api_key_id').references(() => apiKeysTable.id),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
    providerModelId: text('provider_model_id').references(
      () => providerModelsTable.id,
    ),
    requestId: text('request_id'),
    time: integer('time', { mode: 'timestamp' }).notNull(),
    units: text('units', { mode: 'json' }),
    tokensIn: integer('tokens_in'),
    tokensOut: integer('tokens_out'),
    costUsdMicros: integer('cost_usd_micros'),
    latencyMs: integer('latency_ms'),
    status: text('status'),
    errorType: text('error_type'),
    alias: text('alias'),
    userIdAudit: text('user_id_audit'),
    pricedCurrency: text('priced_currency').default('USD'),
  },
  (t) => [
    index('usage_events_team_time_idx').on(t.teamId, t.time),
    index('usage_events_api_key_time_idx').on(t.apiKeyId, t.time),
    index('usage_events_model_time_idx').on(t.providerModelId, t.time),
  ],
);

export const quotasTable = sqliteTable(
  'quotas',
  {
    ...baseModel('qta'),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
    unit: text('unit').notNull(),
    period: text('period', { enum: ['day', 'month'] }).notNull(),
    limit: integer('limit').notNull(),
    used: integer('used').notNull().default(0),
    resetsAt: integer('resets_at', { mode: 'timestamp' }),
    enforcement: text('enforcement', { enum: ['soft', 'hard'] })
      .notNull()
      .default('soft'),
  },
  (t) => [index('quotas_scope_idx').on(t.teamId, t.orgId)],
);

export const rateLimitsTable = sqliteTable(
  'rate_limits',
  {
    ...baseModel('rtl'),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
    providerModelId: text('provider_model_id').references(
      () => providerModelsTable.id,
    ),
    rpm: integer('rpm'),
    tpm: integer('tpm'),
    windowSec: integer('window_sec'),
  },
  (t) => [index('rate_limits_scope_idx').on(t.teamId, t.orgId)],
);

// Logging & privacy
export const requestLogsTable = sqliteTable(
  'request_logs',
  {
    ...baseModel('rql'),
    apiKeyId: text('api_key_id').references(() => apiKeysTable.id),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
    requestId: text('request_id'),
    req: text('req', { mode: 'json' }),
    res: text('res', { mode: 'json' }),
    durationMs: integer('duration_ms'),
    status: integer('status'),
    redactions: text('redactions', { mode: 'json' }),
    safety: text('safety', { mode: 'json' }),
    userIdAudit: text('user_id_audit'),
  },
  (t) => [
    index('request_logs_team_created_idx').on(t.teamId, t.createdAt),
    index('request_logs_api_key_created_idx').on(t.apiKeyId, t.createdAt),
  ],
);

export const redactionRulesTable = sqliteTable(
  'redaction_rules',
  {
    ...baseModel('rru'),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
    rules: text('rules', { mode: 'json' }),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => [index('redaction_rules_scope_idx').on(t.teamId, t.orgId)],
);

export const retentionPoliciesTable = sqliteTable(
  'retention_policies',
  {
    ...baseModel('rtn'),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
    days: integer('days').notNull(),
    encryptedAtRest: integer('encrypted_at_rest', { mode: 'boolean' })
      .notNull()
      .default(false),
  },
  (t) => [index('retention_policies_scope_idx').on(t.teamId, t.orgId)],
);

// Provider credentials & regions
export const providerCredentialsTable = sqliteTable(
  'provider_credentials',
  {
    ...baseModel('pcr'),
    organizationId: text('organization_id').references(
      () => organizationsTable.id,
    ),
    teamId: text('team_id').references(() => teamsTable.id),
    providerId: text('provider_id')
      .notNull()
      .references(() => providersTable.id),
    type: text('type', { enum: ['apiKey', 'awsKeys', 'oauth'] }).notNull(),
    credentials: text('credentials', { mode: 'json' }).notNull(),
    status: text('status', { enum: ['active', 'revoked', 'expired'] })
      .notNull()
      .default('active'),
  },
  (t) => [
    index('provider_credentials_scope_idx').on(t.teamId, t.organizationId),
    index('provider_credentials_provider_idx').on(t.providerId),
  ],
);

export const providerRegionsTable = sqliteTable(
  'provider_regions',
  {
    ...baseModel('prg'),
    providerId: text('provider_id')
      .notNull()
      .references(() => providersTable.id),
    regionCode: text('region_code').notNull(),
    apiBaseUrl: text('api_base_url'),
    residencyNotes: text('residency_notes'),
  },
  (t) => [
    index('provider_regions_provider_idx').on(t.providerId),
    uniqueIndex('provider_regions_unique_idx').on(t.providerId, t.regionCode),
  ],
);

// Compatibility & endpoints
export const apiCompatProfilesTable = sqliteTable(
  'api_compat_profiles',
  {
    ...baseModel('acp'),
    name: text('name', {
      enum: ['openai', 'anthropic', 'vertex', 'openai_compatible'],
    }).notNull(),
    notes: text('notes'),
  },
  (t) => [index('api_compat_profiles_name_idx').on(t.name)],
);

export const providerModelEndpointsTable = sqliteTable(
  'provider_model_endpoints',
  {
    ...baseModel('pme'),
    providerModelId: text('provider_model_id')
      .notNull()
      .references(() => providerModelsTable.id),
    profileId: text('profile_id')
      .notNull()
      .references(() => apiCompatProfilesTable.id),
    pathTemplate: text('path_template').notNull(),
    headerTemplate: text('header_template', { mode: 'json' }),
    paramMap: text('param_map', { mode: 'json' }),
  },
  (t) => [
    index('provider_model_endpoints_model_idx').on(t.providerModelId),
    index('provider_model_endpoints_profile_idx').on(t.profileId),
  ],
);

// Observability & health
export const providerStatusSnapshotsTable = sqliteTable(
  'provider_status_snapshots',
  {
    ...baseModel('pss'),
    providerId: text('provider_id')
      .notNull()
      .references(() => providersTable.id),
    time: integer('time', { mode: 'timestamp' }).notNull(),
    status: text('status').notNull(),
    incident: text('incident', { mode: 'json' }),
    uptimePct: numeric('uptime_pct', { mode: 'number' }),
  },
  (t) => [
    index('provider_status_snapshots_provider_time_idx').on(
      t.providerId,
      t.time,
    ),
  ],
);

export const providerModelHealthTable = sqliteTable(
  'provider_model_health',
  {
    ...baseModel('pmh'),
    providerModelId: text('provider_model_id')
      .notNull()
      .references(() => providerModelsTable.id),
    window: text('window', {
      enum: ['1h', '6h', '24h', '7d', '30d'],
    }).notNull(),
    p50: integer('p50'),
    p95: integer('p95'),
    errorRate: numeric('error_rate', { mode: 'number' }),
    throughput: integer('throughput'),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('provider_model_health_model_window_idx').on(
      t.providerModelId,
      t.window,
    ),
  ],
);

export const auditLogsTable = sqliteTable(
  'audit_logs',
  {
    ...baseModel('adl'),
    actorId: text('actor_id').notNull(),
    actorType: text('actor_type', {
      enum: ['user', 'service', 'system'],
    }).notNull(),
    action: text('action').notNull(),
    entityType: text('entity_type').notNull(),
    entityId: text('entity_id').notNull(),
    diff: text('diff', { mode: 'json' }),
    time: integer('time', { mode: 'timestamp' }).notNull(),
  },
  (t) => [
    index('audit_logs_entity_time_idx').on(t.entityType, t.entityId, t.time),
  ],
);

// Presets
export const presetsTable = sqliteTable(
  'presets',
  {
    ...baseModel('pre'),
    slug: text('slug').notNull(),
    name: text('name').notNull(),
    description: text('description'),
    iconUrl: text('icon_url'),
    visibility: text('visibility', { enum: ['team', 'org', 'global'] })
      .notNull()
      .default('team'),
    teamId: text('team_id').references(() => teamsTable.id),
    orgId: text('org_id').references(() => organizationsTable.id),
    effectiveStart: integer('effective_start', { mode: 'timestamp' }),
    effectiveEnd: integer('effective_end', { mode: 'timestamp' }),
  },
  (t) => [
    index('presets_scope_idx').on(t.teamId, t.orgId, t.visibility),
    uniqueIndex('presets_slug_scope_idx').on(t.slug, t.teamId, t.orgId),
  ],
);

export const presetVersionsTable = sqliteTable(
  'preset_versions',
  {
    ...baseModel('prv'),
    presetId: text('preset_id')
      .notNull()
      .references(() => presetsTable.id),
    version: integer('version').notNull(),
    system: text('system'),
    params: text('params', { mode: 'json' }),
    tools: text('tools', { mode: 'json' }),
    toolChoice: text('tool_choice', { mode: 'json' }),
    responseFormat: text('response_format', { mode: 'json' }),
    createdByUserIdAudit: text('created_by_user_id_audit'),
  },
  (t) => [
    uniqueIndex('preset_versions_unique_idx').on(t.presetId, t.version),
    index('preset_versions_preset_idx').on(t.presetId),
  ],
);

// Wallets & billing
export const teamWalletsTable = sqliteTable(
  'team_wallets',
  {
    ...baseModel('twl'),
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id),
    balanceUsdMicros: integer('balance_usd_micros').notNull().default(0),
    autoTopUpTargetUsdMicros: integer('auto_topup_target_usd_micros'),
    minBalanceUsdMicros: integer('min_balance_usd_micros'),
    status: text('status', { enum: ['active', 'suspended'] })
      .notNull()
      .default('active'),
  },
  (t) => [uniqueIndex('team_wallets_team_id_idx').on(t.teamId)],
);

export const walletTransactionsTable = sqliteTable(
  'wallet_transactions',
  {
    ...baseModel('wtc'),
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id),
    type: text('type', {
      enum: ['purchase', 'debit_usage', 'refund', 'adjustment', 'fee'],
    }).notNull(),
    amountUsdMicros: integer('amount_usd_micros').notNull(),
    providerId: text('provider_id').references(() => providersTable.id),
    usageEventId: text('usage_event_id').references(() => usageEventsTable.id),
    externalRef: text('external_ref'),
  },
  (t) => [index('wallet_transactions_team_idx').on(t.teamId, t.createdAt)],
);

export const topupRulesTable = sqliteTable(
  'topup_rules',
  {
    ...baseModel('tpr'),
    teamId: text('team_id')
      .notNull()
      .references(() => teamsTable.id),
    thresholdUsdMicros: integer('threshold_usd_micros').notNull(),
    topUpAmountUsdMicros: integer('topup_amount_usd_micros').notNull(),
    active: integer('active', { mode: 'boolean' }).notNull().default(true),
  },
  (t) => [index('topup_rules_team_idx').on(t.teamId)],
);

export const paymentProvidersTable = sqliteTable('payment_providers', {
  ...baseModel('pmt'),
  name: text('name', { enum: ['stripe'] }).notNull(),
  config: text('config', { mode: 'json' }),
});
