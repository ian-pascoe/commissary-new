import * as z from 'zod';

export const RoutingCondition = z.object({
  model: z.string().optional(),
  modelPattern: z.string().optional(),
  region: z.string().optional(),
  userTier: z.string().optional(),
  timeOfDay: z
    .object({
      start: z.string(),
      end: z.string(),
      timezone: z.string().optional(),
    })
    .optional(),
  requestSize: z
    .object({
      min: z.number().optional(),
      max: z.number().optional(),
    })
    .optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});
export type RoutingCondition = z.infer<typeof RoutingCondition>;
