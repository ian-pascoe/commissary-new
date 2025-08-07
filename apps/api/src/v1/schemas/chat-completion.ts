import * as z from 'zod';

export const ChatCompletionSystemMessage = z.object({
  role: z.literal('system'),
  content: z.string(),
  name: z.optional(z.string()),
});
export type ChatCompletionSystemMessage = z.infer<
  typeof ChatCompletionSystemMessage
>;

export const ChatCompletionDeveloperMessage = z.object({
  role: z.literal('developer'),
  content: z.string(),
  name: z.optional(z.string()),
});
export type ChatCompletionDeveloperMessage = z.infer<
  typeof ChatCompletionDeveloperMessage
>;

export const ChatCompletionUserMessage = z.object({
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
export type ChatCompletionUserMessage = z.infer<
  typeof ChatCompletionUserMessage
>;

export const ChatCompletionAssistantMessage = z.object({
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
export type ChatCompletionAssistantMessage = z.infer<
  typeof ChatCompletionAssistantMessage
>;

export const ChatCompletionToolMessage = z.object({
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
export type ChatCompletionToolMessage = z.infer<
  typeof ChatCompletionToolMessage
>;

export const ChatCompletionFunctionMessage = z
  .object({
    role: z.literal('function'),
    name: z.string(),
    content: z.nullable(z.string()),
  })
  .meta({ deprecated: true });
export type ChatCompletionFunctionMessage = z.infer<
  typeof ChatCompletionFunctionMessage
>;

export const ChatCompletionMessage = z.union([
  ChatCompletionSystemMessage,
  ChatCompletionDeveloperMessage,
  ChatCompletionUserMessage,
  ChatCompletionAssistantMessage,
  ChatCompletionToolMessage,
  ChatCompletionFunctionMessage,
]);
export type ChatCompletionMessage = z.infer<typeof ChatCompletionMessage>;

export const ChatCompletionRequestBody = z.object({
  model: z.string(),
  stream: z.nullish(z.boolean()),
  messages: z.array(ChatCompletionMessage),
});
export type ChatCompletionRequestBody = z.infer<
  typeof ChatCompletionRequestBody
>;
