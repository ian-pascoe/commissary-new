import { and, eq, getTableColumns } from 'drizzle-orm';
import { HTTPException } from 'hono/http-exception';
import * as z from 'zod';
import { validator } from '~/api/utils/validator';
import {
  CreateModel,
  CreatePrice,
  CreateProviderModel,
  type Model,
  Price,
  UpdateModel,
  UpdatePrice,
} from '~/core/schemas/database';
import { modelsTable, priceBookTable, providerModelsTable } from '~/drizzle/schema';
import { factory } from '../../utils/factory';

export const modelsRoute = factory
  .createApp()
  .get('/', async (c) => {
    const db = c.get('db');

    const models = await db
      .select({
        ...getTableColumns(modelsTable),
        ...getTableColumns(providerModelsTable),
      })
      .from(modelsTable)
      .innerJoin(providerModelsTable, eq(modelsTable.id, providerModelsTable.modelId));

    return c.json({ data: models });
  })
  .post(
    '/',
    validator(
      'json',
      z.object({
        ...CreateModel.shape,
        ...CreateProviderModel.shape,
        pricing: z.optional(z.array(Price)),
      }),
    ),
    async (c) => {
      const db = c.get('db');
      const { modelId, pricing, ...values } = c.req.valid('json');

      let model: Model;
      if (modelId) {
        const [existingModel] = await db
          .select()
          .from(modelsTable)
          .where(eq(modelsTable.id, modelId));
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
      const [providerModel] = await db
        .insert(providerModelsTable)
        .values({
          ...values,
          modelId: model.id,
        })
        .returning();
      if (!providerModel) {
        throw new HTTPException(500, { message: 'Failed to create provider model' });
      }

      const prices: Price[] = [];
      if (pricing && pricing.length > 0) {
        const [newPrice] = await db
          .insert(priceBookTable)
          .values(
            pricing.map((price) => ({
              ...price,
              providerModelId: providerModel.id,
            })),
          )
          .returning();
        if (!newPrice) {
          throw new HTTPException(500, { message: 'Failed to create pricing' });
        }

        prices.push(newPrice);
      }

      return c.json({ data: { ...model, pricing: prices } }, 201);
    },
  )
  .post(
    '/bulk',
    validator(
      'json',
      z.array(
        z.object({
          ...CreateModel.shape,
          ...CreateProviderModel.shape,
          pricing: z.optional(z.array(Price)),
        }),
      ),
    ),
    async (c) => {
      const db = c.get('db');
      const items = c.req.valid('json');

      const createdModels: (Model & { pricing: Price[] })[] = [];
      for (const { modelId, pricing, ...item } of items) {
        let model: Model;
        if (modelId) {
          const [existingModel] = await db
            .select()
            .from(modelsTable)
            .where(eq(modelsTable.id, modelId));
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

        const [providerModel] = await db
          .insert(providerModelsTable)
          .values({ ...item, modelId: model.id })
          .returning();
        if (!providerModel) {
          throw new HTTPException(500, { message: 'Failed to create provider model' });
        }

        const prices: Price[] = [];
        if (pricing && pricing.length > 0) {
          const [newPrice] = await db
            .insert(priceBookTable)
            .values(
              pricing.map((price) => ({
                ...price,
                providerModelId: providerModel.id,
              })),
            )
            .returning();
          if (!newPrice) {
            throw new HTTPException(500, { message: 'Failed to create pricing' });
          }

          pricing.push(newPrice);
        }

        createdModels.push({ ...model, pricing: prices });
      }

      return c.json({ data: createdModels }, 201);
    },
  )
  .get('/:id', validator('param', z.object({ id: z.string() })), async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');

    const [model] = await db.select().from(modelsTable).where(eq(modelsTable.id, id));
    if (!model) {
      throw new HTTPException(404, { message: 'Model not found' });
    }

    return c.json({ data: model });
  })
  .put(
    '/:id',
    validator('param', z.object({ id: z.string() })),
    validator('json', UpdateModel),
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
  })
  .get('/:id/prices', validator('param', z.object({ id: z.string() })), async (c) => {
    const db = c.get('db');
    const id = c.req.param('id');

    const prices = await db
      .select()
      .from(priceBookTable)
      .where(eq(priceBookTable.providerModelId, id));

    return c.json({ data: prices });
  })
  .post(
    '/:id/prices',
    validator('param', z.object({ id: z.string() })),
    validator('json', CreatePrice.omit({ providerModelId: true })),
    async (c) => {
      const db = c.get('db');
      const id = c.req.param('id');
      const values = c.req.valid('json');

      const prices = await db
        .insert(priceBookTable)
        .values({
          ...values,
          providerModelId: id,
        })
        .returning();

      return c.json({ data: prices }, 201);
    },
  )
  .get(
    '/:id/prices/:priceId',
    validator('param', z.object({ id: z.string(), priceId: z.string() })),
    async (c) => {
      const db = c.get('db');
      const { id, priceId } = c.req.valid('param');

      const [price] = await db
        .select()
        .from(priceBookTable)
        .where(and(eq(priceBookTable.providerModelId, id), eq(priceBookTable.id, priceId)));

      if (!price) {
        throw new HTTPException(404, { message: 'Price not found' });
      }

      return c.json({ data: price });
    },
  )
  .put(
    '/:id/prices/:priceId',
    validator('param', z.object({ id: z.string(), priceId: z.string() })),
    validator('json', UpdatePrice.omit({ providerModelId: true })),
    async (c) => {
      const db = c.get('db');
      const { id, priceId } = c.req.valid('param');
      const values = c.req.valid('json');

      const [price] = await db
        .update(priceBookTable)
        .set(values)
        .where(and(eq(priceBookTable.providerModelId, id), eq(priceBookTable.id, priceId)))
        .returning();

      if (!price) {
        throw new HTTPException(404, { message: 'Price not found' });
      }

      return c.json({ data: price });
    },
  )
  .delete(
    '/:id/prices/:priceId',
    validator('param', z.object({ id: z.string(), priceId: z.string() })),
    async (c) => {
      const db = c.get('db');
      const { id, priceId } = c.req.valid('param');

      const [price] = await db
        .update(priceBookTable)
        .set({ deletedAt: new Date() })
        .where(and(eq(priceBookTable.providerModelId, id), eq(priceBookTable.id, priceId)))
        .returning();
      if (!price) {
        throw new HTTPException(404, { message: 'Price not found' });
      }

      return c.json({ data: price });
    },
  );
