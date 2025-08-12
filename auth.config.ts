import { stripe } from '@better-auth/stripe';
import { type BetterAuthOptions, betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { admin, apiKey, bearer, type OrganizationOptions, organization } from 'better-auth/plugins';
import { Stripe } from 'stripe';
import * as authSchema from './drizzle/schema/auth';

export const organizationPluginConfig = {
  teams: { enabled: true },
  schema: {
    organization: { modelName: 'organizationsTable' },
    member: { modelName: 'organizationMembersTable' },
    invitation: { modelName: 'organizationInvitationsTable' },
    team: { modelName: 'teamsTable' },
    teamMember: { modelName: 'teamMembersTable' },
  },
} satisfies OrganizationOptions;

export const apiKeyPluginConfig = {
  schema: {
    apikey: { modelName: 'apiKeysTable' },
  },
} satisfies Parameters<typeof apiKey>[0];

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
  plugins: [
    admin(),
    organization(organizationPluginConfig),
    apiKey(apiKeyPluginConfig),
    bearer(),
    stripe({
      stripeClient: new Stripe('dummy'),
      stripeWebhookSecret: 'dummy',
      createCustomerOnSignUp: true,
    }),
  ],
  // dummy db and cache for schema generation, will be implemented in the API
  database: drizzleAdapter({} as any, {
    provider: 'pg',
    schema: {
      user: authSchema.usersTable,
      account: authSchema.accountsTable,
      verification: authSchema.verificationsTable,
      organization: authSchema.organizationsTable,
      member: authSchema.organizationMembersTable,
      invitation: authSchema.organizationInvitationsTable,
      team: authSchema.teamsTable,
      teamMember: authSchema.teamMembersTable,
      apiKey: authSchema.apiKeysTable,
    },
  }),
  secondaryStorage: {
    get: () => Promise.resolve(null),
    set: () => Promise.resolve(),
    delete: () => Promise.resolve(),
  },
});
