import { and, eq, getTableColumns } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as z from 'zod';
import { validator } from '~/api/utils/validator';
import { conflictUpdateAllExcept } from '~/core/database/utils';
import {
  CreateProvider,
  CreateProviderCredential,
  UpdateProvider,
  UpdateProviderCredential,
} from '~/core/schemas/database';
import { providerCredentialsTable, providerModelsTable, providersTable } from '~/drizzle/schema';
import { factory } from '../../utils/factory';

export const providersRoute = factory
  .createApp()
  .get('/', async (c) => {
    const db = c.get('db');

    const providers = await db.select().from(providersTable);

    return c.json({ data: providers });
  })
  .post('/', validator('json', CreateProvider), async (c) => {
    const db = c.get('db');
    const values = c.req.valid('json');

    const [provider] = await db.insert(providersTable).values(values).returning();
    if (!provider) {
      throw new HTTPException(500, { message: 'Failed to create provider' });
    }

    return c.json({ data: provider }, 201);
  })
  .post('/bulk', validator('json', z.array(CreateProvider)), async (c) => {
    const db = c.get('db');
    const values = c.req.valid('json');

    const providers = await db
      .insert(providersTable)
      .values(values)
      .onConflictDoUpdate({
        target: [providersTable.slug],
        set: conflictUpdateAllExcept(providersTable, ['slug']),
      })
      .returning();
    if (!providers || providers.length === 0) {
      throw new HTTPException(500, { message: 'Failed to create providers' });
    }

    return c.json({ data: providers }, 201);
  })
  .get('/:id', validator('param', z.object({ id: z.string() })), async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');

    const [provider] = await db.select().from(providersTable).where(eq(providersTable.id, id));
    if (!provider) {
      throw new HTTPException(404, { message: 'Provider not found' });
    }

    return c.json({ data: provider });
  })
  .put(
    '/:id',
    validator('param', z.object({ id: z.string() })),
    validator('json', UpdateProvider),
    async (c) => {
      const db = c.get('db');
      const values = c.req.valid('json');
      const id = c.req.param('id');

      const [provider] = await db
        .update(providersTable)
        .set(values)
        .where(eq(providersTable.id, id))
        .returning();
      if (!provider) {
        throw new HTTPException(404, { message: 'Provider not found' });
      }

      return c.json({ data: provider });
    },
  )
  .delete('/:id', validator('param', z.object({ id: z.string() })), async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');

    const [provider] = await db
      .update(providersTable)
      .set({ deletedAt: new Date() })
      .where(eq(providersTable.id, id))
      .returning({ id: providersTable.id });
    if (!provider) {
      throw new HTTPException(404, { message: 'Provider not found' });
    }

    return c.json({ data: provider.id });
  })
  .get('/:id/models', validator('param', z.object({ id: z.string() })), async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');

    const models = await db
      .select()
      .from(providerModelsTable)
      .where(eq(providerModelsTable.providerId, id));

    return c.json({ data: models });
  })
  .get('/:id/credentials', validator('param', z.object({ id: z.string() })), async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');

    const { value: _, ...rest } = getTableColumns(providerCredentialsTable);
    const credentials = await db
      .select(rest)
      .from(providerCredentialsTable)
      .where(eq(providerCredentialsTable.providerId, id));
    return c.json({ data: credentials });
  })
  .post(
    '/:id/credentials',
    validator('json', CreateProviderCredential.omit({ providerId: true })),
    async (c) => {
      const db = c.get('db');
      const id = c.req.param('id');
      const values = c.req.valid('json');

      const [credential] = await db
        .insert(providerCredentialsTable)
        .values({ ...values, providerId: id })
        .returning();
      if (!credential) {
        throw new HTTPException(500, { message: 'Failed to create credential' });
      }

      return c.json({ data: credential }, 201);
    },
  )
  .put(
    '/:id/credentials/:credentialId',
    validator('param', z.object({ id: z.string(), credentialId: z.string() })),
    validator('json', UpdateProviderCredential.omit({ providerId: true })),
    async (c) => {
      const db = c.get('db');
      const { id, credentialId } = c.req.valid('param');
      const values = c.req.valid('json');

      const [credential] = await db
        .update(providerCredentialsTable)
        .set(values)
        .where(
          and(
            eq(providerCredentialsTable.providerId, id),
            eq(providerCredentialsTable.id, credentialId),
          ),
        )
        .returning();
      if (!credential) {
        throw new HTTPException(404, { message: 'Credential not found' });
      }

      return c.json({ data: credential });
    },
  )
  .delete(
    '/:id/credentials/:credentialId',
    validator('param', z.object({ id: z.string(), credentialId: z.string() })),
    async (c) => {
      const db = c.get('db');
      const { id, credentialId } = c.req.valid('param');

      const [credential] = await db
        .update(providerCredentialsTable)
        .set({ deletedAt: new Date() })
        .where(
          and(
            eq(providerCredentialsTable.providerId, id),
            eq(providerCredentialsTable.id, credentialId),
          ),
        )
        .returning();
      if (!credential) {
        throw new HTTPException(404, { message: 'Credential not found' });
      }

      return c.json({ data: credential });
    },
  );
