import * as z from 'zod';
import { CreateProviderModel } from '~/core/schemas/model';
import { CreateProvider } from '~/core/schemas/provider';

export const BulkCreateProviders = z.object({
  $schema: z.optional(z.string()),
  data: z.array(CreateProvider).check(z.minLength(1)),
});

export const BulkCreateModels = z.object({
  $schema: z.optional(z.string()),
  data: z
    .array(
      CreateProviderModel.extend({
        providerSlug: z.string(),
        sharedSlug: z.string(),
      }),
    )
    .check(z.minLength(1)),
});
