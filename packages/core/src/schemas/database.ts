import { createInsertSchema, createSelectSchema, createUpdateSchema } from 'drizzle-zod';
import type * as z from 'zod';
import * as schema from '~/drizzle/schema';

const defaultOmit = {
  id: true,
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

export const Environment = createSelectSchema(schema.environmentsTable);
export type Environment = z.infer<typeof Environment>;
export const CreateEnvironment = createInsertSchema(schema.environmentsTable).omit(defaultOmit);
export type CreateEnvironment = z.infer<typeof CreateEnvironment>;
export type CreateEnvironmentInput = z.input<typeof CreateEnvironment>;
export const UpdateEnvironment = createUpdateSchema(schema.environmentsTable).omit(defaultOmit);
export type UpdateEnvironment = z.infer<typeof UpdateEnvironment>;
export type UpdateEnvironmentInput = z.input<typeof UpdateEnvironment>;

export const ApiKeyBinding = createSelectSchema(schema.apiKeyBindingsTable);
export type ApiKeyBinding = z.infer<typeof ApiKeyBinding>;
export const CreateApiKeyBinding = createInsertSchema(schema.apiKeyBindingsTable).omit(defaultOmit);
export type CreateApiKeyBinding = z.infer<typeof CreateApiKeyBinding>;
export type CreateApiKeyBindingInput = z.input<typeof CreateApiKeyBinding>;
export const UpdateApiKeyBinding = createUpdateSchema(schema.apiKeyBindingsTable).omit(defaultOmit);
export type UpdateApiKeyBinding = z.infer<typeof UpdateApiKeyBinding>;
export type UpdateApiKeyBindingInput = z.input<typeof UpdateApiKeyBinding>;

export const Provider = createSelectSchema(schema.providersTable);
export type Provider = z.infer<typeof Provider>;
export const CreateProvider = createInsertSchema(schema.providersTable).omit(defaultOmit);
export type CreateProvider = z.infer<typeof CreateProvider>;
export type CreateProviderInput = z.input<typeof CreateProvider>;
export const UpdateProvider = createUpdateSchema(schema.providersTable).omit(defaultOmit);
export type UpdateProvider = z.infer<typeof UpdateProvider>;
export type UpdateProviderInput = z.input<typeof UpdateProvider>;

export const Model = createSelectSchema(schema.modelsTable);
export type Model = z.infer<typeof Model>;
export const CreateModel = createInsertSchema(schema.modelsTable).omit(defaultOmit);
export type CreateModel = z.infer<typeof CreateModel>;
export type CreateModelInput = z.input<typeof CreateModel>;
export const UpdateModel = createUpdateSchema(schema.modelsTable).omit(defaultOmit);
export type UpdateModel = z.infer<typeof UpdateModel>;
export type UpdateModelInput = z.input<typeof UpdateModel>;

export const ProviderModel = createSelectSchema(schema.providerModelsTable);
export type ProviderModel = z.infer<typeof ProviderModel>;
export const CreateProviderModel = createInsertSchema(schema.providerModelsTable).omit(defaultOmit);
export type CreateProviderModel = z.infer<typeof CreateProviderModel>;
export type CreateProviderModelInput = z.input<typeof CreateProviderModel>;
export const UpdateProviderModel = createUpdateSchema(schema.providerModelsTable).omit(defaultOmit);
export type UpdateProviderModel = z.infer<typeof UpdateProviderModel>;
export type UpdateProviderModelInput = z.input<typeof UpdateProviderModel>;

export const Price = createSelectSchema(schema.priceBookTable);
export type Price = z.infer<typeof Price>;
export const CreatePrice = createInsertSchema(schema.priceBookTable).omit(defaultOmit);
export type CreatePrice = z.infer<typeof CreatePrice>;
export type CreatePriceInput = z.input<typeof CreatePrice>;
export const UpdatePrice = createUpdateSchema(schema.priceBookTable).omit(defaultOmit);
export type UpdatePrice = z.infer<typeof UpdatePrice>;
export type UpdatePriceInput = z.input<typeof UpdatePrice>;

export const ProviderCredential = createSelectSchema(schema.providerCredentialsTable);
export type ProviderCredential = z.infer<typeof ProviderCredential>;
export const CreateProviderCredential = createInsertSchema(schema.providerCredentialsTable).omit(
  defaultOmit,
);
export type CreateProviderCredential = z.infer<typeof CreateProviderCredential>;
export type CreateProviderCredentialInput = z.input<typeof CreateProviderCredential>;
export const UpdateProviderCredential = createUpdateSchema(schema.providerCredentialsTable).omit(
  defaultOmit,
);
export type UpdateProviderCredential = z.infer<typeof UpdateProviderCredential>;
export type UpdateProviderCredentialInput = z.input<typeof UpdateProviderCredential>;

export const ModelAlias = createSelectSchema(schema.modelAliasesTable);
export type ModelAlias = z.infer<typeof ModelAlias>;
export const CreateModelAlias = createInsertSchema(schema.modelAliasesTable).omit(defaultOmit);
export type CreateModelAlias = z.infer<typeof CreateModelAlias>;
export type CreateModelAliasInput = z.input<typeof CreateModelAlias>;
export const UpdateModelAlias = createUpdateSchema(schema.modelAliasesTable).omit(defaultOmit);
export type UpdateModelAlias = z.infer<typeof UpdateModelAlias>;
export type UpdateModelAliasInput = z.input<typeof UpdateModelAlias>;

export const RoutingPolicy = createSelectSchema(schema.routingPoliciesTable);
export type RoutingPolicy = z.infer<typeof RoutingPolicy>;
export const CreateRoutingPolicy = createInsertSchema(schema.routingPoliciesTable).omit(
  defaultOmit,
);
export type CreateRoutingPolicy = z.infer<typeof CreateRoutingPolicy>;
export type CreateRoutingPolicyInput = z.input<typeof CreateRoutingPolicy>;
export const UpdateRoutingPolicy = createUpdateSchema(schema.routingPoliciesTable).omit(
  defaultOmit,
);
export type UpdateRoutingPolicy = z.infer<typeof UpdateRoutingPolicy>;
export type UpdateRoutingPolicyInput = z.input<typeof UpdateRoutingPolicy>;

export const RoutingRule = createSelectSchema(schema.routingRulesTable);
export type RoutingRule = z.infer<typeof RoutingRule>;
export const CreateRoutingRule = createInsertSchema(schema.routingRulesTable).omit(defaultOmit);
export type CreateRoutingRule = z.infer<typeof CreateRoutingRule>;
export type CreateRoutingRuleInput = z.input<typeof CreateRoutingRule>;
export const UpdateRoutingRule = createUpdateSchema(schema.routingRulesTable).omit(defaultOmit);
export type UpdateRoutingRule = z.infer<typeof UpdateRoutingRule>;
export type UpdateRoutingRuleInput = z.input<typeof UpdateRoutingRule>;

export const RoutingTarget = createSelectSchema(schema.routingTargetsTable);
export type RoutingTarget = z.infer<typeof RoutingTarget>;
export const CreateRoutingTarget = createInsertSchema(schema.routingTargetsTable).omit(defaultOmit);
export type CreateRoutingTarget = z.infer<typeof CreateRoutingTarget>;
export type CreateRoutingTargetInput = z.input<typeof CreateRoutingTarget>;
export const UpdateRoutingTarget = createUpdateSchema(schema.routingTargetsTable).omit(defaultOmit);
export type UpdateRoutingTarget = z.infer<typeof UpdateRoutingTarget>;
export type UpdateRoutingTargetInput = z.input<typeof UpdateRoutingTarget>;

export const Request = createSelectSchema(schema.requestsTable);
export type Request = z.infer<typeof Request>;
export const CreateRequest = createInsertSchema(schema.requestsTable).omit(defaultOmit);
export type CreateRequest = z.infer<typeof CreateRequest>;
export type CreateRequestInput = z.input<typeof CreateRequest>;
export const UpdateRequest = createUpdateSchema(schema.requestsTable).omit(defaultOmit);
export type UpdateRequest = z.infer<typeof UpdateRequest>;
export type UpdateRequestInput = z.input<typeof UpdateRequest>;

export const Message = createSelectSchema(schema.messagesTable);
export type Message = z.infer<typeof Message>;
export const CreateMessage = createInsertSchema(schema.messagesTable).omit(defaultOmit);
export type CreateMessage = z.infer<typeof CreateMessage>;
export type CreateMessageInput = z.input<typeof CreateMessage>;
export const UpdateMessage = createUpdateSchema(schema.messagesTable).omit(defaultOmit);
export type UpdateMessage = z.infer<typeof UpdateMessage>;
export type UpdateMessageInput = z.input<typeof UpdateMessage>;

export const Response = createSelectSchema(schema.responsesTable);
export type Response = z.infer<typeof Response>;
export const CreateResponse = createInsertSchema(schema.responsesTable).omit(defaultOmit);
export type CreateResponse = z.infer<typeof CreateResponse>;
export type CreateResponseInput = z.input<typeof CreateResponse>;
export const UpdateResponse = createUpdateSchema(schema.responsesTable).omit(defaultOmit);
export type UpdateResponse = z.infer<typeof UpdateResponse>;
export type UpdateResponseInput = z.input<typeof UpdateResponse>;

export const UsageEvent = createSelectSchema(schema.usageEventsTable);
export type UsageEvent = z.infer<typeof UsageEvent>;
export const CreateUsageEvent = createInsertSchema(schema.usageEventsTable).omit(defaultOmit);
export type CreateUsageEvent = z.infer<typeof CreateUsageEvent>;
export type CreateUsageEventInput = z.input<typeof CreateUsageEvent>;
export const UpdateUsageEvent = createUpdateSchema(schema.usageEventsTable).omit(defaultOmit);
export type UpdateUsageEvent = z.infer<typeof UpdateUsageEvent>;
export type UpdateUsageEventInput = z.input<typeof UpdateUsageEvent>;

export const Quota = createSelectSchema(schema.quotasTable);
export type Quota = z.infer<typeof Quota>;
export const CreateQuota = createInsertSchema(schema.quotasTable).omit(defaultOmit);
export type CreateQuota = z.infer<typeof CreateQuota>;
export type CreateQuotaInput = z.input<typeof CreateQuota>;
export const UpdateQuota = createUpdateSchema(schema.quotasTable).omit(defaultOmit);
export type UpdateQuota = z.infer<typeof UpdateQuota>;
export type UpdateQuotaInput = z.input<typeof UpdateQuota>;

export const WebhookEndpoint = createSelectSchema(schema.webhookEndpointsTable);
export type WebhookEndpoint = z.infer<typeof WebhookEndpoint>;
export const CreateWebhookEndpoint = createInsertSchema(schema.webhookEndpointsTable).omit(
  defaultOmit,
);
export type CreateWebhookEndpoint = z.infer<typeof CreateWebhookEndpoint>;
export type CreateWebhookEndpointInput = z.input<typeof CreateWebhookEndpoint>;
export const UpdateWebhookEndpoint = createUpdateSchema(schema.webhookEndpointsTable).omit(
  defaultOmit,
);
export type UpdateWebhookEndpoint = z.infer<typeof UpdateWebhookEndpoint>;
export type UpdateWebhookEndpointInput = z.input<typeof UpdateWebhookEndpoint>;

export const WebhookDelivery = createSelectSchema(schema.webhookDeliveriesTable);
export type WebhookDelivery = z.infer<typeof WebhookDelivery>;
export const CreateWebhookDelivery = createInsertSchema(schema.webhookDeliveriesTable).omit(
  defaultOmit,
);
export type CreateWebhookDelivery = z.infer<typeof CreateWebhookDelivery>;
export type CreateWebhookDeliveryInput = z.input<typeof CreateWebhookDelivery>;
export const UpdateWebhookDelivery = createUpdateSchema(schema.webhookDeliveriesTable).omit(
  defaultOmit,
);
export type UpdateWebhookDelivery = z.infer<typeof UpdateWebhookDelivery>;
export type UpdateWebhookDeliveryInput = z.input<typeof UpdateWebhookDelivery>;

export const AuditLog = createSelectSchema(schema.auditLogsTable);
export type AuditLog = z.infer<typeof AuditLog>;
export const CreateAuditLog = createInsertSchema(schema.auditLogsTable).omit(defaultOmit);
export type CreateAuditLog = z.infer<typeof CreateAuditLog>;
export type CreateAuditLogInput = z.input<typeof CreateAuditLog>;
export const UpdateAuditLog = createUpdateSchema(schema.auditLogsTable).omit(defaultOmit);
export type UpdateAuditLog = z.infer<typeof UpdateAuditLog>;
export type UpdateAuditLogInput = z.input<typeof UpdateAuditLog>;
