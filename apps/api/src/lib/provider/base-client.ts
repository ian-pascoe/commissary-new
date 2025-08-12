import type {
  ChatCompletionsV1RequestBody,
  ChatCompletionsV1StreamingResponseBody,
} from '~/api/schemas/v1/chat';
import type { ProviderModel } from '~/core/schemas/database';

export interface ProviderBaseClient {
  doGenerate(input: {
    model: ProviderModel;
    request: ChatCompletionsV1RequestBody;
  }): PromiseLike<{ stream: ReadableStream<ChatCompletionsV1StreamingResponseBody> }>;

  doStream(input: {
    model: ProviderModel;
    request: ChatCompletionsV1RequestBody;
  }): PromiseLike<{ stream: ReadableStream<ChatCompletionsV1StreamingResponseBody> }>;
}
