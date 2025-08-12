CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text
);
--> statement-breakpoint
CREATE TABLE "api_keys" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"user_id" text NOT NULL,
	"name" text,
	"start" text,
	"prefix" text,
	"key" text NOT NULL,
	"refill_interval" integer,
	"refill_amount" integer,
	"last_refill_at" timestamp with time zone,
	"enabled" boolean DEFAULT true,
	"rate_limit_enabled" boolean DEFAULT true,
	"rate_limit_time_window" integer DEFAULT 86400000,
	"rate_limit_max" integer DEFAULT 10,
	"request_count" integer,
	"remaining" integer,
	"last_request" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"permissions" text,
	"metadata" text
);
--> statement-breakpoint
CREATE TABLE "organization_invitations" (
	"id" text PRIMARY KEY NOT NULL,
	"organization_id" text NOT NULL,
	"email" text NOT NULL,
	"role" text,
	"team_id" text,
	"status" text DEFAULT 'pending' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"inviter_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organization_members" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"organization_id" text NOT NULL,
	"user_id" text NOT NULL,
	"role" text DEFAULT 'member' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"name" text NOT NULL,
	"slug" text,
	"logo" text,
	"metadata" text,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "team_members" (
	"id" text PRIMARY KEY NOT NULL,
	"team_id" text NOT NULL,
	"user_id" text NOT NULL,
	"created_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone,
	"organization_id" text NOT NULL,
	"name" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean NOT NULL,
	"image" text,
	"role" text,
	"banned" boolean,
	"ban_reason" text,
	"ban_expires" timestamp with time zone,
	"stripe_customer_id" text,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "api_key_bindings" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"api_key_id" text NOT NULL,
	"organization_id" text,
	"team_id" text,
	"environment_id" text,
	"scope" text DEFAULT 'team'
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"actor_user_id" text,
	"actor_api_key_id" text,
	"action" text NOT NULL,
	"target" text,
	"before" jsonb,
	"after" jsonb,
	"ip" text,
	"user_agent" text,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "environments" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"team_id" text NOT NULL,
	"name" text NOT NULL,
	"type" text NOT NULL,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"request_id" text NOT NULL,
	"role" text NOT NULL,
	"content" jsonb
);
--> statement-breakpoint
CREATE TABLE "model_aliases" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"organization_id" text,
	"team_id" text,
	"environment_id" text,
	"provider_model_id" text NOT NULL,
	"scope" text DEFAULT 'team',
	"alias" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "models" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"slug" text NOT NULL,
	"display_name" text NOT NULL,
	"input_modalities" jsonb,
	"output_modalities" jsonb,
	"context_window" integer,
	"metadata" jsonb,
	CONSTRAINT "models_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "price_book" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"provider_model_id" text NOT NULL,
	"region" text,
	"unit" text NOT NULL,
	"price_micros" integer NOT NULL,
	"currency" text,
	"effective_from" timestamp,
	"effective_to" timestamp
);
--> statement-breakpoint
CREATE TABLE "provider_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"provider_id" text NOT NULL,
	"organization_id" text,
	"team_id" text,
	"environment_id" text,
	"type" text,
	"name" text,
	"value" text,
	"status" text,
	"region" text,
	"org_external_id" text,
	"last_rotate_at" timestamp with time zone,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "provider_models" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"provider_id" text NOT NULL,
	"model_id" text NOT NULL,
	"slug" text NOT NULL,
	"endpoint_path" text,
	"input_modalities" jsonb,
	"output_modalities" jsonb,
	"max_output_tokens" integer,
	"tokenizer" text,
	"quantization" text,
	"dimensions" integer,
	"parameter_mapping" jsonb,
	"safety_features" jsonb,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "providers" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text,
	"base_url" text,
	"metadata" jsonb,
	CONSTRAINT "providers_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "quotas" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"team_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"daily_tokens" integer,
	"monthly_tokens" integer,
	"spend_micros" integer,
	"requests_per_day" integer,
	"tokens_per_minute" integer
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"team_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"user_id" text,
	"idempotency_key" text,
	"request_type" text NOT NULL,
	"requested_model" text,
	"input_size" integer,
	"routing_decision_id" text,
	"latency_ms" integer,
	"status" text,
	"error_class" text,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "responses" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"request_id" text NOT NULL,
	"provider_model_id" text,
	"output_size" integer,
	"finish_reason" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"total_tokens" integer,
	"status" text
);
--> statement-breakpoint
CREATE TABLE "routing_policies" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"organization_id" text,
	"team_id" text,
	"environment_id" text,
	"scope" text DEFAULT 'team',
	"type" text NOT NULL,
	"active" boolean DEFAULT true,
	"metadata" jsonb
);
--> statement-breakpoint
CREATE TABLE "routing_rules" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"policy_id" text NOT NULL,
	"order" integer NOT NULL,
	"condition" jsonb,
	"target_alias" text,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
