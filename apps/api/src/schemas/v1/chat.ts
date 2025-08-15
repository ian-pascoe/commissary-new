import * as z from 'zod';

export const ChatCompletionsV1ImageUrl = z.object({
  url: z.string(),
  detail: z.optional(z.enum(['auto', 'low', 'high'])),
});
export type ChatCompletionsV1ImageUrl = z.infer<
  typeof ChatCompletionsV1ImageUrl
>;

export const ChatCompletionsV1InputAudio = z.object({
  data: z.string(),
  format: z.enum(['wav', 'mp3']),
});
export type ChatCompletionsV1InputAudio = z.infer<
  typeof ChatCompletionsV1InputAudio
>;

export const ChatCompletionsV1FileObject = z.object({
  file_data: z.optional(z.string()),
  file_id: z.optional(z.string()),
  filename: z.optional(z.string()),
});
export type ChatCompletionsV1FileObject = z.infer<
  typeof ChatCompletionsV1FileObject
>;

export const ChatCompletionsV1FunctionCall = z.object({
  arguments: z.string(),
  name: z.string(),
});
export type ChatCompletionsV1FunctionCall = z.infer<
  typeof ChatCompletionsV1FunctionCall
>;

export const ChatCompletionsV1AudioReference = z.object({
  id: z.string(),
});
export type ChatCompletionsV1AudioReference = z.infer<
  typeof ChatCompletionsV1AudioReference
>;

export const ChatCompletionsV1TextContentPart = z.object({
  type: z.literal('text'),
  text: z.string(),
});
export type ChatCompletionsV1TextContentPart = z.infer<
  typeof ChatCompletionsV1TextContentPart
>;

export const ChatCompletionsV1RefusalContentPart = z.object({
  type: z.literal('refusal'),
  refusal: z.string(),
});
export type ChatCompletionsV1RefusalContentPart = z.infer<
  typeof ChatCompletionsV1RefusalContentPart
>;

export const ChatCompletionsV1FunctionToolCall = z.object({
  id: z.string(),
  function: ChatCompletionsV1FunctionCall,
  type: z.literal('function'),
});
export type ChatCompletionsV1FunctionToolCall = z.infer<
  typeof ChatCompletionsV1FunctionToolCall
>;

export const ChatCompletionsV1StreamingFunctionToolCall = z.object({
  index: z.int(),
  function: ChatCompletionsV1FunctionCall,
  id: z.string(),
  type: z.literal('function'),
});
export type ChatCompletionsV1StreamingFunctionToolCall = z.infer<
  typeof ChatCompletionsV1StreamingFunctionToolCall
>;

export const ChatCompletionsV1CustomToolCall = z.object({
  custom: z.object({
    input: z.string(),
    name: z.string(),
  }),
  id: z.string(),
  type: z.literal('custom'),
});
export type ChatCompletionsV1CustomToolCall = z.infer<
  typeof ChatCompletionsV1CustomToolCall
>;

export const ChatCompletionsV1AudioData = z.object({
  data: z.string(),
  expires_at: z.int(),
  id: z.string(),
  transcript: z.string(),
});
export type ChatCompletionsV1AudioData = z.infer<
  typeof ChatCompletionsV1AudioData
>;

export const ChatCompletionsV1Annotation = z.object({
  type: z.string(),
  url_citation: z.string(),
});
export type ChatCompletionsV1Annotation = z.infer<
  typeof ChatCompletionsV1Annotation
>;

export const ChatCompletionsV1LogprobToken = z.object({
  bytes: z.nullish(z.array(z.number())),
  logprob: z.nullish(z.number()),
  token: z.nullish(z.string()),
});
export type ChatCompletionsV1LogprobToken = z.infer<
  typeof ChatCompletionsV1LogprobToken
>;

export const ChatCompletionsV1LogprobTokenWithTopLogprobs =
  ChatCompletionsV1LogprobToken.extend({
    top_logprobs: z.nullish(z.array(ChatCompletionsV1LogprobToken)),
  });
export type ChatCompletionsV1LogprobTokenWithTopLogprobs = z.infer<
  typeof ChatCompletionsV1LogprobTokenWithTopLogprobs
>;

