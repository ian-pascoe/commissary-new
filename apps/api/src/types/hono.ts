import type { initDatabase } from '../lib/database';
import type { WorkerEnv } from './cloudflare';

export type Bindings = WorkerEnv;

export type Variables = {
  db: ReturnType<typeof initDatabase>;
};

export type Env = {
  Bindings: Bindings;
  Variables: Variables;
};

declare module 'hono' {
  interface ContextVariableMap extends Variables {}
}
