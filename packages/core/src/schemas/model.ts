import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import * as z from 'zod';
import { modelsTable, providerModelsTable } from '../database/schema/general';

export const Model = createSelectSchema(modelsTable);
export type Model = z.infer<typeof Model>;

export const CreateModel = createInsertSchema(modelsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateModel = z.infer<typeof CreateModel>;
export type CreateModelInput = z.input<typeof CreateModel>;

export const UpdateModel = createUpdateSchema(modelsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateModel = z.infer<typeof UpdateModel>;
export type UpdateModelInput = z.input<typeof UpdateModel>;

export const ProviderModel = createSelectSchema(providerModelsTable);
export type ProviderModel = z.infer<typeof ProviderModel>;

export const CreateProviderModel = createInsertSchema(providerModelsTable).omit(
  {
    id: true,
    createdAt: true,
    updatedAt: true,
    providerId: true,
    modelId: true,
  },
);
export type CreateProviderModel = z.infer<typeof CreateProviderModel>;
export type CreateProviderModelInput = z.input<typeof CreateProviderModel>;

export const UpdateProviderModel = createUpdateSchema(providerModelsTable).omit(
  {
    id: true,
    createdAt: true,
    updatedAt: true,
    providerId: true,
    modelId: true,
  },
);
export type UpdateProviderModel = z.infer<typeof UpdateProviderModel>;
export type UpdateProviderModelInput = z.input<typeof UpdateProviderModel>;

export const SupportedParameter = z.enum([
  'max_tokens',
  'temperature',
  'top_p',
  'stop',
  'seed',
  'top_k',
  'frequency_penalty',
  'presence_penalty',
  'repetition_penalty',
  'min_p',
  'top_a',
  'logit_bias',
  'logprobs',
  'top_logprobs',
  'response_format',
  'structured_outputs',
  'tools',
  'tool_choice',
  'web_search_options',
  'reasoning',
  'include_reasoning',
]);
export type SupportedParameter = z.infer<typeof SupportedParameter>;
