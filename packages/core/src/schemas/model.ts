import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import type * as z from 'zod';
import { modelsTable, providerModelsTable } from '../database/schema';

export const Model = createSelectSchema(modelsTable);
export type Model = z.infer<typeof Model>;

export const CreateModel = createInsertSchema(modelsTable);
export type CreateModel = z.infer<typeof CreateModel>;
export type CreateModelInput = z.input<typeof CreateModel>;

export const UpdateModel = createUpdateSchema(modelsTable);
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
