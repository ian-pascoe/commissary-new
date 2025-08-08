import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  out: './migrations',
  schema: './packages/core/src/database/schema.ts',
});
