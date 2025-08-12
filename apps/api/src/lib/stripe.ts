import type { Context } from 'hono';
import Stripe from 'stripe';
import type { Env } from '../types/hono';
import { c } from '../utils/context';
import { env } from '../utils/env';

export const initStripe = (c: Context<Env>) => {
  return new Stripe(env(c).STRIPE_SECRET_KEY);
};

export const stripe = (ctx: Context<Env> = c()) => ctx.get('stripe');
