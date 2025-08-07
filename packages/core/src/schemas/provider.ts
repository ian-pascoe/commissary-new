import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from 'drizzle-zod';
import type * as z from 'zod';
import { providersTable } from '../database/schema';

export const Provider = createSelectSchema(providersTable);
export type Provider = z.infer<typeof Provider>;

export const CreateProvider = createInsertSchema(providersTable);
export type CreateProvider = z.infer<typeof CreateProvider>;
export type CreateProviderInput = z.input<typeof CreateProvider>;

export const UpdateProvider = createUpdateSchema(providersTable);
export type UpdateProvider = z.infer<typeof UpdateProvider>;
export type UpdateProviderInput = z.input<typeof UpdateProvider>;
