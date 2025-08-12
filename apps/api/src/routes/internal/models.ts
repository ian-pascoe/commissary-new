import { eq } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as z from 'zod';
import { validator } from '~/api/utils/validator';
import { CreateModel, CreateProviderModel, type Model } from '~/core/schemas/database';
import { modelsTable, providerModelsTable } from '~/drizzle/schema';
import { factory } from '../../utils/factory';

export const modelsRoute = factory
  .createApp()
  .post('/', validator('json', CreateProviderModel.and(CreateModel)), async (c) => {
    const db = c.get('db');
    const values = c.req.valid('json');

    let model: Model;
    if (values.modelId) {
      const [existingModel] = await db
        .select()
        .from(modelsTable)
        .where(eq(modelsTable.id, values.modelId));
      if (!existingModel) {
        throw new HTTPException(404, { message: 'Model not found' });
      }
      model = existingModel;
    } else {
      const [newModel] = await db.insert(modelsTable).values(values).returning();
      if (!newModel) {
        throw new HTTPException(500, { message: 'Failed to create model' });
      }
      model = newModel;
    }
    const providerModel = await db
      .insert(providerModelsTable)
      .values({
        ...values,
        modelId: model.id,
      })
      .returning();
    if (!providerModel) {
      throw new HTTPException(500, { message: 'Failed to create provider model' });
    }

    return c.json({ data: model }, 201);
  })
  .post('/bulk', validator('json', z.array(CreateProviderModel.and(CreateModel))), async (c) => {
    const db = c.get('db');
    const items = c.req.valid('json');

    const createdModels: Model[] = [];
    for (const item of items) {
      let model: Model;
      if (item.modelId) {
        const [existingModel] = await db
          .select()
          .from(modelsTable)
          .where(eq(modelsTable.id, item.modelId));
        if (!existingModel) {
          throw new HTTPException(404, { message: 'Model not found' });
        }
        model = existingModel;
      } else {
        const [newModel] = await db.insert(modelsTable).values(item).returning();
        if (!newModel) {
          throw new HTTPException(500, { message: 'Failed to create model' });
        }
        model = newModel;
      }

      const providerModel = await db
        .insert(providerModelsTable)
        .values({ ...item, modelId: model.id })
        .returning();
      if (!providerModel) {
        throw new HTTPException(500, { message: 'Failed to create provider model' });
      }

      createdModels.push(model);
    }

    return c.json({ data: createdModels }, 201);
  })
  .put(
    '/:id',
    validator('param', z.object({ id: z.string() })),
    validator('json', CreateModel),
    async (c) => {
      const db = c.get('db');
      const values = c.req.valid('json');
      const id = c.req.param('id');

      const [model] = await db
        .update(modelsTable)
        .set(values)
        .where(eq(modelsTable.id, id))
        .returning();
      if (!model) {
        throw new HTTPException(404, { message: 'Model not found' });
      }

      return c.json({ data: model });
    },
  )
  .delete('/:id', validator('param', z.object({ id: z.string() })), async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');

    const [model] = await db
      .update(modelsTable)
      .set({ deletedAt: new Date() })
      .where(eq(modelsTable.id, id))
      .returning({ id: modelsTable.id });
    if (!model) {
      throw new HTTPException(404, { message: 'Model not found' });
    }

    return c.json({ data: model.id });
  });
