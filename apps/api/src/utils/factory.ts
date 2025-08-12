import { contextStorage } from 'hono/context-storage';
import { createFactory } from 'hono/factory';
import { initAuth } from '../lib/auth';
import { initKv } from '../lib/cache';
import { initDatabase } from '../lib/database';
import { initStripe } from '../lib/stripe';
import type { Env } from '../types/hono';

export const factory = createFactory<Env>({
  initApp: (app) =>
    app.use(contextStorage()).use((c, next) => {
      c.set('db', initDatabase(c));
      c.set('kv', initKv(c));
      c.set('stripe', initStripe(c));
      c.set('auth', initAuth(c));
      return next();
    }),
});
