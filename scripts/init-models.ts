import { program } from 'commander';
import { hc } from 'hono/client';
import type app from '~/api/index';

program.option('--url <url>');
program.parse();

const options = program.opts();

const client = hc<typeof app>(options.url);

const response = await client.internal.models.bulk.$post({
  json: {
    data: [
      {
        slug: 'gpt-5',
        providerSlug: 'openai',
        sharedSlug: 'openai/gpt-5',

        architecture_inputModalities: ['text', 'image'],
        architecture_outputModalities: ['text'],
        architecture_tokenizer: 'GPT',
        architecture_contextLength: 400000,
        architecture_maxOutputTokens: 128000,

        pricing_input: 1.25 / 1_000_000, // $1.25 / 1M
        pricing_inputCacheRead: 0.125 / 1_000_000, // $0.125 / 1M
        pricing_output: 10 / 1_000_000, // $10.00 / 1M
      },
      {
        slug: 'gpt-5-mini',
        providerSlug: 'openai',
        sharedSlug: 'openai/gpt-5-mini',

        architecture_inputModalities: ['text', 'image'],
        architecture_outputModalities: ['text'],
        architecture_tokenizer: 'GPT',
        architecture_contextLength: 400000,
        architecture_maxOutputTokens: 128000,

        pricing_input: 0.25 / 1_000_000, // $0.25 / 1M
        pricing_inputCacheRead: 0.025 / 1_000_000, // $0.025 / 1M
        pricing_output: 2 / 1_000_000, // $2.00 / 1M
      },
      {
        slug: 'gpt-5-nano',
        providerSlug: 'openai',
        sharedSlug: 'openai/gpt-5-nano',

        architecture_inputModalities: ['text', 'image'],
        architecture_outputModalities: ['text'],
        architecture_tokenizer: 'GPT',
        architecture_contextLength: 400000,
        architecture_maxOutputTokens: 128000,

        pricing_input: 0.05 / 1_000_000, // $0.05 / 1M
        pricing_inputCacheRead: 0.005 / 1_000_000, // $0.005 / 1M
        pricing_output: 0.4 / 1_000_000, // $0.40 / 1M
      },
    ],
  },
});
if (!response.ok) {
  console.error(
    'Failed to initialize providers:',
    response.statusText,
    await response.text(),
  );
  process.exit(1);
}

process.exit(0);
