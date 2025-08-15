import type { ChatCompletionCreateParams } from 'openai/resources';
import type {
  ChatCompletionsV1NonStreamingResponseBody,
  ChatCompletionsV1RequestBody,
  ChatCompletionsV1StreamingResponseBody,
} from '~/api/schemas/v1/chat';
import type { ProviderBaseClient } from './base-client';

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

  async doGenerate(input: {
    request: ChatCompletionsV1RequestBody;
  }): Promise<{ data: ChatCompletionsV1NonStreamingResponseBody }> {
    const params: ChatCompletionCreateParams = {
      ...input.request,
      model: this.model.modelId,
      stream: false,
    };
    const response = await fetch(
      `${this.provider.baseUrl}${this.model.endpointPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.credential.value}`,
        },
        body: JSON.stringify(params),
      },
    );
    if (!response.ok) {
      throw new Error(
        `OpenAI API request failed with status ${response.status}`,
      );
    }

    const data =
      (await response.json()) as ChatCompletionsV1NonStreamingResponseBody;
    return { data };
  }

  async doStream(input: {
    request: ChatCompletionsV1RequestBody;
  }): Promise<{
    stream: ReadableStream<ChatCompletionsV1StreamingResponseBody>;
  }> {
    const params: ChatCompletionCreateParams = {
      ...input.request,
      model: this.model.modelId,
      stream: true,
    };
    const response = await fetch(
      `${this.provider.baseUrl}${this.model.endpointPath}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.credential.value}`,
        },
        body: JSON.stringify(params),
      },
    );
    if (!response.ok) {
      throw new Error(
        `OpenAI API request failed with status ${response.status}`,
      );
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
