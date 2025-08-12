import { drizzle } from 'drizzle-orm/postgres-js';
import type { Context } from 'hono';
import postgres from 'postgres';
import * as schema from '~/drizzle/schema';
import type { Env } from '../types/hono';
import { c } from '../utils/context';
import { env } from '../utils/env';

export const initDatabase = (ctx: Context<Env>) => {
  const sql = postgres(env(ctx).DATABASE.connectionString, {
    max: 5,
    fetch_types: false,
  });
  return drizzle(sql, {
    schema,
  });
};
export type Database = ReturnType<typeof initDatabase>;

export const db = (ctx: Context<Env> = c()) => ctx.get('db');
