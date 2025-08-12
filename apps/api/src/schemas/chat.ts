import * as z from 'zod';

export const ChatCompletionV1SystemMessage = z.object({
  role: z.literal('system'),
  content: z.string(),
  name: z.optional(z.string()),
});
export type ChatCompletionV1SystemMessage = z.infer<typeof ChatCompletionV1SystemMessage>;

export const ChatCompletionV1DeveloperMessage = z.object({
  role: z.literal('developer'),
  content: z.string(),
  name: z.optional(z.string()),
});
export type ChatCompletionV1DeveloperMessage = z.infer<typeof ChatCompletionV1DeveloperMessage>;

export const ChatCompletionV1UserMessage = z.object({
  role: z.literal('user'),
  content: z.union([
    z.string(),
    z.array(
      z.union([
        z.object({
          type: z.literal('text'),
          text: z.string(),
        }),
        z.object({
          type: z.literal('image_url'),
          image_url: z.object({
            url: z.string(),
            detail: z.optional(z.enum(['auto', 'low', 'high'])),
          }),
        }),
        z.object({
          type: z.literal('input_audio'),
          input_audio: z.object({
            data: z.string(),
            format: z.enum(['wav', 'mp3']),
          }),
        }),
        z.object({
          type: z.literal('file'),
          file: z.object({
            file_data: z.optional(z.string()),
            file_id: z.optional(z.string()),
            filename: z.optional(z.string()),
          }),
        }),
      ]),
    ),
  ]),
  name: z.optional(z.string()),
});
export type ChatCompletionV1UserMessage = z.infer<typeof ChatCompletionV1UserMessage>;

export const ChatCompletionV1AssistantMessage = z.object({
  role: z.literal('assistant'),
  audio: z.optional(
    z.object({
      id: z.string(),
    }),
  ),
  content: z.optional(
    z.union([
      z.string(),
      z.array(
        z.union([
          z.object({
            type: z.literal('text'),
            text: z.string(),
          }),
          z.object({
            type: z.literal('refusal'),
            refusal: z.string(),
          }),
        ]),
      ),
    ]),
  ),
  function_call: z.optional(
    z.object({
      arguments: z.string(),
      name: z.string(),
    }),
  ),
  name: z.optional(z.string()),
  refusal: z.optional(z.string()),
  tool_calls: z.optional(
    z.array(
      z.object({
        id: z.string(),
        function: z.object({
          arguments: z.string(),
          name: z.string(),
        }),
        type: z.literal('function'),
      }),
    ),
  ),
});
export type ChatCompletionV1AssistantMessage = z.infer<typeof ChatCompletionV1AssistantMessage>;

export const ChatCompletionV1ToolMessage = z.object({
  role: z.literal('tool'),
  content: z.union([
    z.string(),
    z.array(
      z.object({
        type: z.literal('text'),
        text: z.string(),
      }),
    ),
  ]),
  tool_call_id: z.string(),
});
export type ChatCompletionV1ToolMessage = z.infer<typeof ChatCompletionV1ToolMessage>;

export const ChatCompletionV1FunctionMessage = z
  .object({
    role: z.literal('function'),
    name: z.string(),
    content: z.nullable(z.string()),
  })
  .meta({ deprecated: true });
export type ChatCompletionV1FunctionMessage = z.infer<typeof ChatCompletionV1FunctionMessage>;

export const ChatCompletionV1Message = z.union([
  ChatCompletionV1SystemMessage,
  ChatCompletionV1DeveloperMessage,
  ChatCompletionV1UserMessage,
  ChatCompletionV1AssistantMessage,
  ChatCompletionV1ToolMessage,
  ChatCompletionV1FunctionMessage,
]);
export type ChatCompletionV1Message = z.infer<typeof ChatCompletionV1Message>;

export const ChatCompletionV1RequestBody = z.object({
  model: z.string(),
  stream: z.nullish(z.boolean()),
  messages: z.array(ChatCompletionV1Message),
});
export type ChatCompletionV1RequestBody = z.infer<typeof ChatCompletionV1RequestBody>;

