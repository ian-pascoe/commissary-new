import { type Column, getTableColumns, type SQL, sql } from 'drizzle-orm';
import {
  customType,
  integer,
  type SQLiteTable,
  type SQLiteUpdateSetSource,
  text,
} from 'drizzle-orm/sqlite-core';
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

export function conflictUpdateSet<TTable extends SQLiteTable>(
  table: TTable,
  columns: (keyof TTable['_']['columns'] & keyof TTable)[],
): SQLiteUpdateSetSource<TTable> {
  return Object.assign(
    {},
    ...columns.map((k) => ({
      [k]: sql.raw(`excluded.${(table[k] as Column).name}`),
    })),
  ) as SQLiteUpdateSetSource<TTable>;
}

export function conflictUpdateSetAllExcluding<
  T extends SQLiteTable,
  E extends (keyof T['$inferInsert'])[],
>(table: T, except: E) {
  const columns = getTableColumns(table);
  const updateColumns = Object.entries(columns).filter(
    ([col]) => !except.includes(col as keyof typeof table.$inferInsert),
  );

  return updateColumns.reduce(
    (acc, [colName, table]) => ({
      // biome-ignore lint/performance/noAccumulatingSpread: Fine here
      ...acc,
      [colName]: sql.raw(`excluded.${table.name}`),
    }),
    {},
  ) as Omit<Record<keyof typeof table.$inferInsert, SQL>, E[number]>;
}

export const jsonSetInsert = (target: SQL | Column, value: SQL | Column) => {
  return sql`(
    SELECT json_group_array(value)
    FROM (
      SELECT value FROM json_each(${target})
      UNION
      SELECT value FROM json_each(${value})
    )
  )`;
};
