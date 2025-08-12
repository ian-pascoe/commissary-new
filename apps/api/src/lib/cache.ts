import type { Context } from 'hono';
import type { Env } from '../types/hono';
import { c } from '../utils/context';
import { env } from '../utils/env';

export const initKv = (c: Context<Env>) => {
  return env(c).KV;
};
export type Kv = ReturnType<typeof initKv>;

export const kv = (ctx: Context<Env> = c()) => ctx.get('kv');
