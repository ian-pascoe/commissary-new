import { customType, integer, text } from 'drizzle-orm/sqlite-core';
import SuperJSON from 'superjson';
import { createId } from '~/core/utils/id';

type JsonCustomTypeData<TData> = {
  data: TData;
  driverData: string;
};
export const complexJson = <TData = unknown>(
  ...args: Parameters<ReturnType<typeof customType<JsonCustomTypeData<TData>>>>
) =>
  customType<JsonCustomTypeData<TData>>({
    dataType: () => 'text',
    fromDriver: (value) => SuperJSON.parse(value),
    toDriver: (value) => SuperJSON.stringify(value),
  })(...args);

export const baseModel = (prefix?: string) => ({
  id: text('id')
    .primaryKey()
    .notNull()
    .$default(() => createId(prefix)),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .$default(() => new Date()),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .$default(() => new Date())
    .$onUpdate(() => new Date()),
});
