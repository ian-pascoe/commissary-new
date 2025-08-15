import * as z from 'zod';

export const Modality = z.enum([
  'text',
  'image',
  'video',
  'audio',
  'file',
  'embedding',
]);
export type Modality = z.infer<typeof Modality>;
