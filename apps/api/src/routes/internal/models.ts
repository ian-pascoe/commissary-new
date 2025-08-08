import { eq, inArray, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { describeRoute } from 'hono-openapi';
import * as z from 'zod';
import { BulkCreateModels } from '~/api/schemas/internal/bulk-create';
import { factory } from '~/api/utils/factory';
import { validator } from '~/api/utils/validator';
import {
  modelsTable,
  providerModelsTable,
  providersTable,
} from '~/core/database/schema';
import {
  conflictUpdateSetAllExcluding,
  jsonSetInsert,
} from '~/core/database/utils';
import { CreateModel, UpdateModel } from '~/core/schemas/model';

export const internalModelsRoute = factory
  .createApp()
  .use('/*', describeRoute({ hide: true }))
  .get('/bulk-create.schema.json', (c) => {
    return c.json(z.toJSONSchema(BulkCreateModels));
  })
  .get('/', async (c) => {
    const db = c.get('db');

    const models = await db.select().from(modelsTable);

    return c.json({ data: models }, 200);
  })
  .post('/', validator('json', CreateModel), async (c) => {
    const input = c.req.valid('json');
    const db = c.get('db');

    const [model] = await db.insert(modelsTable).values(input).returning();
    if (!model) {
      throw new HTTPException(500, { message: 'Failed to create model' });
    }

    return c.json({ data: model }, 201);
  })
  .post('/bulk', validator('json', BulkCreateModels), async (c) => {
    const { data: payload } = c.req.valid('json');
    const db = c.get('db');

    const providerSlugs = payload.map(({ providerSlug }) => providerSlug);
    const providers = await db
      .select()
      .from(providersTable)
      .where(inArray(providersTable.slug, providerSlugs));
    if (!providers || providers.length === 0) {
      throw new HTTPException(404, { message: 'Provider not found' });
    }
    const providerBySlug = Object.fromEntries(
      providers.map((p) => [p.slug, p]),
    );

    const sharedModels = await db
      .insert(modelsTable)
      .values(
        payload.map(({ sharedSlug, ...input }) => ({
          ...input,
          slug: sharedSlug,
        })),
      )
      .onConflictDoUpdate({
        target: [modelsTable.slug],
        set: {
          architecture_inputModalities: jsonSetInsert(
            modelsTable.architecture_inputModalities,
            sql.raw(
              `excluded.${modelsTable.architecture_inputModalities.name}`,
            ),
          ),
          architecture_outputModalities: jsonSetInsert(
            modelsTable.architecture_outputModalities,
            sql.raw(
              `excluded.${modelsTable.architecture_outputModalities.name}`,
            ),
          ),
        },
      })
      .returning();
    const sharedBySlug = Object.fromEntries(
      sharedModels.map((m) => [m.slug, m]),
    );

    // Prepare insert values
    const values = payload.map(({ sharedSlug, ...input }) => {
      const provider = providerBySlug[input.providerSlug];
      if (!provider) {
        // Shouldn't happen due to prior validation, but keep a guard for type safety
        throw new HTTPException(404, {
          message: `Provider not found: ${input.providerSlug}`,
        });
      }
      const shared = sharedBySlug[sharedSlug];
      if (!shared) {
        // Shouldn't happen due to prior validation, but keep a guard for type safety
        throw new HTTPException(404, {
          message: `Shared model not found: ${sharedSlug}`,
        });
      }
      return {
        ...input,
        providerId: provider.id,
        modelId: shared.id,
        canonicalSlug: shared.slug,
      };
    });

    const inserted = await db
      .insert(providerModelsTable)
      .values(values)
      .onConflictDoUpdate({
        target: [providerModelsTable.providerId, providerModelsTable.slug],
        set: conflictUpdateSetAllExcluding(providerModelsTable, [
          'id',
          'createdAt',
          'updatedAt',
          'providerId',
          'modelId',
          'slug',
        ]),
      })
      .returning();
    if (!inserted || inserted.length === 0) {
      throw new HTTPException(500, { message: 'Failed to create models' });
    }

    return c.json({ data: inserted }, 201);
  })
  .get(
    '/:slug',
    validator('param', z.object({ slug: z.string() })),
    async (c) => {
      const { slug } = c.req.valid('param');
      const db = c.get('db');

      const [model] = await db
        .select()
        .from(modelsTable)
        .where(eq(modelsTable.slug, slug));
      if (!model) {
        throw new HTTPException(404, { message: 'Model not found' });
      }

      return c.json({ data: model }, 200);
    },
  )
  .put(
    '/:slug',
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
  )
  .delete(
    '/:slug',
    validator('param', z.object({ slug: z.string() })),
    async (c) => {
      const { slug } = c.req.valid('param');
      const db = c.get('db');

      const [deleted] = await db
        .delete(modelsTable)
        .where(eq(modelsTable.slug, slug))
        .returning();
      if (!deleted) {
        throw new HTTPException(404, { message: 'Model not found' });
      }

      return c.json({ data: deleted }, 200);
    },
  );
