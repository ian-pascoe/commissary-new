# OpenRouter-Parity Plan: Database & Data Model Improvements (Teams as Projects)

This plan incorporates your existing auth/multi-tenancy schema and refines the recommendations to deliver an open-source OpenRouter alternative with strong UX, routing, cost controls, and compliance. Target stack: Cloudflare D1 (SQLite) + Drizzle (Postgres-ready).

## Objectives

- Provider-agnostic model catalog with capability metadata
- First-class routing/aliases, pricing, quotas, and metering
- Multi-tenancy aligned to your organizations/teams/users/api keys
- Observability and privacy-safe logging with retention/redaction
- Compatibility layers (OpenAI/Anthropic/Vertex/OpenAI-compatible)

## Alignment with current auth/schema sources

Schema source of truth: `packages/core/src/database/schema/{auth.ts,general.ts}`

Current auth tables (from `auth.ts`):
- users_table, accounts_table, verifications_table
- organizations_table, organization_members_table, invitations_table
- teams_table, team_members_table
- api_keys_table (user-scoped with rate-limit and refill fields)

Implications and mapping (Option B chosen):
- Organization is your top-level tenant. Teams act as first-class “projects/workspaces” under an org.
- API keys must scope billable usage to a team. Keys can be tied to a user or be service-owned.
- All routing/configuration settings apply at team/org level only (no user-level settings). User identity may be used for audit only.
- Auth tables are managed by Better Auth. Do not modify their schemas; store teamId and orgId (and optional userIdAudit) plus per-key policy data in `api_keys_table.metadata`.
- Catalog tables live in `general.ts`; additions below should target that module for D1-first with a clear Postgres migration path.

## Highest-impact improvements (prioritized)

1) Multi-tenancy, identities, and key management (without changing auth tables)
- No schema changes to Better Auth tables.
Define a metadata contract for `api_keys_table.metadata` (JSON):
	- metaVersion: number
	- teamId?: string, orgId?: string, userIdAudit?: string
	- scopes: array or map (e.g., ["use:completions", "read:models", "admin:routing"])
	- allowedModels: string[] or patterns; allowedAliases: string[]
	- origin: "server" | "browser"; environment?: "prod" | "staging"; label?: string
- Key lifecycle via Better Auth configuration/policies: hash-at-rest, prefix/start for lookup, rotation/revocation. Track last usage in our `usage_events`.
  - Optional performance cache (our domain): `key_context`(id, apiKeyId, teamId, orgId, scopes JSON, allowedModels JSON, allowedAliases JSON, lastResolvedAt). Populate on first use or via a sync job. Hard FKs to auth tables are acceptable (users_table, teams_table, organizations_table); do not modify auth schemas.
- roles/permissions:
	- Keep organization_members_table for org roles. Add team roles if you need finer control (viewer|editor|admin|billing).
	- Service accounts: defer; Better Auth will handle non-user ownership semantics later.

2) Routing, aliases, and policies
- model_aliases: alias → weighted list of provider_models; effectiveStart/End for safe rollouts; scope via teamId, orgId.
- Global alias support: allow teamId/orgId to be NULL for higher-scope entries; resolution order is team → org → global.
- routing_policies: per team; strategy (cheapest|fastest|quality|custom) + config JSON.
- routing_policy_rules: conditional weights by region, price ceiling, capability, health; fallback order.
- Session stickiness: user-hash-based (if provided in the request) with a TTL window (e.g., 30–60 minutes) to reduce variance. Optionally support conversationId later.
- Health scores: maintain rolling success and latency to inform routing.
 - Provider ordering (org-level default, team override): orderingStrategy enum = balanced (default) | price | latency | throughput. Balanced uses a weighted blend of cost, p95 latency, and success rate; others prioritize the chosen dimension with guardrails.

3) Pricing model v2 (D1-first, Postgres-ready)
- pricing_tiers: unit (tokens_1k|image_mp|audio_sec|request|embed_1k|reasoning_1k), currency (ISO-4217), pricePerUnitUsdMicros (integer), tierFrom, effectiveStart/End.
- Canonical currency is USD. Store and compute costs in USD micros (integers) to avoid floating point issues on D1; clients convert for display.
- Optionally store provider native pricing as audit fields (nativeCurrency, nativePricePerUnit, capturedAt) without using it for computation.
- provider_model_pricing_summary: denormalized USD snapshot for fast reads in micros (inputPer1k, outputPer1k, imagePerMp, request, embedPer1k, reasoningPer1k).

