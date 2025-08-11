import { Database } from 'bun:sqlite';
import { stripe } from '@better-auth/stripe';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, apiKey, bearer, organization } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/bun-sqlite';
import { Stripe } from 'stripe';
import * as authSchema from './drizzle/schema/auth';

const adminPlugin = admin();
const organizationPlugin = organization({
  teams: { enabled: true },
  schema: {
    organization: { modelName: 'organizationsTable' },
    member: { modelName: 'organizationMembersTable' },
    invitation: { modelName: 'invitationsTable' },
    team: { modelName: 'teamsTable' },
    teamMember: { modelName: 'teamMembersTable' },
  },
});
const apiKeyPlugin = apiKey({
  schema: {
    apikey: { modelName: 'apiKeysTable' },
  },
});
const bearerPlugin = bearer();

export const authPlugins = [
  adminPlugin,
  organizationPlugin,
  apiKeyPlugin,
  bearerPlugin,
];

const dummyStripePlugin = stripe({
  stripeClient: new Stripe('dummy'),
  stripeWebhookSecret: 'dummy',
  createCustomerOnSignUp: true,
});

export const authConfig = {
  appName: 'Commissary',
  session: { modelName: 'sessionsTable' },
  user: { modelName: 'usersTable' },
  account: { modelName: 'accountsTable' },
  verification: { modelName: 'verificationsTable' },
  advanced: {
    database: {
      generateId: false,
    },
  },
} satisfies BetterAuthOptions;

export const auth = betterAuth({
  ...authConfig,
  plugins: [...authPlugins, dummyStripePlugin],
  // dummy db and cache for schema generation, will be implemented in the API
  database: drizzleAdapter(drizzle(new Database()), {
    provider: 'pg',
    schema: {
      users: authSchema.usersTable,
      accounts: authSchema.accountsTable,
      verifications: authSchema.verificationsTable,
      organizations: authSchema.organizationsTable,
      organizationMembers: authSchema.organizationMembersTable,
      invitations: authSchema.invitationsTable,
      teams: authSchema.teamsTable,
      teamMembers: authSchema.teamMembersTable,
      apiKeys: authSchema.apiKeysTable,
    },
  }),
  secondaryStorage: {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  },
});
