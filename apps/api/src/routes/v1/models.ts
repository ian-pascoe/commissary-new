import { eq } from 'drizzle-orm';
import { describeRoute } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import * as z from 'zod';
import { factory } from '~/api/utils/factory';
import {
  modelsTable,
  providerModelsTable,
  providersTable,
} from '~/core/database/schema';
import { ModelV1 } from '../../schemas/v1/model';
import { v1DefaultResponses } from '../../utils/v1/default-responses';

export const v1ModelsRoute = factory.createApp().get(
  '/',
  describeRoute({
    description: 'List available models',
    responses: {
      200: {
        description: 'A list of models',
        content: {
          'application/json': {
            schema: resolver(z.object({ data: z.array(ModelV1) })),
          },
        },
      },
      ...v1DefaultResponses,
    },
  }),
  async (c) => {
    const db = c.get('db');

    const rawModelsData = await db
      .select()
      .from(modelsTable)
      .innerJoin(
        providerModelsTable,
        eq(providerModelsTable.modelId, modelsTable.id),
      )
      .innerJoin(
        providersTable,
        eq(providersTable.id, providerModelsTable.providerId),
      )
      .groupBy(modelsTable.slug);

    // Transform the raw model data into API format
    const models = rawModelsData.map(
      ({
        models: {
          // architecture
          architecture_inputModalities: inputModalities,
          architecture_outputModalities: outputModalities,
          architecture_tokenizer: tokenizer,
          architecture_contextLength: contextLength,
          architecture_supportedParameters: supportedParameters,

          // stripped
          id: _id,

          ...model
        },
        provider_models: {
          slug: pModelSlug,

          // provider-specific architecture
          architecture_inputModalities: pInputModalities,
          architecture_outputModalities: pOutputModalities,
          architecture_tokenizer: pTokenizer,
          architecture_contextLength: pContextLength,
          architecture_maxOutputTokens: maxOutputTokens,
          architecture_supportedParameters: pSupportedParameters,

          // pricing
          pricing_input: inputPrice,
          pricing_output: outputPrice,
          pricing_image: imagePrice,
          pricing_request: requestPrice,
          pricing_internalReasoning: internalReasoningPrice,
          pricing_webSearch: webSearchPrice,
          pricing_inputCacheRead: inputCacheReadPrice,
          pricing_inputCacheWrite: inputCacheWritePrice,
        },
        providers: { slug: providerSlug, isModerated },
      }): ModelV1 => ({
        ...model,
        architecture: {
          inputModalities: inputModalities,
          outputModalities: outputModalities,
          tokenizer: tokenizer,
          contextLength: contextLength,
          supportedParameters,
        },
        topProvider: {
          slug: providerSlug,
          modelSlug: pModelSlug,
          architecture: {
            inputModalities: pInputModalities,
            outputModalities: pOutputModalities,
            tokenizer: pTokenizer,
            contextLength: pContextLength,
            maxOutputTokens,
            supportedParameters: pSupportedParameters,
          },
          pricing: {
            input: inputPrice,
            output: outputPrice,
            image: imagePrice,
            request: requestPrice,
            internalReasoning: internalReasoningPrice,
            webSearch: webSearchPrice,
            inputCacheRead: inputCacheReadPrice,
            inputCacheWrite: inputCacheWritePrice,
          },
          isModerated,
        },
      }),
    );

    return c.json({ data: models satisfies Array<ModelV1> }, 200);
  },
);