export const ChatCompletionsV1CompletionTokensDetails = z.object({
  accepted_prediction_tokens: z.int(),
  audio_tokens: z.int(),
  reasoning_tokens: z.int(),
  rejected_prediction_tokens: z.int(),
});
export type ChatCompletionsV1CompletionTokensDetails = z.infer<
  typeof ChatCompletionsV1CompletionTokensDetails
>;

export const ChatCompletionsV1PromptTokensDetails = z.object({
  audio_tokens: z.int(),
  cached_tokens: z.int(),
});
export type ChatCompletionsV1PromptTokensDetails = z.infer<
  typeof ChatCompletionsV1PromptTokensDetails
>;

export const ChatCompletionsV1AudioConfig = z.object({
  format: z.enum(['wav', 'mp3', 'flac', 'opus', 'pcm16']),
  voice: z.enum([
    'alloy',
    'ash',
    'ballad',
    'coral',
    'echo',
    'fable',
    'nova',
    'onyx',
    'sage',
    'shimmer',
  ]),
});
export type ChatCompletionsV1AudioConfig = z.infer<
  typeof ChatCompletionsV1AudioConfig
>;

export const ChatCompletionsV1StreamOptions = z.object({
  include_obfuscation: z.optional(z.boolean()),
  include_usage: z.optional(z.boolean()),
});
export type ChatCompletionsV1StreamOptions = z.infer<
  typeof ChatCompletionsV1StreamOptions
>;

export const ChatCompletionsV1TextConfig = z.object({
  verbosity: z.nullish(z.enum(['low', 'medium', 'high'])),
});
export type ChatCompletionsV1TextConfig = z.infer<
  typeof ChatCompletionsV1TextConfig
>;

export const ChatCompletionsV1ApproximateLocation = z.object({
  city: z.optional(z.string()),
  country: z.optional(z.string()),
  region: z.optional(z.string()),
  timezone: z.optional(z.string()),
});
export type ChatCompletionsV1ApproximateLocation = z.infer<
  typeof ChatCompletionsV1ApproximateLocation
>;

export const ChatCompletionsV1UserLocation = z.object({
  type: z.literal('approximate'),
  approximate: ChatCompletionsV1ApproximateLocation,
});
export type ChatCompletionsV1UserLocation = z.infer<
  typeof ChatCompletionsV1UserLocation
>;

export const ChatCompletionsV1WebSearchOptions = z.object({
  search_context_size: z.optional(z.enum(['low', 'medium', 'high'])),
  user_location: z.nullish(ChatCompletionsV1UserLocation),
});
export type ChatCompletionsV1WebSearchOptions = z.infer<
  typeof ChatCompletionsV1WebSearchOptions
>;

export const ChatCompletionsV1FunctionDefinition = z.object({
  name: z.string(),
  description: z.optional(z.string()),
  parameters: z.any(),
});
export type ChatCompletionsV1FunctionDefinition = z.infer<
  typeof ChatCompletionsV1FunctionDefinition
>;

export const ChatCompletionsV1StrictFunctionDefinition =
  ChatCompletionsV1FunctionDefinition.extend({
    strict: z.nullish(z.boolean()),
  });
export type ChatCompletionsV1StrictFunctionDefinition = z.infer<
  typeof ChatCompletionsV1StrictFunctionDefinition
>;

export const ChatCompletionsV1GrammarFormat = z.object({
  type: z.literal('grammar'),
  grammar: z.object({
    definition: z.string(),
    syntax: z.enum(['lark', 'regex']),
  }),
});
export type ChatCompletionsV1GrammarFormat = z.infer<
  typeof ChatCompletionsV1GrammarFormat
>;

export const ChatCompletionsV1TextFormat = z.object({
  type: z.literal('text'),
});
export type ChatCompletionsV1TextFormat = z.infer<
  typeof ChatCompletionsV1TextFormat
>;

export const ChatCompletionsV1CustomToolDefinition = z.object({
  name: z.string(),
  description: z.optional(z.string()),
  format: z.union([
    ChatCompletionsV1TextFormat,
    ChatCompletionsV1GrammarFormat,
  ]),
});
export type ChatCompletionsV1CustomToolDefinition = z.infer<
  typeof ChatCompletionsV1CustomToolDefinition
>;

export const ChatCompletionsV1FunctionTool = z.object({
  type: z.literal('function'),
  function: ChatCompletionsV1StrictFunctionDefinition,
});
export type ChatCompletionsV1FunctionTool = z.infer<
  typeof ChatCompletionsV1FunctionTool
