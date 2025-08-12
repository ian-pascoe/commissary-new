import type { ProviderFactory, ProviderClient, ProviderConfig, ProviderCredentials } from './types';
import { OpenAIProviderClient } from './openai-client';
import { AnthropicProviderClient } from './anthropic-client';
import { GoogleAIProviderClient } from './google-ai-client';
import { CohereProviderClient } from './cohere-client';

export class DefaultProviderFactory implements ProviderFactory {
  private static instance: DefaultProviderFactory;

  static getInstance(): DefaultProviderFactory {
    if (!DefaultProviderFactory.instance) {
      DefaultProviderFactory.instance = new DefaultProviderFactory();
    }
    return DefaultProviderFactory.instance;
  }

  createClient(provider: ProviderConfig, credentials: ProviderCredentials): ProviderClient {
    switch (provider.slug) {
      case 'openai':
        return new OpenAIProviderClient(provider, credentials);

      case 'anthropic':
        return new AnthropicProviderClient(provider, credentials);

      case 'google-ai':
        return new GoogleAIProviderClient(provider, credentials);

      case 'cohere':
        return new CohereProviderClient(provider, credentials);

      default:
        throw new Error(`Unsupported provider: ${provider.slug}`);
    }
  }

  supportsProvider(providerId: string): boolean {
    const supportedProviders = ['openai', 'anthropic', 'google-ai', 'cohere'];
    return supportedProviders.includes(providerId);
  }

  getSupportedProviders(): string[] {
    return ['openai', 'anthropic', 'google-ai', 'cohere'];
  }
}
