import * as z from 'zod';

// OpenAI-compatible chat completion schemas
export const ChatMessage = z.object({
  role: z.enum(['system', 'user', 'assistant', 'tool', 'function', 'developer']),
  content: z.union([z.string(), z.array(z.any())]).optional(),
  name: z.string().optional(),
  tool_calls: z
    .array(
      z.object({
        id: z.string(),
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
          arguments: z.string(),
        }),
      }),
    )
    .optional(),
  tool_call_id: z.string().optional(),
  function_call: z
    .object({
      name: z.string(),
      arguments: z.string(),
    })
    .optional(),
});
export type ChatMessage = z.infer<typeof ChatMessage>;

export const ChatCompletionRequest = z.object({
  model: z.string(),
  messages: z.array(ChatMessage),
  max_tokens: z.number().optional(),
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  n: z.number().min(1).max(128).default(1),
  stream: z.boolean().default(false),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  presence_penalty: z.number().min(-2).max(2).default(0),
  frequency_penalty: z.number().min(-2).max(2).default(0),
  logit_bias: z.record(z.string(), z.number()).optional(),
  user: z.string().optional(),
  response_format: z
    .object({
      type: z.enum(['text', 'json_object']).default('text'),
    })
    .optional(),
  seed: z.number().optional(),
  tools: z
    .array(
      z.object({
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
          description: z.string().optional(),
          parameters: z.record(z.string(), z.any()).optional(),
        }),
      }),
    )
    .optional(),
  tool_choice: z
    .union([
      z.enum(['none', 'auto']),
      z.object({
        type: z.literal('function'),
        function: z.object({
          name: z.string(),
        }),
      }),
    ])
    .optional(),
  function_call: z
    .union([
      z.enum(['none', 'auto']),
      z.object({
        name: z.string(),
      }),
    ])
    .optional(),
  functions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.string(), z.any()).optional(),
      }),
    )
    .optional(),
});
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequest>;

export const ChatCompletionChoice = z.object({
  index: z.number(),
  message: z.object({
    role: z.enum(['assistant']),
    content: z.string().nullable(),
    tool_calls: z
      .array(
        z.object({
          id: z.string(),
          type: z.literal('function'),
          function: z.object({
            name: z.string(),
            arguments: z.string(),
          }),
        }),
      )
      .optional(),
    function_call: z
      .object({
        name: z.string(),
        arguments: z.string(),
      })
      .optional(),
  }),
  finish_reason: z
    .enum(['stop', 'length', 'tool_calls', 'content_filter', 'function_call'])
    .nullable(),
  logprobs: z
    .object({
      content: z
        .array(
          z.object({
            token: z.string(),
            logprob: z.number(),
            bytes: z.array(z.number()).nullable(),
            top_logprobs: z.array(
              z.object({
                token: z.string(),
                logprob: z.number(),
                bytes: z.array(z.number()).nullable(),
              }),
            ),
          }),
        )
        .nullable(),
    })
    .nullable()
    .optional(),
});
export type ChatCompletionChoice = z.infer<typeof ChatCompletionChoice>;

export const ChatCompletionUsage = z.object({
  prompt_tokens: z.number(),
  completion_tokens: z.number(),
  total_tokens: z.number(),
  prompt_tokens_details: z
    .object({
      cached_tokens: z.number().optional(),
    })
    .optional(),
  completion_tokens_details: z
    .object({
      reasoning_tokens: z.number().optional(),
    })
    .optional(),
});
export type ChatCompletionUsage = z.infer<typeof ChatCompletionUsage>;

export const ChatCompletionResponse = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  choices: z.array(ChatCompletionChoice),
  usage: ChatCompletionUsage.optional(),
  system_fingerprint: z.string().optional(),
});
export type ChatCompletionResponse = z.infer<typeof ChatCompletionResponse>;

