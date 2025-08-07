import * as z from 'zod';

export const Modality = z.enum(['text', 'image', 'file', 'audio']);
export type Modality = z.infer<typeof Modality>;
