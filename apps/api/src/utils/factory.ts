import { contextStorage } from 'hono/context-storage';
import { createFactory } from 'hono/factory';
import { initDatabase } from '../lib/database';
import type { Env } from '../types/hono';

export const factory = createFactory<Env>({
  initApp: (app) =>
    app.use(contextStorage()).use((c, next) => {
      c.set('db', initDatabase(c));
      return next();
    }),
});
