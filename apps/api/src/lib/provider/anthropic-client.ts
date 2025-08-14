import type {
  ContentBlock,
  ContentBlockParam,
  Message,
  MessageCreateParams,
  MessageParam,
  RawMessageStreamEvent,
  StopReason,
  TextBlockParam,
} from '@anthropic-ai/sdk/resources';
import type {
  ChatCompletionsV1Message,
  ChatCompletionsV1NonStreamingResponseBody,
  ChatCompletionsV1RequestBody,
  ChatCompletionsV1StopReason,
  ChatCompletionsV1StreamingResponseBody,
  ChatCompletionsV1Usage,
} from '~/api/schemas/v1/chat';
import { createId } from '~/core/utils/id';
import type { ProviderBaseClient } from './base-client';

export class AnthropicClient implements ProviderBaseClient {
  provider;
  credential;
  model;

  constructor(options: {
    provider: ProviderBaseClient['provider'];
    credential: ProviderBaseClient['credential'];
    model: ProviderBaseClient['model'];
  }) {
    this.provider = options.provider;
    this.credential = options.credential;
    this.model = options.model;
  }

  async doGenerate(input: {
    request: ChatCompletionsV1RequestBody;
  }): Promise<{ data: ChatCompletionsV1NonStreamingResponseBody }> {
    const { system, messages } = this.convertRequestMessages(input.request.messages);
    const anthropicRequest: MessageCreateParams = {
      model: this.model.slug,
      max_tokens: input.request.maxOutputTokens ?? 4096,
      temperature: input.request.temperature ?? undefined,
      top_k: input.request.topK ?? undefined,
      top_p: input.request.topP ?? undefined,
      stop_sequences: input.request.stop ?? undefined,
      system,
      messages,
      stream: false,
    };
    const response = await fetch(`${this.provider.baseUrl}${this.model.endpointPath}`, {
      method: 'POST',
      body: JSON.stringify(anthropicRequest),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.credential.value}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Anthropic API request failed with status ${response.status}`);
    }

    const data = (await response.json()) as Message;
    return {
      data: {
        id: data.id,
        object: 'chat.completion',
        created: Date.now() / 1000,
        model: this.model.slug,
        usage: {
          prompt_tokens: data.usage.input_tokens,
          completion_tokens: data.usage.output_tokens,
          total_tokens: data.usage.input_tokens + data.usage.output_tokens,
          prompt_tokens_details: {
            cached_tokens: data.usage.cache_read_input_tokens ?? 0,
            audio_tokens: 0,
          },
          completion_tokens_details: {
            accepted_prediction_tokens: data.usage.output_tokens,
            rejected_prediction_tokens: 0,
            reasoning_tokens: 0,
            audio_tokens: 0,
          },
        },
        choices: [
          {
            index: 0,
            message: this.convertResponseMessage(data),
            finish_reason: data.stop_reason ? this.mapStopReason(data.stop_reason) : 'stop',
          },
        ],
      },
    };
  }

  async doStream(input: {
    request: ChatCompletionsV1RequestBody;
  }): Promise<{ stream: ReadableStream<ChatCompletionsV1StreamingResponseBody> }> {
    const { system, messages } = this.convertRequestMessages(input.request.messages);
    const anthropicRequest: MessageCreateParams = {
      model: this.model.slug,
      max_tokens: input.request.maxOutputTokens ?? 4096,
      temperature: input.request.temperature ?? undefined,
      top_k: input.request.topK ?? undefined,
      top_p: input.request.topP ?? undefined,
      stream: true,
      stop_sequences: input.request.stop ?? undefined,
      system,
      messages,
    };
    const response = await fetch(`${this.provider.baseUrl}${this.model.endpointPath}`, {
      method: 'POST',
      body: JSON.stringify(anthropicRequest),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.credential.value}`,
      },
    });
    if (!response.ok) {
      throw new Error(`Anthropic API request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    const convertToOpenAIStreamFormat = this.convertToOpenAIStreamFormat.bind(this);
    const stream = new ReadableStream<RawMessageStreamEvent>({
      async pull(controller) {
        if (!reader) {
          controller.close();
          return;
        }
        try {
          while (true) {
            const { done, value } = (await reader?.read()) ?? {};
            if (done) {
              controller.close();
              break;
            }
            controller.enqueue(value);
          }
        } catch (error) {
          controller.error(error);
        } finally {
          reader.releaseLock();
        }
      },
    }).pipeThrough(
      new TransformStream<RawMessageStreamEvent, ChatCompletionsV1StreamingResponseBody>({
        async transform(chunk, controller) {
          // Convert chunk to OpenAI format
          const openAIChunk = convertToOpenAIStreamFormat(chunk);
          if (openAIChunk) {
            controller.enqueue(openAIChunk);
          }
        },
      }),
    );
    return { stream };
  }

  private convertRequestMessages(messages: ChatCompletionsV1Message[]): {
    system: TextBlockParam[];
    messages: MessageParam[];
  } {
    let system: TextBlockParam[] = [];
    const anthropicMessages: MessageParam[] = [];

    // Convert messages
    for (const message of messages) {
      if (message.role === 'system' || message.role === 'developer') {
        system ??= [...(system || []), { type: 'text', text: message.content }];
      } else if (message.role === 'user' || message.role === 'assistant') {
        anthropicMessages.push({
          role: message.role,
          content:
            typeof message.content === 'string'
              ? message.content
              : (message.content?.map((c): ContentBlockParam => {
                  switch (c.type) {
                    case 'text': {
                      return {
                        type: 'text',
                        text: c.text,
                      };
                    }
                    case 'file': {
                      return {
                        type: 'document',
                        source: {
                          type: 'base64',
                          media_type: 'application/pdf',
                          data: c.file.file_data ?? '',
                        },
                      };
                    }
                    case 'image_url': {
                      return {
                        type: 'image',
                        source: {
                          type: 'url',
                          url: c.image_url.url,
                        },
                      };
                    }
                    case 'input_audio': {
                      throw new Error('Anthropic does not support audio messages');
                    }
                    case 'refusal': {
                      return {
                        type: 'text',
                        text: c.refusal,
                      };
                    }
                    default: {
                      throw new Error(`Unsupported content block type: ${(c as any).type}`);
                    }
                  }
                }) ?? []),
        });
      } else if (message.role === 'tool') {
        anthropicMessages.push({
          role: 'assistant',
          content: [
            {
              type: 'tool_result',
              tool_use_id: message.tool_call_id,
              content: [
                {
                  type: 'text',
                  text:
                    typeof message.content === 'string'
                      ? message.content
                      : message.content.map((c) => c.text).join(''),
                },
              ],
            },
          ],
        });
      } else if (message.role === 'function') {
        anthropicMessages.push({
          role: 'assistant',
          content: [
            {
              type: 'tool_use',
              id: createId(),
              name: 'unknown',
              input: message.content,
            },
          ],
        });
      } else {
        throw new Error(`Unsupported message role: ${(message as any).role}`);
      }
    }

    return { system, messages: anthropicMessages };
  }

  private convertToOpenAIStreamFormat(
    chunk: RawMessageStreamEvent,
  ): ChatCompletionsV1StreamingResponseBody | null {
    const defaultMessageProps = {
      id: createId('cmpl'),
      object: 'chat.completion.chunk',
      created: Date.now() / 1000,
      model: this.model.slug,
    } as const satisfies Partial<ChatCompletionsV1StreamingResponseBody>;
    let usage: Partial<ChatCompletionsV1Usage> = {};
    const contentBlocks: ContentBlock[] = [];
    switch (chunk.type) {
      case 'message_start': {
        usage = {
          prompt_tokens: chunk.message.usage.input_tokens,
          completion_tokens: chunk.message.usage.output_tokens,
          total_tokens: chunk.message.usage.input_tokens + chunk.message.usage.output_tokens,
          prompt_tokens_details: {
            cached_tokens:
              chunk.message.usage.cache_read_input_tokens ??
              usage.prompt_tokens_details?.cached_tokens ??
              0,
            audio_tokens: usage.prompt_tokens_details?.audio_tokens ?? 0,
          },
          completion_tokens_details: {
            accepted_prediction_tokens: chunk.message.usage.output_tokens,
            rejected_prediction_tokens:
              usage.completion_tokens_details?.rejected_prediction_tokens ?? 0,
            reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
            audio_tokens: usage.completion_tokens_details?.audio_tokens ?? 0,
          },
        };
        return {
          ...defaultMessageProps,
          choices: [
            {
              index: 0,
              delta: {},
              finish_reason: null,
            },
          ],
        };
      }
      case 'message_delta': {
        usage = {
          prompt_tokens: chunk.usage.input_tokens ?? usage.prompt_tokens ?? 0,
          completion_tokens: chunk.usage.output_tokens,
          total_tokens:
            (chunk.usage.input_tokens ?? usage.prompt_tokens ?? 0) + chunk.usage.output_tokens,
          prompt_tokens_details: {
            cached_tokens:
              chunk.usage.cache_read_input_tokens ??
              usage.prompt_tokens_details?.cached_tokens ??
              0,
            audio_tokens: usage.prompt_tokens_details?.audio_tokens ?? 0,
          },
          completion_tokens_details: {
            accepted_prediction_tokens: chunk.usage.output_tokens,
            rejected_prediction_tokens:
              usage.completion_tokens_details?.rejected_prediction_tokens ?? 0,
            reasoning_tokens: usage.completion_tokens_details?.reasoning_tokens ?? 0,
            audio_tokens: usage.completion_tokens_details?.audio_tokens ?? 0,
          },
        };
        if (chunk.delta.stop_reason) {
          return {
            ...defaultMessageProps,
            choices: [
              {
                index: 0,
                delta: {},
                finish_reason: this.mapStopReason(chunk.delta.stop_reason),
              },
            ],
          };
        }
        return null;
      }
      case 'content_block_start': {
        contentBlocks[chunk.index] = chunk.content_block;
        switch (chunk.content_block.type) {
          case 'text': {
            return {
              ...defaultMessageProps,
              choices: [
                {
                  index: 0,
                  delta: {
                    role: 'assistant',
                    content: chunk.content_block.text,
                  },
                },
              ],
            };
          }
          case 'thinking': {
            return {
              ...defaultMessageProps,
              choices: [
                {
                  index: 0,
                  delta: {
                    role: 'assistant',
                    reasoning_content: chunk.content_block.thinking,
                  },
                },
              ],
            };
          }
          case 'redacted_thinking': {
            return {
              ...defaultMessageProps,
              choices: [
                {
                  index: 0,
                  delta: {
                    role: 'assistant',
                    reasoning_content: '',
                  },
                },
              ],
            };
          }
          case 'server_tool_use':
          case 'tool_use': {
            return {
              ...defaultMessageProps,
              choices: [
                {
                  index: 0,
                  delta: {
                    role: 'assistant',
                    tool_calls: [
                      {
                        index: 0,
                        id: chunk.content_block.id,
                        type: 'function',
                        function: {
                          arguments: JSON.stringify(chunk.content_block.input),
                          name: chunk.content_block.name,
                        },
                      },
                    ],
                  },
                },
              ],
            };
          }
          case 'web_search_tool_result': {
            return {
              ...defaultMessageProps,
              choices: [
                {
                  index: 0,
                  delta: {
                    role: 'assistant',
                    tool_calls: [
                      {
                        index: 0,
                        id: chunk.content_block.tool_use_id,
                        type: 'function',
                        function: {
                          arguments: Array.isArray(chunk.content_block.content)
                            ? JSON.stringify(chunk.content_block.content)
                            : chunk.content_block.content.error_code,
                          name: 'web_search_tool',
                        },
                      },
                    ],
                  },
                },
              ],
            };
          }
          default: {
            throw new Error(
              `Unhandled chunk content block type: ${(chunk.content_block as any).type}`,
            );
          }
        }
      }
      case 'content_block_delta': {
        switch (chunk.delta.type) {
          case 'text_delta': {
            return {
              ...defaultMessageProps,
              choices: [
                {
                  index: 0,
                  delta: {
                    role: 'assistant',
                    content: chunk.delta.text,
                  },
                },
              ],
            };
          }
          case 'thinking_delta': {
            return {
              ...defaultMessageProps,
              choices: [
                {
                  index: 0,
                  delta: {
                    role: 'assistant',
                    reasoning_content: chunk.delta.thinking,
                  },
                },
              ],
            };
          }
          case 'input_json_delta': {
            const contentBlock = contentBlocks[chunk.index];
            if (contentBlock?.type === 'tool_use') {
              return {
                ...defaultMessageProps,
                choices: [
                  {
                    index: 0,
                    delta: {
                      role: 'assistant',
                      tool_calls: [
                        {
                          index: 0,
                          type: 'function',
                          id: contentBlock.id,
                          function: {
                            arguments: chunk.delta.partial_json,
                            name: contentBlock.name,
                          },
                        },
                      ],
                    },
                  },
                ],
              };
            }
            if (contentBlock?.type === 'text') {
              return {
                ...defaultMessageProps,
                choices: [
                  {
                    index: 0,
                    delta: {
                      role: 'assistant',
                      content: chunk.delta.partial_json,
                    },
                  },
                ],
              };
            }
            return null;
          }
          default: {
            console.warn(`Unhandled chunk delta type: ${chunk.delta.type}`);
            return null;
          }
        }
      }
      default: {
        console.warn(`Unhandled chunk type: ${chunk.type}`);
        return null;
      }
    }
  }

  private mapStopReason(stopReason: StopReason): ChatCompletionsV1StopReason {
    switch (stopReason) {
      case 'refusal': {
        return 'content_filter';
      }
      case 'tool_use': {
        return 'tool_calls';
      }
      case 'max_tokens': {
        return 'length';
      }
      case 'pause_turn':
      case 'end_turn':
      case 'stop_sequence': {
        return 'stop';
      }
      default: {
        throw new Error(`Unhandled stop reason: ${stopReason}`);
      }
    }
  }

  private convertResponseMessage(
    data: Message,
  ): ChatCompletionsV1NonStreamingResponseBody['choices'][number]['message'] {
    switch (data.role) {
      case 'assistant': {
        return {
          role: 'assistant',
          content: data.content
            .filter((c) => c.type === 'text')
            .map((c) => c.text)
            .join('\n'),
          reasoning_content: data.content
            .filter((c) => c.type === 'thinking' || c.type === 'redacted_thinking')
            .map((c) => (c.type === 'thinking' ? c.thinking : ''))
            .join('\n'),
          tools_calls: data.content
            .filter(
              (c) =>
                c.type === 'tool_use' ||
                c.type === 'server_tool_use' ||
                c.type === 'web_search_tool_result',
            )
            .map((c) => {
              switch (c.type) {
                case 'tool_use': {
                  return {
                    index: 0,
                    type: 'function',
                    id: c.id,
                    function: {
                      arguments: JSON.stringify(c.input),
                      name: c.name,
                    },
                  };
                }
                case 'server_tool_use': {
                  return {
                    index: 0,
                    type: 'function',
                    id: c.id,
                    function: {
                      arguments: JSON.stringify(c.input),
                      name: c.name,
                    },
                  };
                }
                case 'web_search_tool_result': {
                  return {
                    index: 0,
                    type: 'function',
                    id: c.tool_use_id,
                    function: {
                      arguments: Array.isArray(c.content)
                        ? JSON.stringify(c.content)
                        : c.content.error_code,
                      name: 'web_search_tool',
                    },
                  };
                }
                default: {
                  throw new Error(`Unhandled content block type: ${(c as any).type}`);
                }
              }
            }),
        };
      }
      default: {
        throw new Error(`Unsupported message role: ${(data as any).role}`);
      }
    }
  }
}