>;

export const ChatCompletionsV1CustomTool = z.object({
  type: z.literal('custom'),
  custom: ChatCompletionsV1CustomToolDefinition,
});
export type ChatCompletionsV1CustomTool = z.infer<
  typeof ChatCompletionsV1CustomTool
>;

export const ChatCompletionsV1FunctionToolChoice = z.object({
  type: z.literal('function'),
  function: z.object({ name: z.string() }),
});
export type ChatCompletionsV1FunctionToolChoice = z.infer<
  typeof ChatCompletionsV1FunctionToolChoice
>;

export const ChatCompletionsV1CustomToolChoice = z.object({
  type: z.literal('custom'),
  custom: z.object({ name: z.string() }),
});
export type ChatCompletionsV1CustomToolChoice = z.infer<
  typeof ChatCompletionsV1CustomToolChoice
>;

export const ChatCompletionsV1AllowedToolsChoice = z.object({
  type: z.literal('allowed_tools'),
  allowed_tools: z.object({
    mode: z.enum(['auto', 'required']),
    tools: z.array(
      z.object({
        type: z.literal('function'),
        function: z.object({ name: z.string() }),
      }),
    ),
  }),
});
export type ChatCompletionsV1AllowedToolsChoice = z.infer<
  typeof ChatCompletionsV1AllowedToolsChoice
>;

export const ChatCompletionsV1ResponseFormat = z.union([
  z.object({ type: z.literal('text') }),
  z.object({ type: z.literal('json_schema'), json_schema: z.any() }),
  z.object({ type: z.literal('json_object') }),
]);
export type ChatCompletionsV1ResponseFormat = z.infer<
  typeof ChatCompletionsV1ResponseFormat
>;

// Content part schemas
export const ChatCompletionsV1MessageTextContentPart = z.object({
  type: z.literal('text'),
  text: z.string(),
});
export type ChatCompletionsV1MessageTextContentPart = z.infer<
  typeof ChatCompletionsV1MessageTextContentPart
>;

export const ChatCompletionsV1MessageImageContentPart = z.object({
  type: z.literal('image_url'),
  image_url: ChatCompletionsV1ImageUrl,
});
export type ChatCompletionsV1MessageImageContentPart = z.infer<
  typeof ChatCompletionsV1MessageImageContentPart
>;

export const ChatCompletionsV1MessageInputAudioContentPart = z.object({
  type: z.literal('input_audio'),
  input_audio: ChatCompletionsV1InputAudio,
});
export type ChatCompletionsV1MessageInputAudioContentPart = z.infer<
  typeof ChatCompletionsV1MessageInputAudioContentPart
>;

export const ChatCompletionsV1MessageFileContentPart = z.object({
  type: z.literal('file'),
  file: ChatCompletionsV1FileObject,
});
export type ChatCompletionsV1MessageFileContentPart = z.infer<
  typeof ChatCompletionsV1MessageFileContentPart
>;

export const ChatCompletionsV1MessageContentPart = z.union([
  ChatCompletionsV1MessageTextContentPart,
  ChatCompletionsV1MessageImageContentPart,
  ChatCompletionsV1MessageInputAudioContentPart,
  ChatCompletionsV1MessageFileContentPart,
]);
export type ChatCompletionsV1MessageContentPart = z.infer<
  typeof ChatCompletionsV1MessageContentPart
>;

// Now we can define schemas that depend on ChatCompletionsV1MessageContentPart
export const ChatCompletionsV1PredictionContent = z.object({
  type: z.literal('content'),
  content: z.union([
    z.string(),
    z.array(ChatCompletionsV1MessageTextContentPart),
  ]),
});
export type ChatCompletionsV1PredictionContent = z.infer<
  typeof ChatCompletionsV1PredictionContent
>;

export const ChatCompletionsV1SystemMessage = z.object({
  role: z.literal('system'),
  content: z.string(),
  name: z.optional(z.string()),
});
export type ChatCompletionsV1SystemMessage = z.infer<
  typeof ChatCompletionsV1SystemMessage
>;

export const ChatCompletionsV1DeveloperMessage = z.object({
  role: z.literal('developer'),
  content: z.string(),
  name: z.optional(z.string()),
});
export type ChatCompletionsV1DeveloperMessage = z.infer<
  typeof ChatCompletionsV1DeveloperMessage
