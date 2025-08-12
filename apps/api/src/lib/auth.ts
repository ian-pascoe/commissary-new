import { stripe as stripePlugin } from '@better-auth/stripe';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, apiKey, bearer, organization } from 'better-auth/plugins';
import type { Context } from 'hono';
import { apiKeyPluginConfig, authConfig, organizationPluginConfig } from '~/auth.config';
import type { Env } from '../types/hono';
import { c } from '../utils/context';
import { env } from '../utils/env';
import { kv } from './cache';
import { db } from './database';
import { stripe } from './stripe';

export const initAuth = (c: Context<Env>) => {
  return betterAuth({
    ...authConfig,
    baseURL: `${env(c).API_URL}/auth`,
    plugins: [
      admin(),
      organization(organizationPluginConfig),
      apiKey(apiKeyPluginConfig),
      bearer(),
      stripePlugin({
        stripeClient: stripe(c),
        stripeWebhookSecret: env(c).STRIPE_WEBHOOK_SECRET,
        createCustomerOnSignUp: true,
      }),
    ],
    database: drizzleAdapter(db(c), {
      provider: 'pg',
    }),
    secondaryStorage: {
      get: (key) => kv(c).get(`auth:${key}`),
      set: (key, value) => kv(c).put(`auth:${key}`, value),
      delete: (key) => kv(c).delete(`auth:${key}`),
    },
  });
};
export type Auth = ReturnType<typeof initAuth>;

export const auth = (ctx: Context<Env> = c()) => ctx.get('auth');
