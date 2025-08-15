import { eq } from 'drizzle-orm';
import { env } from '~/api/utils/env';
import { decrypt } from '~/core/utils/encryption';
import { providerCredentialsTable } from '~/drizzle/schema';
import { db } from '../database';
import { AnthropicClient } from './anthropic-client';
import type { ProviderBaseClient } from './base-client';
import { OpenAIClient } from './openai-client';

export async function createProviderClient(input: {
  provider: ProviderBaseClient['provider'];
  model: ProviderBaseClient['model'];
}): Promise<ProviderBaseClient> {
  const credentials = await db()
    .select()
    .from(providerCredentialsTable)
    .where(eq(providerCredentialsTable.providerId, input.provider.id));
  if (!credentials[0]) {
    throw new Error(
      `No credentials found for provider: ${input.provider.name}`,
    );
  }

  let credential = credentials[0];
  credential = {
    ...credential,
    value: await decrypt(credential.value, env().BETTER_AUTH_SECRET),
  };

  switch (input.model.apiSpec) {
    case 'openai':
      return new OpenAIClient({ ...input, credential: credentials[0] });

    case 'anthropic':
      return new AnthropicClient({ ...input, credential: credentials[0] });

    default:
      throw new Error(`Unsupported provider: ${input.provider.name}`);
  }
}