>;

export const ChatCompletionsV1UserMessage = z.object({
  role: z.literal('user'),
  content: z.union([z.string(), z.array(ChatCompletionsV1MessageContentPart)]),
  name: z.optional(z.string()),
});
export type ChatCompletionsV1UserMessage = z.infer<
  typeof ChatCompletionsV1UserMessage
>;

export const ChatCompletionsV1AssistantMessage = z.object({
  role: z.literal('assistant'),
  audio: z.nullish(ChatCompletionsV1AudioReference),
  content: z.nullish(
    z.union([
      z.string(),
      z.array(
        z.union([
          ChatCompletionsV1TextContentPart,
          ChatCompletionsV1RefusalContentPart,
        ]),
      ),
    ]),
  ),
  reasoning_content: z.nullish(z.string()),
  function_call: z.nullish(ChatCompletionsV1FunctionCall),
  name: z.optional(z.string()),
  refusal: z.nullish(z.string()),
  tool_calls: z.optional(z.array(ChatCompletionsV1FunctionToolCall)),
});
export type ChatCompletionsV1AssistantMessage = z.infer<
  typeof ChatCompletionsV1AssistantMessage
>;

export const ChatCompletionsV1ToolMessage = z.object({
  role: z.literal('tool'),
  content: z.union([z.string(), z.array(ChatCompletionsV1TextContentPart)]),
  tool_call_id: z.string(),
});
export type ChatCompletionsV1ToolMessage = z.infer<
  typeof ChatCompletionsV1ToolMessage
>;

export const ChatCompletionsV1FunctionMessage = z
  .object({
    role: z.literal('function'),
    name: z.string(),
    content: z.nullable(z.string()),
  })
  .meta({ deprecated: true });
export type ChatCompletionsV1FunctionMessage = z.infer<
  typeof ChatCompletionsV1FunctionMessage
>;

export const ChatCompletionsV1Message = z.union([
  ChatCompletionsV1SystemMessage,
  ChatCompletionsV1DeveloperMessage,
  ChatCompletionsV1UserMessage,
  ChatCompletionsV1AssistantMessage,
  ChatCompletionsV1ToolMessage,
  ChatCompletionsV1FunctionMessage,
]);
export type ChatCompletionsV1Message = z.infer<typeof ChatCompletionsV1Message>;

export const ChatCompletionsV1RequestBody = z.looseObject({
  messages: z.array(ChatCompletionsV1Message),
  model: z.string(),
  audio: z.nullish(ChatCompletionsV1AudioConfig),
  frequency_penalty: z.nullish(z.number()),
  function_call: z.optional(
    z.union([z.enum(['auto', 'none']), z.object({ name: z.string() })]),
  ),
  functions: z.optional(z.array(ChatCompletionsV1FunctionDefinition)),
  logit_bias: z.nullish(z.record(z.string(), z.number())),
  logprobs: z.nullish(z.boolean()),
  max_completion_tokens: z.nullish(z.int()),
  max_tokens: z.nullish(z.int()),
  metadata: z.nullish(z.record(z.string(), z.string())),
  modalities: z.nullish(z.array(z.enum(['text', 'audio']))),
  n: z.nullish(z.int()),
  parallel_tool_calls: z.optional(z.boolean()),
  prediction: z.nullish(ChatCompletionsV1PredictionContent),
  presence_penalty: z.nullish(z.number()),
  prompt_cache_key: z.optional(z.string()),
  reasoning_effort: z.optional(z.enum(['low', 'medium', 'high'])),
  response_format: z.optional(ChatCompletionsV1ResponseFormat),
  safety_identifier: z.optional(z.string()),
  seed: z.nullish(z.int()),
  service_tier: z.nullish(
    z.enum(['auto', 'default', 'flex', 'scale', 'priority']),
  ),
  stop: z.nullish(z.union([z.string(), z.array(z.string())])),
  store: z.nullish(z.boolean()),
  stream: z.nullish(z.boolean()),
  stream_options: z.nullish(ChatCompletionsV1StreamOptions),
  temperature: z.nullish(z.number()),
  text: z.nullish(ChatCompletionsV1TextConfig),
  tool_choice: z.optional(
    z.union([
      z.enum(['auto', 'none', 'required']),
      ChatCompletionsV1AllowedToolsChoice,
      ChatCompletionsV1FunctionToolChoice,
      ChatCompletionsV1CustomToolChoice,
    ]),
  ),
  tools: z.optional(
    z.array(
      z.union([ChatCompletionsV1FunctionTool, ChatCompletionsV1CustomTool]),
    ),
  ),
  top_logprobs: z.nullish(z.int()),
  top_p: z.nullish(z.number()),
  user: z.optional(z.string()),
  web_search_options: z.optional(ChatCompletionsV1WebSearchOptions),
  // Custom
  top_k: z.nullish(z.int()),
  min_p: z.nullish(z.number()),
  top_a: z.nullish(z.number()),
});
export type ChatCompletionsV1RequestBody = z.infer<
  typeof ChatCompletionsV1RequestBody
