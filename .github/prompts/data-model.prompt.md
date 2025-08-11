Title: Data Model Plan — OpenRouter-Compatible Router with Stronger UX

Goal: Deliver full OpenRouter feature parity with a superior developer/admin UX while aligning with Drizzle + Zod, Better-Auth, and repository standards. Note: in this system, a Better-Auth Team (teamsTable) is the project-level scope.

Guiding principles
- Multi-tenant by organization → team → environment (dev/staging/prod) hierarchy
- Keep Better-Auth tables unmodified; extend via metadata columns or companion tables
- Use createId() for primary keys; createdAt/updatedAt; softDelete with deletedAt when helpful
- Prefer immutable audit/usage event streams; derive analytics via materialized views or rollups
- Strong indexing strategy; predictable SLOs for analytics and routing decisions
- Drizzle schemas live in drizzle/schema/*.ts; Zod via drizzle-zod in packages/core/src/schemas

Tenancy and RBAC
- organizations (organizationsTable in Better-Auth) as the tenant root. Store domain metadata in auth tables’ metadata or companion domain tables.
- teams (teamsTable in Better-Auth): belongsTo organization; acts as the “project” boundary (API keys, routing, logs)
- environments: per team (dev/staging/prod/custom). Scopes config, keys, quotas
- members/roles: derive from Better-Auth teamMembersTable; add team- and environment-level role bindings via companion table if needed (orgOwner, admin, developer, analyst, readOnly)

Provider and model catalog (OpenRouter parity)
- providers: name, slug, status, capabilities, authType, baseUrl, metadata
- provider_credentials: per team/env encrypted credentials (apiKey, region, orgId, metadata)
- models: global catalog (slug, displayName, modality/text+image+audio, contextWindow, supportsTools, supportsJSON, supportsStreaming, metadata)
- provider_models: join of provider+model with provider-specific overrides (endpoint path, apiName, input/output tokenization hints, maxTokens defaults, safety features, latency stats rollups)
- model_aliases: per team/env alias → concrete provider_model mapping (for stable public names and A/B)
- price_book: granularity by provider_model + region + unit (input/output tokens, requests, images, audio) with effectiveFrom/To; currency

Routing configuration and policies
- routing_policies: per team/env top-level policy doc (deterministic | weighted | performance-based | cost-cap | hybrid)
- routing_rules: ordered rule set targeting model_alias or tag. Conditions: request metadata, user segment, country, referrer, path, budgetRemaining, time window
- routing_targets: N targets per rule with weight, max concurrency, timeout, maxRetries, jitter, allowed regions
- fallback_chains: ordered targets when rule target fails (model/provider fallback, fail-open vs fail-closed)
- retry_policies: backoff strategy, retryable error classes, maxAttempts
- safety_policies: moderation settings, blocklists, jailbreak detectors, PII masking settings
- transform_policies: pre/post processors (prompt templating, system prepend, JSON schema enforcement)

Access, keys, and restrictions
- api_keys: use Better-Auth apiKeysTable as source of truth; link keys to teams and environments via a companion api_key_bindings table (apiKeyId → teamId, environmentId). Fields: name, hashedKey/lastFour, scopes (chat, embeddings, images, admin), enabled, expiresAt, metadata (do not modify auth table columns).
- key_restrictions: companion table keyed by apiKeyId (FK to apiKeysTable.id) with ipAllowlist, ipBlocklist, origin/referrer allowlist, path scope, QPS/QPM caps, model allow/deny, region allow/deny.
- key_events: issuance, rotation, revocation, lastUsedAt

Traffic, messages, and traces
- requests: immutable ingress record; idempotencyKey, teamId/envId, apiKeyId, userId (if JWT), request type (chat, completions, embeddings), inputSize, requestedModel, routingDecisionId, latencyMs, status, errorClass, metadata
- messages: for chat/completions; requestId, index, role (system/user/assistant/tool), content (text/parts), toolCall summary, functionCall json
- streaming_events: fine-grained chunks for streaming; requestId, seq, eventType (token, tool_call, function_call, delta, end), payload
- responses: final egress record; requestId, providerModelId, outputSize, finishReason, usageTokenTotals (input/output/total), status
- tool_calls: requestId, stepIndex, name, args, result, latencyMs, error

Usage, quotas, and billing
- usage_events: per-request usage tokens/cost at source-of-truth granularity; dims: time, provider, model, alias, team, env, key, user; fields: inputTokens, outputTokens, images, audio, costMicros, currency
- quotas: per team/env/key (limits: dailyTokens, monthlyTokens, spendMicros, requestsPerDay, tokensPerMinute)
- ratelimit_buckets: rolling window counters (scope: key/team/env); counters + resetAt
- spend_aggregates: rollups by day/month/team/env for fast dashboards

Analytics and health
- provider_metrics: aggregates of latency, error rate, throughput by provider_model and region/time
- model_metrics: aggregates across providers for a logical model_alias
- ab_tests: definition (A/B/n), traffic split, goal metric
- ab_assignments: sticky assignment per user/session/key for an active test
- feedback: per request or per message rating, categorical tags, free-text
- tags: freeform labels applied to requests/keys/teams for segmentation

Developer UX features
- prompt_templates: named templates; team/env, type (system, user, tool), variables schema (zod json), versioning
- prompt_versions: immutable revision with diff summary, createdBy
- prompt_runs: resolved template + variables snapshot per request for replay
- prompt_cache: normalized cache key (templateId+vars+modelAlias), response snapshot, ttl, hit/miss stats

Data and files
- datasets: grouped assets for evals/fine-tuning; team/env; type (text, jsonl, images)
- data_files: storage reference (provider, bucket, path, sha256, sizeBytes, mime), usage (training, eval, prompts)
- finetune_jobs: provider, baseModel, hyperparams, status, costMicros, events
- finetune_events: progress logs; timestamps, metrics
- embedding_jobs: batch embeddings; status; dimensions; cost

Webhooks and events
- webhook_endpoints: team/env; url, secret, eventTypes, active
- webhook_deliveries: attempt log with payload hash, status, latencyMs, nextRetryAt, retryCount, lastError
- domain_events: normalized internal bus of key domain events (request.created, response.completed, quota.exceeded, key.revoked) for fan-out

Audit and admin
- audit_logs: actor (user/key), action, target, before/after, ip, userAgent, reason
- admin_overrides: emergency flags to disable providers/models/regions; reason + expiresAt

- organization 1—* teams; team 1—* environments
- environment 1—* api_key_bindings (→ apiKeysTable), provider_credentials, routing_policies, quotas
- provider 1—* provider_models; model 1—* provider_models; provider_model 1—* price_book
- team/env — model_aliases → provider_models
- routing_policies 1—* routing_rules 1—* routing_targets; 1—* fallback_chains; 1—1 retry_policies; 1—1 safety_policies; 1—1 transform_policies
- request 1—* messages, streaming_events, tool_calls; request 1—1 response; response 1—* usage_events
- ab_tests 1—* ab_assignments; requests reference ab_assignmentId for attribution
- webhook_endpoints 1—* webhook_deliveries

Indexing and performance
- High-cardinality: requests(id, createdAt DESC), usage_events(time DESC, teamId, envId, modelAlias, providerModelId)
- Routing: routing_rules(teamId, envId, active), routing_targets(ruleId, weight)
- Keys: api_keys(key lookup via prefix/start) with companion api_key_bindings(teamId, environmentId), key_restrictions(apiKeyId), key_events(apiKeyId, createdAt DESC)
- Quotas/ratelimits: quotas(teamId, envId), ratelimit_buckets(scope, windowStart)
- Analytics: provider_metrics(day, providerModelId), spend_aggregates(day, teamId, envId)

Soft deletion and retention
- Soft-delete keys, templates, credentials; hard-delete streaming_events after retention window
- Partition/time-series tables for requests, streaming_events, usage_events where viable; consider monthly partitions

Schema placement (Drizzle + Zod)
- drizzle/schema/router.ts (or split by domain: catalog.ts, routing.ts, traffic.ts, usage.ts, webhooks.ts, analytics.ts)
- packages/core/src/schemas/* mirror DB tables via drizzle-zod: createSelectSchema, createInsertSchema, createUpdateSchema
- Reuse Better-Auth tables in drizzle/schema/auth.ts (organizationsTable, teamsTable, teamMembersTable, apiKeysTable) untouched; attach via foreign keys (userId, orgId, teamId via companion binding) and store custom team/env metadata in companion tables or the metadata columns when relational guarantees aren’t required.

Column conventions (examples)
- id: varchar(ulid) generated by createId(); createdAt/updatedAt timestamptz default now(); deletedAt nullable
- metadata: jsonb for unstructured extensions; limit depth with zod
- money and cost: store in micros (int64); currency ISO code alongside if multi-currency is required
- enums: use string enums in TS and DB check constraints

Error taxonomy and retries
- Standardize errorClass (timeout, ratelimit, provider_auth, provider_5xx, validation, safety_block)
- retry_policies map errorClass → behavior; requests record applied policy and attempt number

Observability and UX uplift vs OpenRouter
- First-class prompt templates and runs with cache and replay
- Rich per-request trace and streaming event log for debugging
- A/B testing and sticky assignments
- Granular key restrictions and scopes; environment scoping
- Real-time quotas/ratelimits with fast counters
- Provider health metrics feed routing; automatic degrade to cheaper/faster depending on policy

Migration and rollout
- Phase 1 (MVP parity): providers, models, provider_models, price_book, teams/env/key bindings, requests/responses/messages, usage_events, quotas, basic routing_rules/targets, webhooks, audit_logs
- Phase 2 (UX+): prompt_templates/versions/runs, prompt_cache, feedback, tags, analytics rollups, provider_metrics
- Phase 3 (advanced): ab_tests/assignments, fine-tunes, datasets/files, embedding_jobs, safety/transform policies, streaming_events detail

Testing strategy
- Unit: Zod schemas vs fixtures; policy evaluation given inputs; key restriction evaluation
- Integration: end-to-end request → routing → provider mock → usage_event → webhook delivery
- Data quality: constraints, unique indexes, non-null invariants; monthly partitions validated; rollup accuracy checks

Security and privacy
- Encrypt provider_credentials secrets at rest; redact in logs; audit access
- PII flags in safety_policies; optional hashing of user identifiers for analytics
- IP/origin allowlist enforcement at ingress; signed webhook verification

Deliverables
- Drizzle schemas for Phase 1 domain tables (including api_key_bindings, key_restrictions, environments, routing, requests/usage)
- Zod schemas via drizzle-zod
- Seed scripts for providers/models/price_book
- Migrations generated by drizzle and not hand-edited

Acceptance criteria
- Can register provider credentials and route traffic via policy/alias scoped to team/env
- Can bind existing apiKeysTable keys to teams/environments and enforce restrictions; rate limit and quota enforced
- Requests/responses logged with usage cost computed from price_book; usage aggregated by team/env
- Webhooks dispatched; analytics dashboards backed by aggregates by team/env
