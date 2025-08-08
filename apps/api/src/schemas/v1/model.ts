import * as z from 'zod';
import { Model, ProviderModel } from '~/core/schemas/model';

const databaseModelShape = {
  ...Model.shape,
  ...ProviderModel.shape,
};

const {
  slug,

  // architecture
  architecture_inputModalities,
  architecture_outputModalities,
  architecture_tokenizer,
  architecture_maxOutputTokens,
  architecture_contextLength,
  architecture_supportedParameters,

  // pricing
  pricing_input,
  pricing_output,
  pricing_image,
  pricing_request,
  pricing_webSearch,
  pricing_internalReasoning,
  pricing_inputCacheRead,
  pricing_inputCacheWrite,

  // stripped
  id: _id,
  modelId: _modelId,
  providerId: _providerId,

  ...modelShape
} = databaseModelShape;

export const ModelV1 = z.object({
  ...modelShape,
  slug,
  architecture: z.object({
    inputModalities: architecture_inputModalities,
    outputModalities: architecture_outputModalities,
    tokenizer: architecture_tokenizer,
    contextLength: architecture_contextLength,
    supportedParameters: architecture_supportedParameters,
  }),
  topProvider: z.object({
    slug: z.string(),
    modelSlug: slug,
    isModerated: z.boolean(),
    architecture: z.object({
      inputModalities: architecture_inputModalities,
      outputModalities: architecture_outputModalities,
      tokenizer: architecture_tokenizer,
      contextLength: architecture_contextLength,
      maxOutputTokens: architecture_maxOutputTokens,
      supportedParameters: architecture_supportedParameters,
    }),
    pricing: z.object({
      input: pricing_input,
      output: pricing_output,
      image: pricing_image,
      request: pricing_request,
      webSearch: pricing_webSearch,
      internalReasoning: pricing_internalReasoning,
      inputCacheRead: pricing_inputCacheRead,
      inputCacheWrite: pricing_inputCacheWrite,
    }),
  }),
});
export type ModelV1 = z.infer<typeof ModelV1>;
