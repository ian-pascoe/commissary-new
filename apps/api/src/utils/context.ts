import { getContext } from 'hono/context-storage';
import type { Env } from '../types/hono';

export const c = () => getContext<Env>();