export const ChatCompletionsV1Logprobs = z.object({
  content: z.array(
    z.object({
      bytes: z.nullish(z.array(z.number())),
      logprob: z.nullish(z.number()),
      token: z.nullish(z.string()),
      top_logprobs: z.nullish(
        z.array(
          z.object({
            bytes: z.nullish(z.array(z.number())),
            logprob: z.nullish(z.number()),
            token: z.nullish(z.string()),
          }),
        ),
      ),
    }),
  ),
  refusal: z.array(
    z.object({
      bytes: z.nullish(z.array(z.number())),
      logprob: z.nullish(z.number()),
      token: z.nullish(z.string()),
      top_logprobs: z.nullish(
        z.array(
          z.object({
            bytes: z.nullish(z.array(z.number())),
            logprob: z.nullish(z.number()),
            token: z.nullish(z.string()),
          }),
        ),
      ),
    }),
  ),
});
export type ChatCompletionsV1Logprobs = z.infer<typeof ChatCompletionsV1Logprobs>;

export const ChatCompletionV1Usage = z.object({
  completion_tokens: z.int(),
  prompt_tokens: z.int(),
  total_tokens: z.int(),
  completion_tokens_details: z.object({
    accepted_prediction_tokens: z.int(),
    audio_tokens: z.int(),
    reasoning_tokens: z.int(),
    rejected_prediction_tokens: z.int(),
  }),
  prompt_tokens_details: z.object({
    audio_tokens: z.int(),
    cached_tokens: z.int(),
  }),
});
export type ChatCompletionV1Usage = z.infer<typeof ChatCompletionV1Usage>;

export const ChatCompletionV1StreamingResponseBody = z.object({
  id: z.string(),
  object: z.literal('chat.completion.chunk'),
  created: z.number(),
  model: z.string(),
  system_fingerprint: z.nullish(z.string()),
  service_tier: z.nullish(z.string()),
  usage: z.nullish(ChatCompletionV1Usage),
  choices: z.array(
    z.object({
      delta: z.object({
        content: z.nullish(z.string()),
        function_call: z.nullish(
          z.object({
            arguments: z.string(),
            name: z.string(),
          }),
        ),
        refusal: z.nullish(z.string()),
        role: z.string(),
        tool_calls: z.nullish(
          z.array(
            z.object({
              index: z.int(),
              function: z.object({
                arguments: z.string(),
                name: z.string(),
              }),
              id: z.string(),
              type: z.literal('function'),
            }),
          ),
        ),
      }),
      finish_reason: z.nullish(z.string()),
      index: z.int(),
      logprobs: z.nullish(ChatCompletionsV1Logprobs),
    }),
  ),
});
export type ChatCompletionV1StreamingResponseBody = z.infer<
  typeof ChatCompletionV1StreamingResponseBody
>;

export const ChatCompletionsV1NonStreamingResponseBody = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  system_fingerprint: z.nullish(z.string()),
  service_tier: z.nullish(z.string()),
  usage: z.nullish(ChatCompletionV1Usage),
  choices: z.array(
    z.object({
      finish_reason: z.string(),
      index: z.int(),
      logprobs: z.nullish(ChatCompletionsV1Logprobs),
      message: z.object({
        content: z.nullish(z.string()),
        refusal: z.nullish(z.string()),
        role: z.string(),
        annotations: z.array(
          z.object({
            type: z.string(),
            url_citation: z.string(),
          }),
        ),
        audio: z.nullish(
          z.object({
            data: z.string(),
            expires_at: z.int(),
            id: z.string(),
            transcript: z.string(),
          }),
        ),
        function_call: z.nullish(
          z.object({
            arguments: z.string(),
            name: z.string(),
          }),
        ),
        tools_calls: z.nullish(
          z.array(
            z.union([
              z.object({
                index: z.int(),
                function: z.object({
                  arguments: z.string(),
                  name: z.string(),
                }),
                id: z.string(),
                type: z.literal('function'),
              }),
              z.object({
                custom: z.object({
                  input: z.string(),
                  name: z.string(),
                }),
                id: z.string(),
                type: z.literal('custom'),
              }),
            ]),
          ),
        ),
      }),
    }),
  ),
});
export type ChatCompletionsV1NonStreamingResponseBody = z.infer<
  typeof ChatCompletionsV1NonStreamingResponseBody
>;

export const ChatCompletionsV1ResponseBody = z.union([
  ChatCompletionsV1NonStreamingResponseBody,
  ChatCompletionV1StreamingResponseBody,
]);
export type ChatCompletionsV1ResponseBody = z.infer<typeof ChatCompletionsV1ResponseBody>;
