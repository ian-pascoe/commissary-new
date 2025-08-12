import z from 'zod';

export const Pagination = z.object({
  offset: z
    .union([z.number().nonnegative(), z.string()])
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val)),
  limit: z
    .union([z.number().nonnegative(), z.string()])
    .default(10)
    .transform((val) => (typeof val === 'string' ? parseInt(val, 10) : val)),
});
export type PaginationType = z.infer<typeof Pagination>;
