import type { ValidationTargets } from 'hono';
import { validator as defaultValidator } from 'hono-openapi/zod';
import * as z from 'zod';

export function validator<
  Schema extends z.ZodSchema,
  Target extends keyof ValidationTargets,
>(target: Target, schema: Schema) {
  return defaultValidator(target, schema, (result, c) => {
    if (!result.success) {
      return c.json({ message: z.prettifyError(result.error) }, 400);
    }
  });
}