>;

export const ChatCompletionsV1Logprobs = z.object({
  content: z.array(ChatCompletionsV1LogprobTokenWithTopLogprobs),
  refusal: z.array(ChatCompletionsV1LogprobTokenWithTopLogprobs),
});
export type ChatCompletionsV1Logprobs = z.infer<
  typeof ChatCompletionsV1Logprobs
>;

export const ChatCompletionsV1Usage = z.object({
  completion_tokens: z.int(),
  prompt_tokens: z.int(),
  total_tokens: z.int(),
  completion_tokens_details: ChatCompletionsV1CompletionTokensDetails,
  prompt_tokens_details: ChatCompletionsV1PromptTokensDetails,
});
export type ChatCompletionsV1Usage = z.infer<typeof ChatCompletionsV1Usage>;

export const ChatCompletionsV1StopReason = z.enum([
  'stop',
  'tool_calls',
  'length',
  'function_call',
  'content_filter',
]);
export type ChatCompletionsV1StopReason = z.infer<
  typeof ChatCompletionsV1StopReason
>;

export const ChatCompletionsV1StreamingResponseBody = z.object({
  id: z.string(),
  object: z.literal('chat.completion.chunk'),
  created: z.number(),
  model: z.string(),
  system_fingerprint: z.nullish(z.string()),
  service_tier: z.nullish(z.string()),
  usage: z.nullish(ChatCompletionsV1Usage),
  choices: z.array(
    z.object({
      delta: z.object({
        content: z.nullish(z.string()),
        reasoning_content: z.nullish(z.string()),
        function_call: z.nullish(ChatCompletionsV1FunctionCall),
        refusal: z.nullish(z.string()),
        role: z.nullish(z.literal('assistant')),
        tool_calls: z.nullish(
          z.array(ChatCompletionsV1StreamingFunctionToolCall),
        ),
      }),
      finish_reason: z.nullish(ChatCompletionsV1StopReason),
      index: z.int(),
      logprobs: z.nullish(ChatCompletionsV1Logprobs),
    }),
  ),
});
export type ChatCompletionsV1StreamingResponseBody = z.infer<
  typeof ChatCompletionsV1StreamingResponseBody
>;

export const ChatCompletionsV1NonStreamingResponseBody = z.object({
  id: z.string(),
  object: z.literal('chat.completion'),
  created: z.number(),
  model: z.string(),
  system_fingerprint: z.nullish(z.string()),
  service_tier: z.nullish(z.string()),
  usage: z.nullish(ChatCompletionsV1Usage),
  choices: z.array(
    z.object({
      finish_reason: z.string(),
      index: z.int(),
      logprobs: z.nullish(ChatCompletionsV1Logprobs),
      message: z.object({
        content: z.nullish(z.string()),
        reasoning_content: z.nullish(z.string()),
        refusal: z.nullish(z.string()),
        role: z.string(),
        annotations: z.nullish(z.array(ChatCompletionsV1Annotation)),
        audio: z.nullish(ChatCompletionsV1AudioData),
        function_call: z.nullish(ChatCompletionsV1FunctionCall),
        tools_calls: z.nullish(
          z.array(
            z.union([
              ChatCompletionsV1FunctionToolCall.extend({ index: z.int() }),
              ChatCompletionsV1CustomToolCall,
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
  ChatCompletionsV1StreamingResponseBody,
]);
export type ChatCompletionsV1ResponseBody = z.infer<
  typeof ChatCompletionsV1ResponseBody
>;
