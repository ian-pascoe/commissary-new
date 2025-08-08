import { program } from 'commander';
import { hc } from 'hono/client';
import type app from '~/api/index';

if (!process.env.OPENAI_API_KEY) {
  console.error('Missing OPENAI_API_KEY environment variable');
  process.exit(1);
}

program.option('--url <url>');
program.parse();

const options = program.opts();

const client = hc<typeof app>(options.url);

const response = await client.internal.providers.bulk.$post({
  json: {
    data: [
      {
        slug: 'openai',
        name: 'OpenAI',
        description: 'OpenAI is an AI research and deployment company.',
        iconUrl: 'https://openai.com/favicon.ico',
        privacyPolicyUrl: 'https://openai.com/policies/privacy-policy',
        termsOfServiceUrl: 'https://openai.com/policies/terms-of-service',
        statusPageUrl: 'https://status.openai.com',
        mayLogPrompts: true,
        mayTrainOnData: true,
        isModerated: true,
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