// Streaming response schemas
export const ChatCompletionChunk = z.object({
  id: z.string(),
  object: z.literal('chat.completion.chunk'),
  created: z.number(),
  model: z.string(),
  system_fingerprint: z.string().optional(),
  choices: z.array(
    z.object({
      index: z.number(),
      delta: z.object({
        role: z.enum(['assistant']).optional(),
        content: z.string().optional(),
        tool_calls: z
          .array(
            z.object({
              index: z.number(),
              id: z.string().optional(),
              type: z.literal('function').optional(),
              function: z
                .object({
                  name: z.string().optional(),
                  arguments: z.string().optional(),
                })
                .optional(),
            }),
          )
          .optional(),
        function_call: z
          .object({
            name: z.string().optional(),
            arguments: z.string().optional(),
          })
          .optional(),
      }),
      logprobs: z
        .object({
          content: z
            .array(
              z.object({
                token: z.string(),
                logprob: z.number(),
                bytes: z.array(z.number()).nullable(),
                top_logprobs: z.array(
                  z.object({
                    token: z.string(),
                    logprob: z.number(),
                    bytes: z.array(z.number()).nullable(),
                  }),
                ),
              }),
            )
            .nullable(),
        })
        .nullable()
        .optional(),
      finish_reason: z
        .enum(['stop', 'length', 'tool_calls', 'content_filter', 'function_call'])
        .nullable(),
    }),
  ),
});
export type ChatCompletionChunk = z.infer<typeof ChatCompletionChunk>;

// Embeddings API schemas
export const EmbeddingRequest = z.object({
  model: z.string(),
  input: z.union([
    z.string(),
    z.array(z.string()),
    z.array(z.number()),
    z.array(z.array(z.number())),
  ]),
  encoding_format: z.enum(['float', 'base64']).default('float'),
  dimensions: z.number().int().positive().optional(),
  user: z.string().optional(),
});
export type EmbeddingRequest = z.infer<typeof EmbeddingRequest>;

export const Embedding = z.object({
  object: z.literal('embedding'),
  embedding: z.array(z.number()),
  index: z.number().int().nonnegative(),
});
export type Embedding = z.infer<typeof Embedding>;

export const EmbeddingResponse = z.object({
  object: z.literal('list'),
  data: z.array(Embedding),
  model: z.string(),
  usage: z.object({
    prompt_tokens: z.number().int().nonnegative(),
    total_tokens: z.number().int().nonnegative(),
  }),
});
export type EmbeddingResponse = z.infer<typeof EmbeddingResponse>;

// Images API schemas
export const ImageGenerationRequest = z.object({
  model: z.string().default('dall-e-3'),
  prompt: z.string().min(1),
  n: z.number().int().min(1).max(10).default(1),
  quality: z.enum(['standard', 'hd']).default('standard'),
  response_format: z.enum(['url', 'b64_json']).default('url'),
  size: z.enum(['256x256', '512x512', '1024x1024', '1792x1024', '1024x1792']).default('1024x1024'),
  style: z.enum(['vivid', 'natural']).default('vivid'),
  user: z.string().optional(),
});
export type ImageGenerationRequest = z.infer<typeof ImageGenerationRequest>;

export const ImageObject = z.object({
  b64_json: z.string().optional(),
  url: z.string().optional(),
  revised_prompt: z.string().optional(),
});
export type ImageObject = z.infer<typeof ImageObject>;

export const ImageResponse = z.object({
  created: z.number().int().positive(),
  data: z.array(ImageObject),
});
export type ImageResponse = z.infer<typeof ImageResponse>;

// Models API schemas
export const ModelObject = z.object({
  id: z.string(),
  object: z.literal('model'),
  created: z.number().int().positive(),
  owned_by: z.string(),
});
export type ModelObject = z.infer<typeof ModelObject>;

export const ModelsResponse = z.object({
  object: z.literal('list'),
  data: z.array(ModelObject),
});
export type ModelsResponse = z.infer<typeof ModelsResponse>;
