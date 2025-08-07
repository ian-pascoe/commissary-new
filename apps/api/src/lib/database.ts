import { drizzle } from 'drizzle-orm/d1';
import type { Context } from 'hono';
import * as schema from '~/core/database/schema';
import type { Env } from '../types/hono';
import { c } from '../utils/context';
import { env } from '../utils/env';

export const initDatabase = (ctx: Context<Env>) => {
  return drizzle(env(ctx).DB, { schema });
};

export const db = (ctx: Context<Env> = c()) => ctx.get('db');
