import { boolean, integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '~/core/utils/id';

export const usersTable = pgTable('users', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId('user')),
  createdAt: timestamp('created_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .notNull(),

  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => !1)
    .notNull(),
  image: text('image'),
  role: text('role'),
  banned: boolean('banned'),
  banReason: text('ban_reason'),
  banExpires: timestamp('ban_expires', { withTimezone: true }),
  stripeCustomerId: text('stripe_customer_id'),
});

export const accountsTable = pgTable('accounts', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId('acc')),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),

  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
});

export const verificationsTable = pgTable('verifications', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId('ver')),
  createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(() => new Date()),
  updatedAt: timestamp('updated_at', { withTimezone: true }).$defaultFn(() => new Date()),

  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
});

export const organizationsTable = pgTable('organizations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId('org')),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),

  name: text('name').notNull(),
  slug: text('slug').unique(),
  logo: text('logo'),
  metadata: text('metadata'),
});

export const organizationMembersTable = pgTable('organization_members', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId('omem')),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizationsTable.id, { onDelete: 'cascade' }),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),

  role: text('role').default('member').notNull(),
});

export const organizationInvitationsTable = pgTable('organization_invitations', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId('oinv')),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizationsTable.id, { onDelete: 'cascade' }),
  email: text('email').notNull(),
  role: text('role'),
  teamId: text('team_id'),
  status: text('status').default('pending').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  inviterId: text('inviter_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
});

export const teamsTable = pgTable('teams', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId('team')),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
  organizationId: text('organization_id')
    .notNull()
    .references(() => organizationsTable.id, { onDelete: 'cascade' }),

  name: text('name').notNull(),
});

export const teamMembersTable = pgTable('team_members', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId('tmem')),
  teamId: text('team_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at'),
});

export const apiKeysTable = pgTable('api_keys', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId('api')),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => usersTable.id, { onDelete: 'cascade' }),

  name: text('name'),
  start: text('start'),
  prefix: text('prefix'),
  key: text('key').notNull(),
  refillInterval: integer('refill_interval'),
  refillAmount: integer('refill_amount'),
  lastRefillAt: timestamp('last_refill_at', { withTimezone: true }),
  enabled: boolean('enabled').default(true),
  rateLimitEnabled: boolean('rate_limit_enabled').default(true),
  rateLimitTimeWindow: integer('rate_limit_time_window').default(86400000),
  rateLimitMax: integer('rate_limit_max').default(10),
  requestCount: integer('request_count'),
  remaining: integer('remaining'),
  lastRequest: timestamp('last_request', { withTimezone: true }),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  permissions: text('permissions'),
  metadata: text('metadata'),
});
