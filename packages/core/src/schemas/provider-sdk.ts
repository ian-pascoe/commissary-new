import * as z from 'zod';

export const providerSdks = [
  '@ai-sdk/amazon-bedrock',
  '@ai-sdk/anthropic',
  '@ai-sdk/azure',
  '@ai-sdk/cerebras',
  '@ai-sdk/cohere',
  '@ai-sdk/deepgram',
  '@ai-sdk/deepinfra',
  '@ai-sdk/deepseek',
  '@ai-sdk/elevenlabs',
  '@ai-sdk/fal',
  '@ai-sdk/fireworks',
  '@ai-sdk/gateway',
  '@ai-sdk/gladia',
  '@ai-sdk/google',
  '@ai-sdk/google-vertex',
  '@ai-sdk/groq',
  '@ai-sdk/hume',
  '@ai-sdk/lmnt',
  '@ai-sdk/luma',
  '@ai-sdk/mistral',
  '@ai-sdk/openai',
  '@ai-sdk/openai-compatible',
  '@ai-sdk/perplexity',
  '@ai-sdk/replicate',
  '@ai-sdk/revai',
  '@ai-sdk/togetherai',
  '@ai-sdk/vercel',
  '@ai-sdk/xai',
] as const;

export const ProviderSdk = z.enum(providerSdks);
export type ProviderSdk = z.infer<typeof ProviderSdk>;
