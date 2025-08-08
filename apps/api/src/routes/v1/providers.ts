import { getTableColumns } from 'drizzle-orm';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import * as z from 'zod';
import { ProviderV1 } from '~/api/schemas/v1/provider';
import { factory } from '~/api/utils/factory';
import { v1DefaultResponses } from '~/api/utils/v1/default-responses';
import { providersTable } from '~/core/database/schema';

export const v1ProvidersRoute = factory.createApp().get(
  '/',
  describeRoute({
    description: 'Get all providers',
    responses: {
      200: {
        description: 'A list of providers',
        content: {
          'application/json': {
            schema: resolver(z.object({ data: z.array(ProviderV1) })),
          },
        },
      },
      ...v1DefaultResponses,
    },
  }),
  async (c) => {
    const db = c.get('db');

    const { id: _id, ...providerColumns } = getTableColumns(providersTable);
    const providers = await db.select(providerColumns).from(providersTable);

    return c.json({ data: providers satisfies Array<ProviderV1> }, 200);
  },
);
