import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'sqlite',
  out: './drizzle',
  schema: './packages/core/src/database/schema.ts',
});
