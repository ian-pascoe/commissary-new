import type {
  ContentBlockParam,
  MessageCreateParams,
  MessageParam,
  TextBlockParam,
  RawMessageStreamEvent,
  ContentBlock,
} from '@anthropic-ai/sdk/resources';
import {
  ChatCompletionsV1NonStreamingResponseBody,
  type ChatCompletionsV1Message,
  type ChatCompletionsV1RequestBody,
  type ChatCompletionsV1StreamingResponseBody,
} from '~/api/schemas/v1/chat';
import type { Provider, ProviderCredential, ProviderModel } from '~/core/schemas/database';
import { createId } from '~/core/utils/id';
import type { ProviderBaseClient } from './base-client';
import { ca } from 'zod/v4/locales';

export class AnthropicClient implements ProviderBaseClient {
  private provider: Provider;
  private credential: ProviderCredential;

  constructor(options: {
    provider: Provider;
    credential: ProviderCredential;
  }) {
    this.provider = options.provider;
    this.credential = options.credential;
  }

  async doGenerate(input: {
    model: ProviderModel;
    request: ChatCompletionsV1RequestBody;
  }): Promise<{ stream: ReadableStream<ChatCompletionsV1StreamingResponseBody> }> {
    throw new Error('Method not implemented.');
  }

  async doStream(input: {
    model: ProviderModel;
    request: ChatCompletionsV1RequestBody;
  }): Promise<{ stream: ReadableStream<ChatCompletionsV1StreamingResponseBody> }> {
    const { system, messages } = this.convertMessages(input.request.messages);
    const anthropicRequest: MessageCreateParams = {
      model: input.model.slug,
      max_tokens: input.request.maxOutputTokens ?? 4096,
      temperature: input.request.temperature ?? undefined,
      top_k: input.request.topK ?? undefined,
      top_p: input.request.topP ?? undefined,
      stream: true,
      stop_sequences: input.request.stop ?? undefined,
      system,
      messages,
    };

    const response = await fetch(`${this.provider.baseUrl}${input.model.endpointPath}`, {
      method: 'POST',
      body: JSON.stringify(anthropicRequest),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.credential.value}`,
      },
    });

    const reader = response.body?.getReader();
    const stream = new ReadableStream<RawMessageStreamEvent>({
      async pull(controller) {
        while (true) {
          const { done, value } = (await reader?.read()) ?? {};
          if (done) {
            controller.close();
            break;
          }
          controller.enqueue(value);
        }
      },
    }).pipeThrough(
      new TransformStream<RawMessageStreamEvent, ChatCompletionsV1StreamingResponseBody>({
        async transform(chunk, controller) {
          // Convert chunk to OpenAI format
          const openAIChunk = convertToOpenAIFormat(chunk);
          controller.enqueue(openAIChunk);
        },
      }),
    );
    return { stream };
  }

  convertMessages(messages: ChatCompletionsV1Message[]): {
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
              : (message.content
                  ?.map((c): ContentBlockParam | null => {
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
                        console.warn(
                          'Anthropic API does not support audio input natively. Audio input will be ignored.',
                        );
                        return null;
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
                  })
                  .filter((c) => c !== null) ?? []),
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

  convertToOpenAIFormat(
    model: ProviderModel,
    chunk: RawMessageStreamEvent,
  ): ChatCompletionsV1StreamingResponseBody | null {
    const defaultMessageProps = {
      id: createId(),
      object: 'chat.completion.chunk',
      created: Date.now() / 1000,
      model: model.slug,
    } as const satisfies Partial<ChatCompletionsV1StreamingResponseBody>;
    let usage: Partial<ChatCompletionsV1StreamingResponseBody['usage']> = {};
    const contentBlocks: ContentBlock[] = [];
    switch (chunk.type) {
      case 'message_start': {
        usage = {
          ...usage,
          prompt_tokens: chunk.message.usage.input_tokens,
          
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
            throw new Error(`Unhandled content block delta type: ${chunk.delta.type}`);
          }
        }
      }
      default: {
        throw new Error(`Unhandled chunk type: ${chunk.type}`);
      }
    }
  }
}