4) Usage metering and quotas
- usage_events: keyed by apiKeyId, teamId, providerModelId; capture tokens/cost/latency/status/errorType.
- daily_usage_rollups: per team per day, units + cost.
- quotas: per team; period (day|month), unit, limit, resetsAt; enforcement (soft|hard).
- rate_limits: augment per-key with team + model granularity.
 - Snapshot resolved context on each event to avoid drift: { teamId, orgId, alias, providerModelId }.
 - Daily rollups can be computed on-demand via SQL (date trunc + group by). A rollup table or materialized view is optional for dashboard speed; add only if needed.

5) Logs, privacy, and redaction
- request_logs: req/res payloads (structured), token counts, headers, safety blocks, duration, status; link to apiKeyId and teamId.
- redaction_rules: PII scrubbing config per team; redaction_events linked to request_logs.
- retention_policies: per team; days; encryptedAtRest flag.
- Logging is opt-in; default is minimal (metadata + counters). Full payload logging requires explicit team opt-in.
- Support blob offload for large payloads and at-rest encryption; keep searchable summaries in DB.

6) Provider credentials and regions
- provider_credentials: credentials JSON (encrypted), type (apiKey|awsKeys|oauth), status. Scope to teamId or organizationId; also support global credentials (NULL teamId/orgId) for non-BYOK usage. Resolution order: team → org → global.
- provider_regions: regionCode, apiBaseUrl, residency policies.

11) Credits wallet and billing (provider passthrough + small transaction fee on purchases)
- team_wallets: balanceUsdMicros, autoTopUpTargetUsdMicros, minBalanceUsdMicros, status.
- wallet_transactions: id, teamId, type (purchase|debit_usage|refund|adjustment|fee), amountUsdMicros, providerId NULLABLE, usageEventId NULLABLE, externalRef (payment intent), createdAt.
- topup_rules: id, teamId, thresholdUsdMicros, topUpAmountUsdMicros, active.
- payment_providers: id, name (stripe), config JSON; team_payment_methods mapping as needed.
- Costing: requests debit wallet based on USD pricing summary; no per-request markup; transaction fee only on purchases.

7) Capabilities and modalities (normalized)
- model_versions: version neutral models (e.g., llama-3.1-8b-instruct, r1-mini-3b).
- model_capabilities: capability enum (function_tools, json_schema, parallel_tool_calls, streaming, vision, audio, video, embeddings, reasoning) + metadata.
- embeddings_metadata: dimension, pooling, normalize.

8) Compatibility layers
- api_compat_profiles: openai|anthropic|vertex|openai_compatible.
- provider_model_endpoints: per-profile path/header templates + param translation maps.

9) Observability & status
- provider_status_snapshots: incident/status sync; uptime.
- provider_model_health: rolling p50/p95, errorRate, throughput.

10) Fine-tuning and jobs (future-ready)
- fine_tunes, jobs, webhooks, audit_logs as before.

11) Presets (parameter bundles with strong UX)
- Purpose: reusable, versioned bundles of system prompts + parameter defaults that users can reference via a slug (e.g., `@preset/helpdesk`) or pin by version (`@preset/helpdesk@v3`).
- Scoping & resolution: user → team → org → global. Support global community presets later; default to private/team sharing initially.
- Merge rules (deterministic): request overrides > preset > alias/policy defaults > provider_model defaults. Strictly validate types against capability maps.
- Versioning: immutable versions; `latest` pointer; allow pinning with `@vX` for reproducibility; surface diffs between versions.
- UX enhancers: typechecked editors, capability-aware suggestions, test-run preview (shows resolved model + effective params), import/export JSON, share/clone, favorite, categories/tags.
- Logging & analytics: tag usage_events and request_logs with presetId/presetVersionId; allow per-preset usage reports.

## Concrete deltas by existing catalog tables

providers
- Add: sdk (enum from providerSdks), apiBaseUrl, authType, categories (hosted|self-hosted), compliance (hipaaEligible, soc2, gdpr, dataResidency), regions JSON, features JSON, defaultCurrency.
- Add legal/compliance: dpaUrl, dataResidencyNotes, contentPolicySummary.

models (provider-neutral)
- Add: family, license, trainingCutoff, multilingual array, quality tags (cot|reasoning|math|code), embeddingDimension, supportsToolUse/JSONMode/StructuredOutputs.
- Normalize: supportedParameters → model_capabilities with metadata.

provider_models (junction)
- Constraint: unique(providerId, modelId).
- Add: endpointProfile (openai|anthropic|…), defaultParams JSON; streamingSupported, functionToolsSupported, parallelToolCalls, jsonSchemaStrict.
- Regionality: region or provider_model_regions.
- Limits: rpm, tpm, maxBatch, maxInputTokens, maxOutputTokens, reasoningLimit.
- Pricing: move to pricing_tiers (USD micros); keep summary columns for read speed if desired (also USD micros).

## New/adjusted tables overview (teams as projects)


