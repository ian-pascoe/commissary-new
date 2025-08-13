import type {
  ChatCompletionsV1RequestBody,
  ChatCompletionsV1StreamingResponseBody,
} from '~/api/schemas/v1/chat';
import type { Provider, ProviderCredential, ProviderModel } from '~/core/schemas/database';

export interface ProviderBaseClient {
  provider: Provider;
  credential: ProviderCredential;
  model: ProviderModel;

  doGenerate(input: {
    request: ChatCompletionsV1RequestBody;
  }): PromiseLike<{ stream: ReadableStream<ChatCompletionsV1StreamingResponseBody> }>;

  doStream(input: {
    request: ChatCompletionsV1RequestBody;
  }): PromiseLike<{ stream: ReadableStream<ChatCompletionsV1StreamingResponseBody> }>;
}
