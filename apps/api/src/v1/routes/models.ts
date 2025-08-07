import { eq, getTableColumns } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import * as z from 'zod';
import { factory } from '~/api/utils/factory';
import { validator } from '~/api/utils/validator';
import { modelsTable, providerModelsTable } from '~/core/database/schema';
import {
  CreateModel,
  Model as DatabaseModel,
  UpdateModel,
} from '~/core/schemas/model';
import { defaultResponses } from '../responses';
import { Model } from '../schemas/model';
import { transformModel } from '../utils/transform-model';

export const modelsRoute = factory
  .createApp()
  .get(
    '/',
    describeRoute({
      description: 'List available models',
      responses: {
        200: {
          description: 'A list of models',
          content: {
            'application/json': {
              schema: resolver(z.object({ data: z.array(Model) })),
            },
          },
        },
        ...defaultResponses,
      },
    }),
    async (c) => {
      const db = c.get('db');

      const models = await db
        .select({
          ...getTableColumns(modelsTable),
          ...getTableColumns(providerModelsTable),
        })
        .from(modelsTable)
        .innerJoin(
          providerModelsTable,
          eq(providerModelsTable.slug, modelsTable.slug),
        )
        .orderBy(providerModelsTable.inputPrice)
        .groupBy(modelsTable.slug);

      return c.json({ data: models.map(transformModel) }, 200);
    },
  )
  .post(
    '/',
    describeRoute({
      description: 'Create a model',
      responses: {
        201: {
          description: 'The created model',
          content: {
            'application/json': {
              schema: resolver(z.object({ data: DatabaseModel })),
            },
          },
        },
        ...defaultResponses,
      },
    }),
    validator('json', CreateModel),
    async (c) => {
      const input = c.req.valid('json');
      const db = c.get('db');

      const [model] = await db.insert(modelsTable).values(input).returning();
      if (!model) {
        throw new HTTPException(500, { message: 'Failed to create model' });
      }

      return c.json({ data: model }, 201);
    },
  )
  .put(
    '/:slug',
    describeRoute({
      description: 'Update a model',
      responses: {
        200: {
          description: 'The updated model',
          content: {
            'application/json': {
              schema: resolver(z.object({ data: DatabaseModel })),
            },
          },
        },
        ...defaultResponses,
      },
    }),
    validator('param', z.object({ slug: z.string() })),
    validator('json', UpdateModel),
    async (c) => {
      const { slug } = c.req.valid('param');
      const input = c.req.valid('json');
      const db = c.get('db');

      const [model] = await db
        .update(modelsTable)
        .set(input)
        .where(eq(modelsTable.slug, slug))
        .returning();
      if (!model) {
        throw new HTTPException(404, { message: 'Model not found' });
      }

      return c.json({ data: model }, 200);
    },
  );
