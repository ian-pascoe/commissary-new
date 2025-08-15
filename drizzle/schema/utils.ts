import { text, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '~/core/utils/id';

export const baseModel = (prefix: string) => ({
  id: text('id')
    .primaryKey()
    .$defaultFn(() => createId(prefix)),
  createdAt: timestamp('created_at', { withTimezone: true }).$defaultFn(
    () => new Date(),
  ),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .$defaultFn(() => new Date())
    .$onUpdateFn(() => new Date()),
  deletedAt: timestamp('deleted_at', { withTimezone: true }), // use soft deletes for rollbacks
});
