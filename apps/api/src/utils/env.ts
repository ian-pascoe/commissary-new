import type { Context } from 'hono';
import { env as honoEnvAdapter } from 'hono/adapter';
import type { Env } from '../types/hono';
import { c } from './context';

export const env = (ctx: Context<Env> = c()) => honoEnvAdapter(ctx);
