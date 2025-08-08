import { and, eq, getTableColumns, sql } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import { describeRoute } from 'hono-openapi';
import * as z from 'zod';
import { BulkCreateProviders } from '~/api/schemas/internal/bulk-create';
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
import { CreateProviderModel, UpdateProviderModel } from '~/core/schemas/model';
import { CreateProvider, UpdateProvider } from '~/core/schemas/provider';

export const internalProvidersRoute = factory
  .createApp()
  .use('/*', describeRoute({ hide: true }))
  .get('/bulk-create.schema.json', (c) => {
    return c.json(
      z.toJSONSchema(
        z.object({
          $schema: z.string(),
          data: z.array(CreateProvider).check(z.minLength(1)),
        }),
      ),
    );
  })
  .get('/', async (c) => {
    const db = c.get('db');

    const providers = await db.select().from(providersTable);

    return c.json({ data: providers }, 200);
  })
  .post('/', validator('json', CreateProvider), async (c) => {
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
  })
  .post('/bulk', validator('json', BulkCreateProviders), async (c) => {
    const { data } = c.req.valid('json');
    const db = c.get('db');

    const providers = await db
      .insert(providersTable)
      .values(data)
      .onConflictDoUpdate({
        target: [providersTable.slug],
        set: conflictUpdateSetAllExcluding(providersTable, [
          'id',
          'createdAt',
          'updatedAt',
          'slug',
        ]),
      })
      .returning();
    if (!providers || providers.length === 0) {
      throw new HTTPException(500, { message: 'Failed to create providers' });
    }

    return c.json({ data: providers }, 201);
  })
  .get(
    '/:slug',
    validator('param', z.object({ slug: z.string() })),
    async (c) => {
      const { slug } = c.req.valid('param');
      const db = c.get('db');

      const [provider] = await db
        .select()
        .from(providersTable)
        .where(eq(providersTable.slug, slug));
      if (!provider) {
        throw new HTTPException(404, { message: 'Provider not found' });
      }

      return c.json({ data: provider }, 200);
    },
  )
  .put(
    '/:slug',
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
  )
  .delete(
    '/:slug',
    validator('param', z.object({ slug: z.string() })),
    async (c) => {
      const { slug } = c.req.valid('param');
      const db = c.get('db');

      const [deleted] = await db
        .delete(providersTable)
        .where(eq(providersTable.slug, slug))
        .returning();
      if (!deleted) {
        throw new HTTPException(404, { message: 'Provider not found' });
      }

      return c.json({ data: deleted }, 200);
    },
  )
  .get(
    '/:slug/models',
    validator('param', z.object({ slug: z.string() })),
    async (c) => {
      const { slug } = c.req.valid('param');
      const db = c.get('db');

      const models = await db
        .select({
          ...getTableColumns(providerModelsTable),
        })
        .from(providerModelsTable)
        .innerJoin(
          providersTable,
          eq(providersTable.id, providerModelsTable.providerId),
        )
        .where(eq(providersTable.slug, slug));

      return c.json({ data: models }, 200);
    },
  )
  .post(
    '/:slug/models',
    validator('param', z.object({ slug: z.string() })),
    validator(
      'json',
      CreateProviderModel.extend({
        sharedSlug: z.string(),
      }),
    ),
    async (c) => {
      const { slug } = c.req.valid('param');
      const { sharedSlug, ...input } = c.req.valid('json');
      const db = c.get('db');

      const [provider] = await db
        .select()
        .from(providersTable)
        .where(eq(providersTable.slug, slug));
      if (!provider) {
        throw new HTTPException(404, { message: 'Provider not found' });
      }

      const [sharedModel] = await db
        .insert(modelsTable)
        .values({
          ...input,
          slug: sharedSlug,
        })
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

      if (!sharedModel) {
        throw new HTTPException(404, { message: 'Shared model not found' });
      }

      const [newModel] = await db
        .insert(providerModelsTable)
        .values({
          ...input,
          providerId: provider.id,
          modelId: sharedModel.id,
        })
        .returning();
      if (!newModel) {
        throw new HTTPException(500, { message: 'Failed to create model' });
      }

      return c.json({ data: newModel }, 201);
    },
  )
  .get(
    '/:slug/models/:modelSlug',
    validator('param', z.object({ slug: z.string(), modelSlug: z.string() })),
    async (c) => {
      const { slug, modelSlug } = c.req.valid('param');
      const db = c.get('db');

      const [model] = await db
        .select({
          ...getTableColumns(providerModelsTable),
        })
        .from(providerModelsTable)
        .innerJoin(
          providersTable,
          eq(providersTable.id, providerModelsTable.providerId),
        )
        .where(
          and(
            eq(providersTable.slug, slug),
            eq(providerModelsTable.slug, modelSlug),
          ),
        );

      if (!model) {
        throw new HTTPException(404, { message: 'Model not found' });
      }

      return c.json({ data: model }, 200);
    },
  )
  .put(
    '/:slug/models/:modelSlug',
    validator('param', z.object({ slug: z.string(), modelSlug: z.string() })),
    validator('json', UpdateProviderModel),
    async (c) => {
      const { slug, modelSlug } = c.req.valid('param');
      const input = c.req.valid('json');
      const db = c.get('db');

      const [provider] = await db
        .select()
        .from(providersTable)
        .where(eq(providersTable.slug, slug));
      if (!provider) {
        throw new HTTPException(404, { message: 'Provider not found' });
      }

      const [model] = await db
        .select()
        .from(providerModelsTable)
        .where(
          and(
            eq(providerModelsTable.providerId, provider.id),
            eq(providerModelsTable.slug, modelSlug),
          ),
        );
      if (!model) {
        throw new HTTPException(404, { message: 'Model not found' });
      }

      const [updated] = await db
        .update(providerModelsTable)
        .set(input)
        .where(eq(providerModelsTable.id, model.id))
        .returning();
      if (!updated) {
        throw new HTTPException(500, { message: 'Failed to update model' });
      }

      return c.json({ data: updated }, 200);
    },
  )
  .delete(
    '/:slug/models/:modelSlug',
    validator('param', z.object({ slug: z.string(), modelSlug: z.string() })),
    async (c) => {
      const { slug, modelSlug } = c.req.valid('param');
      const db = c.get('db');

      const [provider] = await db
        .select()
        .from(providersTable)
        .where(eq(providersTable.slug, slug));
      if (!provider) {
        throw new HTTPException(404, { message: 'Provider not found' });
      }

      const [deleted] = await db
        .delete(providerModelsTable)
        .where(
          and(
            eq(providerModelsTable.providerId, provider.id),
            eq(providerModelsTable.slug, modelSlug),
          ),
        )
        .returning();
      if (!deleted) {
        throw new HTTPException(404, { message: 'Model not found' });
      }

      return c.json({ data: deleted }, 200);
    },
  );