CREATE TABLE "routing_targets" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"rule_id" text NOT NULL,
	"provider_model_id" text NOT NULL,
	"weight" integer DEFAULT 1,
	"timeout_ms" integer,
	"max_retries" integer,
	"jitter_ms" integer,
	"region_allowlist" jsonb
);
--> statement-breakpoint
CREATE TABLE "usage_events" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"request_id" text,
	"team_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"api_key_id" text,
	"provider_id" text,
	"model_id" text,
	"provider_model_id" text,
	"alias" text,
	"input_tokens" integer,
	"output_tokens" integer,
	"images" integer,
	"audio" integer,
	"cost_micros" integer,
	"currency" text
);
--> statement-breakpoint
CREATE TABLE "webhook_deliveries" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"endpoint_id" text NOT NULL,
	"request_id" text,
	"payload_hash" text,
	"status" text,
	"latency_ms" integer,
	"next_retry_at" timestamp,
	"retry_count" integer,
	"last_error" text
);
--> statement-breakpoint
CREATE TABLE "webhook_endpoints" (
	"id" text PRIMARY KEY NOT NULL,
	"created_at" timestamp with time zone,
	"updated_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"team_id" text NOT NULL,
	"environment_id" text NOT NULL,
	"url" text NOT NULL,
	"secret" text,
	"event_types" jsonb,
	"active" boolean DEFAULT true
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_keys" ADD CONSTRAINT "api_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_invitations" ADD CONSTRAINT "organization_invitations_inviter_id_users_id_fk" FOREIGN KEY ("inviter_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_bindings" ADD CONSTRAINT "api_key_bindings_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_bindings" ADD CONSTRAINT "api_key_bindings_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_bindings" ADD CONSTRAINT "api_key_bindings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "api_key_bindings" ADD CONSTRAINT "api_key_bindings_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_api_key_id_api_keys_id_fk" FOREIGN KEY ("actor_api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "environments" ADD CONSTRAINT "environments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_aliases" ADD CONSTRAINT "model_aliases_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_aliases" ADD CONSTRAINT "model_aliases_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_aliases" ADD CONSTRAINT "model_aliases_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "model_aliases" ADD CONSTRAINT "model_aliases_provider_model_id_provider_models_id_fk" FOREIGN KEY ("provider_model_id") REFERENCES "public"."provider_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "price_book" ADD CONSTRAINT "price_book_provider_model_id_provider_models_id_fk" FOREIGN KEY ("provider_model_id") REFERENCES "public"."provider_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_credentials" ADD CONSTRAINT "provider_credentials_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_models" ADD CONSTRAINT "provider_models_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "provider_models" ADD CONSTRAINT "provider_models_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotas" ADD CONSTRAINT "quotas_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "responses" ADD CONSTRAINT "responses_provider_model_id_provider_models_id_fk" FOREIGN KEY ("provider_model_id") REFERENCES "public"."provider_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_policies" ADD CONSTRAINT "routing_policies_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_policies" ADD CONSTRAINT "routing_policies_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_policies" ADD CONSTRAINT "routing_policies_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_rules" ADD CONSTRAINT "routing_rules_policy_id_routing_policies_id_fk" FOREIGN KEY ("policy_id") REFERENCES "public"."routing_policies"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_targets" ADD CONSTRAINT "routing_targets_rule_id_routing_rules_id_fk" FOREIGN KEY ("rule_id") REFERENCES "public"."routing_rules"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "routing_targets" ADD CONSTRAINT "routing_targets_provider_model_id_provider_models_id_fk" FOREIGN KEY ("provider_model_id") REFERENCES "public"."provider_models"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_api_key_id_api_keys_id_fk" FOREIGN KEY ("api_key_id") REFERENCES "public"."api_keys"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_provider_id_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."providers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_model_id_models_id_fk" FOREIGN KEY ("model_id") REFERENCES "public"."models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usage_events" ADD CONSTRAINT "usage_events_provider_model_id_provider_models_id_fk" FOREIGN KEY ("provider_model_id") REFERENCES "public"."provider_models"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_endpoint_id_webhook_endpoints_id_fk" FOREIGN KEY ("endpoint_id") REFERENCES "public"."webhook_endpoints"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_deliveries" ADD CONSTRAINT "webhook_deliveries_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "webhook_endpoints" ADD CONSTRAINT "webhook_endpoints_environment_id_environments_id_fk" FOREIGN KEY ("environment_id") REFERENCES "public"."environments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "apib_api_key_idx" ON "api_key_bindings" USING btree ("api_key_id");--> statement-breakpoint
CREATE INDEX "apib_team_env_idx" ON "api_key_bindings" USING btree ("team_id","environment_id");--> statement-breakpoint
CREATE INDEX "apib_org_idx" ON "api_key_bindings" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "apib_unique_binding" ON "api_key_bindings" USING btree ("api_key_id","organization_id","team_id","environment_id","scope");--> statement-breakpoint
CREATE INDEX "alog_actor_user_idx" ON "audit_logs" USING btree ("actor_user_id","created_at");--> statement-breakpoint
CREATE INDEX "alog_actor_key_idx" ON "audit_logs" USING btree ("actor_api_key_id","created_at");--> statement-breakpoint
CREATE INDEX "alog_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "env_team_idx" ON "environments" USING btree ("team_id");--> statement-breakpoint
CREATE UNIQUE INDEX "env_team_name_unq" ON "environments" USING btree ("team_id","name");--> statement-breakpoint
CREATE INDEX "env_team_type_idx" ON "environments" USING btree ("team_id","type");--> statement-breakpoint
CREATE INDEX "mess_req_idx" ON "messages" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "alias_team_env_idx" ON "model_aliases" USING btree ("team_id","environment_id","alias");--> statement-breakpoint
CREATE INDEX "alias_provider_idx" ON "model_aliases" USING btree ("provider_model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "alias_scope_unq" ON "model_aliases" USING btree ("scope","organization_id","team_id","environment_id","alias");--> statement-breakpoint
CREATE INDEX "model_name_idx" ON "models" USING btree ("display_name");--> statement-breakpoint
CREATE INDEX "price_model_idx" ON "price_book" USING btree ("provider_model_id");--> statement-breakpoint
CREATE INDEX "price_lookup_idx" ON "price_book" USING btree ("provider_model_id","region","unit","effective_from");--> statement-breakpoint
CREATE INDEX "pcred_scope_idx" ON "provider_credentials" USING btree ("team_id","environment_id","provider_id");--> statement-breakpoint
CREATE INDEX "pcred_status_idx" ON "provider_credentials" USING btree ("status");--> statement-breakpoint
CREATE UNIQUE INDEX "pcred_unique_name" ON "provider_credentials" USING btree ("provider_id","team_id","environment_id","name");--> statement-breakpoint
CREATE INDEX "pmodel_provider_idx" ON "provider_models" USING btree ("provider_id");--> statement-breakpoint
CREATE INDEX "pmodel_model_idx" ON "provider_models" USING btree ("model_id");--> statement-breakpoint
CREATE UNIQUE INDEX "pmodel_provider_slug_unq" ON "provider_models" USING btree ("provider_id","slug");--> statement-breakpoint
CREATE INDEX "prov_status_idx" ON "providers" USING btree ("status");--> statement-breakpoint
CREATE INDEX "prov_name_idx" ON "providers" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "quota_scope_unq" ON "quotas" USING btree ("team_id","environment_id","api_key_id");--> statement-breakpoint
CREATE INDEX "req_scope_time_idx" ON "requests" USING btree ("team_id","environment_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "req_idem_unq" ON "requests" USING btree ("team_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "req_api_user_idx" ON "requests" USING btree ("api_key_id","user_id");--> statement-breakpoint
CREATE INDEX "req_type_model_idx" ON "requests" USING btree ("request_type","requested_model");--> statement-breakpoint
CREATE UNIQUE INDEX "resp_req_unq" ON "responses" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "resp_provider_idx" ON "responses" USING btree ("provider_model_id");--> statement-breakpoint
CREATE INDEX "pol_scope_idx" ON "routing_policies" USING btree ("team_id","environment_id","scope");--> statement-breakpoint
CREATE INDEX "pol_active_idx" ON "routing_policies" USING btree ("active");--> statement-breakpoint
CREATE INDEX "pol_type_idx" ON "routing_policies" USING btree ("type");--> statement-breakpoint
CREATE INDEX "rule_policy_idx" ON "routing_rules" USING btree ("policy_id");--> statement-breakpoint
CREATE UNIQUE INDEX "rule_order_unq" ON "routing_rules" USING btree ("policy_id","order");--> statement-breakpoint
CREATE INDEX "rule_active_idx" ON "routing_rules" USING btree ("active");--> statement-breakpoint
CREATE INDEX "targ_rule_idx" ON "routing_targets" USING btree ("rule_id");--> statement-breakpoint
CREATE UNIQUE INDEX "targ_unique" ON "routing_targets" USING btree ("rule_id","provider_model_id");--> statement-breakpoint
CREATE INDEX "use_scope_time_idx" ON "usage_events" USING btree ("team_id","environment_id","created_at");--> statement-breakpoint
CREATE INDEX "use_provider_model_idx" ON "usage_events" USING btree ("provider_id","model_id","provider_model_id");--> statement-breakpoint
CREATE INDEX "use_request_idx" ON "usage_events" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "use_alias_idx" ON "usage_events" USING btree ("alias");--> statement-breakpoint
CREATE INDEX "whd_endpoint_time_idx" ON "webhook_deliveries" USING btree ("endpoint_id","created_at");--> statement-breakpoint
CREATE INDEX "whd_request_idx" ON "webhook_deliveries" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "whe_scope_idx" ON "webhook_endpoints" USING btree ("team_id","environment_id");--> statement-breakpoint
CREATE INDEX "whe_url_idx" ON "webhook_endpoints" USING btree ("url");--> statement-breakpoint
CREATE UNIQUE INDEX "whe_scope_url_unq" ON "webhook_endpoints" USING btree ("team_id","environment_id","url");