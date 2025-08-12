import * as z from 'zod';

export const Metadata = z.record(z.string(), z.json());
export type Metadata = z.infer<typeof Metadata>;
