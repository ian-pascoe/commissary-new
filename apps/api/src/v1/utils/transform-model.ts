import type {
  Model as DatabaseModel,
  ProviderModel as ProviderDatabaseModel,
} from '~/core/schemas/model';
import type { Model } from '../schemas/model';

export const transformModel = (
  model: DatabaseModel & ProviderDatabaseModel,
): Model => {
  const {
    inputPrice,
    outputPrice,
    imagePrice,
    requestPrice,
    webSearchPrice,
    inputCacheReadPrice,
    inputCacheWritePrice,
    internalReasoningPrice,
    inputModalities,
    outputModalities,
    ...rest
  } = model;
  return {
    ...rest,
    pricing: {
      input: inputPrice,
      output: outputPrice,
      image: imagePrice,
      request: requestPrice,
      webSearch: webSearchPrice,
      inputCacheRead: inputCacheReadPrice,
      inputCacheWrite: inputCacheWritePrice,
      internalReasoning: internalReasoningPrice,
    },
    architecture: {
      inputModalities,
      outputModalities,
    },
  };
};
