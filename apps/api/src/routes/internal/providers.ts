import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as z from 'zod';
import { validator } from '~/api/utils/validator';
import { conflictUpdateAllExcept } from '~/core/database/utils';
import { CreateProvider } from '~/core/schemas/database';
import { providersTable } from '~/drizzle/schema';
import { factory } from '../../utils/factory';

export const providersRoute = factory
  .createApp()
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
  .put(
    '/:id',
    validator('param', z.object({ id: z.string() })),
    validator('json', CreateProvider),
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
  });
