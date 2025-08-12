export interface ProviderBaseClient {
  doStream<T>(input: T): Promise<void>;
}
