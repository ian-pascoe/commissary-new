import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import * as z from 'zod';
import { providersTable } from '../database/schema/general';

export const ProviderCredentials = z.union([
  z.object({
    apiKey: z.string(),
  }),
  z.object({
    accessKeyId: z.string(),
    secretAccessKey: z.string(),
  }),
]);
export type ProviderCredentials = z.infer<typeof ProviderCredentials>;

export const Provider = createSelectSchema(providersTable);
export type Provider = z.infer<typeof Provider>;

export const CreateProvider = createInsertSchema(providersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type CreateProvider = z.infer<typeof CreateProvider>;
export type CreateProviderInput = z.input<typeof CreateProvider>;

export const UpdateProvider = createUpdateSchema(providersTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type UpdateProvider = z.infer<typeof UpdateProvider>;
export type UpdateProviderInput = z.input<typeof UpdateProvider>;
