import z from 'zod';
import { Provider } from '~/core/schemas/provider';

const databaseProviderShape = Provider.shape;

const {
  // stripped
  id: _id,
  iconUrl: _iconUrl,

  ...providerShape
} = databaseProviderShape;

export const ProviderV1 = z.object({
  ...providerShape,
});
export type ProviderV1 = z.infer<typeof ProviderV1>;
