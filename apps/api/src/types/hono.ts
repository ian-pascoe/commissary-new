import type Stripe from 'stripe';
import type { Auth } from '../lib/auth';
import type { Kv } from '../lib/cache';
import type { RequestContext, RequestContextWithModel } from '../lib/context';
import type { Database } from '../lib/database';
import type { WorkerEnv } from './cloudflare';

export type Bindings = WorkerEnv;

export type Variables = {
  db: Database;
  kv: Kv;
  stripe: Stripe;
  auth: Auth;
  requestContext?: RequestContext;
  requestContextWithModel?: RequestContextWithModel;
};

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};

declare module 'hono' {
  interface ContextVariableMap extends Variables {}
}
