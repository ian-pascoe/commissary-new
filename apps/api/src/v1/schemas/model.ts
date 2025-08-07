import * as z from 'zod';
import {
  Model as DatabaseModel,
  ProviderModel as DatabaseProviderModel,
} from '~/core/schemas/model';

const combinedDatabaseModelShape = {
  ...DatabaseModel.shape,
  ...DatabaseProviderModel.shape,
};

const {
  // architecture
  inputModalities,
  outputModalities,

  // pricing
  inputPrice,
  outputPrice,
  imagePrice,
  requestPrice,
  webSearchPrice,
  internalReasoningPrice,
  inputCacheReadPrice,
  inputCacheWritePrice,

  ...modelShape
} = combinedDatabaseModelShape;

export const Model = z.object({
  ...modelShape,
  architecture: z.object({
    inputModalities,
    outputModalities,
  }),
  pricing: z.object({
    input: inputPrice,
    output: outputPrice,
    image: imagePrice,
    request: requestPrice,
    webSearch: webSearchPrice,
    internalReasoning: internalReasoningPrice,
    inputCacheRead: inputCacheReadPrice,
    inputCacheWrite: inputCacheWritePrice,
  }),
});
export type Model = z.infer<typeof Model>;