- Use teams_table as the primary unit of configuration and billing. Add required indexes/metadata to support routing, pricing, usage, and logging.

Keys
- No changes to Better Auth tables. Store teamId/orgId/scopes/allow-lists in `api_keys_table.metadata`.
- Optional: `key_context` (our domain) for fast lookups: (id, apiKeyId, teamId, orgId, scopes JSON, allowedModels JSON, allowedAliases JSON, lastResolvedAt). teamId/orgId/userId may be foreign keys to auth tables.
- Optional: `service_accounts` (our domain) if you need non-user key ownership semantics (id, teamId, name, ownerUserId?).

 Routing
- model_aliases(id, alias, providerModelId, weight, effectiveStart, effectiveEnd, teamId NULLABLE, orgId NULLABLE)
- routing_policies(id, name, strategy, config JSON, active, teamId NULLABLE, orgId NULLABLE)
- routing_policy_rules(id, routingPolicyId, alias, condition JSON, weights JSON, fallback JSON)
	- Resolution order: team → org → global (NULL for both)
	- Invariants: prevent overlapping effective windows per (scope: team/org, alias)
 - FK note: teamId/orgId may reference teams_table/organizations_table.
 - provider_preferences (new): id, orderingStrategy enum (balanced|price|latency|throughput), allowedProviders JSON NULLABLE, deniedProviders JSON NULLABLE, teamId NULLABLE, orgId NULLABLE. Enforced at routing time; team overrides org.

Presets
- presets(id, slug, name, description, iconUrl, visibility (team|org|global), teamId NULLABLE, orgId NULLABLE, effectiveStart, effectiveEnd, createdAt, updatedAt)
- preset_versions(id, presetId, version, system TEXT, params JSON, tools JSON NULLABLE, toolChoice JSON NULLABLE, responseFormat JSON NULLABLE, createdByUserIdAudit NULLABLE, createdAt)
- preset_shares (optional): id, presetId, target (team|org), targetId, permission (view|use|edit)
- preset_resolved_cache (optional): id, presetVersionId, aliasResolved TEXT NULLABLE, providerModelIdResolved NULLABLE, effectiveParams JSON, eTag, updatedAt
 - routing_stickiness (optional) can be rolled into policies config: key (conversationId|endUserId), ttlMinutes.

 Pricing
- pricing_tiers(id, providerModelId, unit, currency, pricePerUnitUsdMicros INTEGER, tierFrom, effectiveStart, effectiveEnd)
- provider_model_pricing_summary(providerModelId PK, currency, inputPer1k INTEGER, outputPer1k INTEGER, imagePerMp INTEGER, request INTEGER, embedPer1k INTEGER, reasoningPer1k INTEGER, updatedAt)
 - provider_native_price_snapshots (optional): providerModelId, nativeCurrency, nativeUnit, nativePricePerUnit, capturedAt.

 Metering & quotas
- usage_events(id, apiKeyId, teamId, orgId, providerModelId, requestId, time, units JSON, tokensIn, tokensOut, cost, latencyMs, status, errorType, alias, userIdAudit NULLABLE)
- daily_usage_rollups(teamId, orgId, date, units JSON, tokensIn, tokensOut, cost) (optional cache/materialized view; can be computed via SQL on demand)
- quotas(id, teamId NULLABLE, orgId NULLABLE, unit, period, limit, used, resetsAt, enforcement)
- rate_limits(id, teamId NULLABLE, orgId NULLABLE, providerModelId NULLABLE, rpm, tpm, windowSec)
 - FK note: teamId/orgId may reference teams_table/organizations_table.
 - Add columns to usage_events for context snapshots: alias, orgId (soft ref), pricedCurrency='USD'. Represent monetary values as USD micros (integers).

 Logging & privacy
- request_logs(id, apiKeyId, teamId, orgId, requestId, req JSON, res JSON, durationMs, status, redactions JSON, safety JSON, createdAt, userIdAudit NULLABLE)
- redaction_rules(id, teamId, orgId NULLABLE, rules JSON, enabled)
- retention_policies(id, teamId, orgId NULLABLE, days, encryptedAtRest)
 - FK note: teamId/orgId may reference teams_table/organizations_table.
 - retention_tiers (optional): tierName, days. Map team to tier; basic = 7 days.

 Providers & endpoints
- provider_credentials(id, organizationId NULLABLE, teamId NULLABLE, providerId, type, credentials JSON (encrypted), status, createdAt) — allow global credentials by leaving both org/team NULL; resolution order team → org → global.
- provider_regions(id, providerId, regionCode, apiBaseUrl, residencyNotes)
- api_compat_profiles(id, name, notes)
- provider_model_endpoints(id, providerModelId, profileId, pathTemplate, headerTemplate, paramMap JSON)
 - Prioritized providers for v1: OpenAI, Anthropic, Google AI Studio.
 - Provider access control: organizations/teams can define allow-lists and/or deny-lists of providers via provider_preferences; these are enforced by the router.

