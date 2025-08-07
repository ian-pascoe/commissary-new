import {
  index,
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/sqlite-core';
import type { Modality } from '../schemas/modality';
import { providerSdks } from '../schemas/provider-sdk';
import type { SupportedParameter } from '../schemas/supported-parameters';
import { baseModel } from './utils';

export const providersTable = sqliteTable(
  'providers',
  {
    ...baseModel('prv'),

    slug: text('slug').notNull(),
    name: text('name').notNull(),
    iconUrl: text('icon_url'),
    description: text('description'),

    sdk: text('sdk', { enum: providerSdks }),

    privacyPolicyUrl: text('privacy_policy_url'),
    termsOfServiceUrl: text('terms_of_service_url'),
    statusPageUrl: text('status_page_url'),

    mayLogPrompts: integer('may_log_prompts', { mode: 'boolean' }).default(
      false,
    ),
    mayTrainOnData: integer('may_train_on_data', { mode: 'boolean' }).default(
      false,
    ),
  },
  (t) => [
    uniqueIndex('providers_slug_idx').on(t.slug),
    index('providers_name_idx').on(t.name),
    index('providers_sdk_idx').on(t.sdk),
  ],
);

export const modelsTable = sqliteTable(
  'models',
  {
    ...baseModel('mdl'),

    slug: text('slug').notNull(),
    name: text('name'),
    description: text('description'),
    huggingFaceId: text('hugging_face_id'),

    // architecture
    inputModalities: text('input_modalities', { mode: 'json' })
      .notNull()
      .$type<Array<Modality>>(),
    outputModalities: text('output_modalities', { mode: 'json' })
      .notNull()
      .$type<Array<Modality>>(),
    contextLength: integer('context_length'),
    maxOutputTokens: integer('max_output_tokens'),
    supportedParameters: text('supported_parameters', { mode: 'json' }).$type<
      Array<SupportedParameter>
    >(),
  },
  (t) => [
    uniqueIndex('models_slug_idx').on(t.slug),
    index('models_name_idx').on(t.name),
    index('models_hugging_face_id_idx').on(t.huggingFaceId),
  ],
);

export const providerModelsTable = sqliteTable(
  'provider_models',
  {
    ...baseModel('pmd'),
    providerId: text('provider_id')
      .notNull()
      .references(() => providersTable.id),
    modelId: text('model_id')
      .notNull()
      .references(() => modelsTable.id),

    slug: text('slug').notNull(),

    // provider-specific architecture
    inputModalities: text('input_modalities', { mode: 'json' })
      .notNull()
      .$type<Array<Modality>>(),
    outputModalities: text('output_modalities', { mode: 'json' })
      .notNull()
      .$type<Array<Modality>>(),
    contextLength: integer('context_length'),
    maxOutputTokens: integer('max_output_tokens'),
    supportedParameters: text('supported_parameters', { mode: 'json' }).$type<
      Array<SupportedParameter>
    >(),

    // pricing
    inputPrice: integer('input_price'),
    outputPrice: integer('output_price'),
    imagePrice: integer('image_price'),
    requestPrice: integer('request_price'),
    webSearchPrice: integer('web_search_price'),
    internalReasoningPrice: integer('internal_reasoning_price'),
    inputCacheReadPrice: integer('input_cache_read_price'),
    inputCacheWritePrice: integer('input_cache_write_price'),
  },
  (t) => [
    index('provider_models_provider_id_idx').on(t.providerId),
    index('provider_models_model_id_idx').on(t.modelId),
    uniqueIndex('provider_models_provider_slug_idx').on(t.providerId, t.slug),
  ],
);
