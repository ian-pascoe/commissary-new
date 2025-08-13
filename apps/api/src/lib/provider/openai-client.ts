import {
  ChatCompletionsV1StreamingResponseBody,
  type ChatCompletionsV1RequestBody,
} from '~/api/schemas/v1/chat';
import type { ProviderBaseClient } from './base-client';
import type { ChatCompletionCreateParams } from 'openai/resources';

export class OpenAIClient implements ProviderBaseClient {
  provider;
  credential;
  model;

  constructor(input: {
    provider: ProviderBaseClient['provider'];
    credential: ProviderBaseClient['credential'];
    model: ProviderBaseClient['model'];
  }) {
    this.provider = input.provider;
    this.credential = input.credential;
    this.model = input.model;
  }

  doGenerate(input: {
    request: ChatCompletionsV1RequestBody;
  }): PromiseLike<{ stream: ReadableStream<ChatCompletionsV1StreamingResponseBody> }> {
    throw new Error('Method not implemented.');
  }

  async doStream(input: {
    request: ChatCompletionsV1RequestBody;
  }): Promise<{ stream: ReadableStream<ChatCompletionsV1StreamingResponseBody> }> {
    const params: ChatCompletionCreateParams = {
      model: this.model.modelId,
      messages: input.request.messages,
      temperature: input.request.temperature,
      top_p: input.request.topP,
      stream: input.request.stream,
      stop: input.request.stop,
      max_tokens: input.request.maxOutputTokens,
      presence_penalty: input.request.presencePenalty,
      frequency_penalty: input.request.frequencyPenalty,
      user: input.request.user ?? undefined,
    };
    const response = await fetch(`${this.provider.baseUrl}${this.model.endpointPath}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.credential.value}`,
      },
      body: JSON.stringify(params),
    });
    if (!response.ok) {
      throw new Error(`OpenAI API request failed with status ${response.status}`);
    }

    const reader = response.body?.getReader();
    const stream = new ReadableStream<ChatCompletionsV1StreamingResponseBody>({
      pull: async (controller) => {
        if (!reader) {
          controller.close();
          return;
        }
        try {
          while (true) {
            const { done, value } = await reader.read();
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
      new TransformStream<
        ChatCompletionsV1StreamingResponseBody,
        ChatCompletionsV1StreamingResponseBody
      >({
        transform: (chunk, controller) => {
          controller.enqueue(chunk);
        },
      }),
    );
    return { stream };
  }
}