Ops/observability
- provider_status_snapshots(id, providerId, time, status, incident JSON, uptimePct)
- provider_model_health(id, providerModelId, window, p50, p95, errorRate, throughput, updatedAt)
- audit_logs(id, actorId, actorType(user|service|system), action, entityType, entityId, diff JSON, time)

Fine-tuning & jobs
- fine_tunes(id, providerId, baseModelId, params JSON, status, resultProviderModelId, events JSON)
- jobs(id, teamId, type, status, params JSON, result JSON, createdAt, updatedAt)
- webhooks(id, teamId, url, secret, events JSON, active)
- webhook_events(id, webhookId, eventType, payload JSON, deliveredAt, deliveryStatus)

## API compatibility considerations

- Maintain OpenAI-compatible routes; store parameter translation maps per provider/profile.
- Strict JSON mode and structured outputs parity (response_format, tool_choice, schema validation).
- Tool/function calling with JSON Schema mapping; consider storing tool schemas per alias.
- Preset slugs: accept `model: "@preset/<slug>"` or `"@preset/<slug>@v<version>"` in OpenAI-compatible requests. Server resolves preset, merges parameters, and routes via alias/provider model. Also allow `preset: "<slug>"` as an explicit field when `model` is a concrete model.

## Operational guidance
 - D1-first tuning: prefer integer types for money (USD micros); avoid floating point for costs. Keep JSON payloads small; default to {} or [] to avoid nulls. Design columns/types to be Postgres-compatible for future migration.
 - Index hot paths: (providerId, modelId), (teamId, alias), (orgId, alias), (apiKeyId, createdAt) on logs/usage.
 - Scope resolution is key-aware: resolve team → org → global only. User identity may be used for audit but not for routing/config.

## Security & compliance

- Manage key hashing/rotation via Better Auth configuration (no schema changes). Use prefixes/starts for safe display.
- Encrypt provider_credentials; separate KMS or libsodium sealed boxes; access scoped to team.
- Default privacy: log redaction enabled; retention policies per tenant.
- Compliance metadata at provider + tenant level (gdpr, residency, hipaaEligible).
- Pseudonymize end-user identifiers; support an `x-commissary-end-user-id` header hashed/salted per team for rate limiting and stickiness.

## Revised next steps (teams as projects, no auth-table changes)

1) Define and document `api_keys_table.metadata` contract (metaVersion, teamId?, orgId?, userIdAudit?, keyLevel: 'team'|'org', scopes, allowedModels/aliases, origin, environment) and implement a key-context resolver in the API layer; populate `key_context` as a short-term cache.
2) Add model_aliases + routing_policies (+ rules) with team/org/global scoping and precedence. Implement provider_preferences (ordering + allow/deny lists).
3) Introduce pricing_tiers (USD micros canonical) and a denormalized USD micros summary on provider_models; optionally capture provider native snapshots for audit.
4) Add usage_events. Compute daily aggregates via SQL for dashboards; add an optional rollup/materialized view only if needed for performance.
5) Add request_logs with opt-in full logging, redaction_rules, and retention_policies per team (basic=7 days by default via retention_tiers).
6) Add provider_credentials scoped to team and organization, plus support global credentials (teamId/orgId NULL). Support multi-region via provider_regions. Prioritize OpenAI, Anthropic, Google AI Studio endpoints and compatibility maps.
7) Add team_wallets, wallet_transactions, and topup_rules; integrate payments (e.g., Stripe). Debit usage from wallet; apply small transaction fee on purchases. Implement auto top-up to a configurable target.
8) Implement presets: presets, preset_versions (+ optional shares/cache). Resolve `@preset/<slug>[@vX]` with scope order team → org → global; implement merge + validation; add preview endpoint.

## Success criteria

- Aliases like `gpt-4o` route to weighted provider models with cost/health-aware fallback per team.
- Global aliases resolve in order: team → org → global; session stickiness reduces variance.
- Keys are team-scoped, hashed, with scopes and model allow-lists; quotas and rate limits enforced.
- Pricing is consistent and comparable across providers with explicit units/currency.
- Usage and cost roll up daily per team; logs are privacy-safe with retention.
- Compatibility profiles ensure low-friction migration from OpenAI-compatible clients.
- Credits wallet debits per usage; purchases succeed with auto top-up and transaction fee applied on purchase only.
- Presets: referencing `@preset/<slug>` merges params predictably; version pinning works; scope resolution follows team → org → global; preview shows resolved model and effective parameters.
