import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import * as z from 'zod';
import { factory } from '~/api/utils/factory';
import { validator } from '~/api/utils/validator';
import { defaultResponses } from '~/api/v1/responses';
import { providersTable } from '~/core/database/schema';
import {
  CreateProvider,
  Provider,
  UpdateProvider,
} from '~/core/schemas/provider';

export const providersRoute = factory
  .createApp()
  .get(
    '/',
    describeRoute({
      description: 'Get all providers',
      responses: {
        200: {
          description: 'A list of providers',
          content: {
            'application/json': {
              schema: resolver(z.object({ data: z.array(Provider) })),
            },
          },
        },
        ...defaultResponses,
      },
    }),
    async (c) => {
      const db = c.get('db');

      const providers = await db.select().from(providersTable);

      return c.json({ data: providers }, 200);
    },
  )
  .post(
    '/',
    describeRoute({
      description: 'Create a new provider',
      responses: {
        201: {
          description: 'The created provider',
          content: {
            'application/json': {
              schema: resolver(z.object({ data: Provider })),
            },
          },
        },
        ...defaultResponses,
      },
    }),
    validator('json', CreateProvider),
    async (c) => {
      const input = c.req.valid('json');
      const db = c.get('db');

      const [newProvider] = await db
        .insert(providersTable)
        .values(input)
        .returning();
      if (!newProvider) {
        throw new HTTPException(500, { message: 'Failed to create provider' });
      }

      return c.json({ data: newProvider }, 201);
    },
  )
  .put(
    '/:slug',
    describeRoute({
      description: 'Update a provider',
      responses: {
        200: {
          description: 'The updated provider',
          content: {
            'application/json': {
              schema: resolver(
                z.object({
                  success: z.literal(true),
                  data: Provider,
                }),
              ),
            },
          },
        },
        ...defaultResponses,
      },
    }),
    validator('param', z.object({ slug: z.string() })),
    validator('json', UpdateProvider),
    async (c) => {
      const input = c.req.valid('json');
      const slug = c.req.param('slug');
      const db = c.get('db');

      const [updatedProvider] = await db
        .update(providersTable)
        .set(input)
        .where(eq(providersTable.slug, slug))
        .returning();
      if (!updatedProvider) {
        throw new HTTPException(404, { message: 'Provider not found' });
      }

      return c.json({ data: updatedProvider }, 200);
    },
  );
