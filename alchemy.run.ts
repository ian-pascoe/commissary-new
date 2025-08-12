import { EndpointType } from '@neondatabase/api-client';
import alchemy from 'alchemy';
import { Hyperdrive, KVNamespace, Worker } from 'alchemy/cloudflare';
import { Container } from 'alchemy/docker';
import { Exec } from 'alchemy/os';
import { WebhookEndpoint } from 'alchemy/stripe';
import { NeonBranch, NeonProject } from './infra/resources/neon';

const project = 'commissary';
const baseDomain = 'commissary.dev';

export const app = await alchemy(project);

// Constants
const domain =
  app.stage === 'production'
    ? baseDomain
    : app.stage === 'development'
      ? `dev.${baseDomain}`
      : `${app.stage}.dev.${baseDomain}`;

// Database
let databaseUrl: string;
if (app.local) {
  await Container('database-container', {
    image: 'postgres:latest',
    restart: 'always',
    ports: [{ external: 5432, internal: 5432 }],
    environment: {
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'password',
      POSTGRES_DB: 'postgres',
    },
    start: true,
  });
  databaseUrl = 'postgresql://postgres:password@localhost:5432/postgres';
} else {
  const neonProject = await NeonProject('neon-project', {
    project: { name: project },
  });
  const neonBranch = await NeonBranch('neon-branch', {
    projectId: neonProject.project.id,
    branch: {
      name: `${project}-${app.stage}`,
    },
    endpoints: [{ type: EndpointType.ReadWrite }],
    adopt: true,
  });
  const host = neonBranch.endpoints[0]?.host;
  const databaseName = neonBranch.databases[0]?.name;
  const username = neonBranch.roles[0]?.name;
  const password = alchemy.secret(neonBranch.roles[0]?.password);
  if (!host || !databaseName || !username || !password) {
    throw new Error(
      `Neon host or database undefined: ${JSON.stringify({ host, databaseName, username, password })}`,
    );
  }

  databaseUrl = `postgresql://${username}:${password}@${host}/${databaseName}`;
}

await Exec('migrations', {
  command: 'bun run db:migrate',
  env: {
    DATABASE_URL: databaseUrl,
  },
  memoize: {
    patterns: ['./drizzle/migrations/*.sql'],
  },
});

const hyperdrive = await Hyperdrive('hyperdrive', {
  name: `${project}-${app.stage}`,
  origin: databaseUrl,
  dev: {
    origin: databaseUrl,
  },
});

// KV
const kv = await KVNamespace('kv', {
  title: `${project}-${app.stage}`,
});

// API
const apiDomain = `api.${domain}`;
const apiDevPort = 8787;
const apiUrl = app.local ? `http://localhost:${apiDevPort}` : `https://${apiDomain}`;
const stripeWebhookEndpoint = await WebhookEndpoint('stripe-webhook', {
  url: `https://${apiDomain}/stripe/webhook`,
  enabledEvents: ['*'],
  apiKey: alchemy.secret(process.env.STRIPE_SECRET_KEY),
});
export const api = await Worker('api', {
  cwd: './apps/api',
  entrypoint: 'src/index.ts',
  compatibilityFlags: ['nodejs_compat'],
  bindings: {
    DATABASE: hyperdrive,
    KV: kv,

    API_URL: apiUrl,

    STRIPE_PUBLIC_KEY: alchemy.secret(process.env.STRIPE_PUBLIC_KEY),
    STRIPE_SECRET_KEY: alchemy.secret(process.env.STRIPE_SECRET_KEY),
    STRIPE_WEBHOOK_SECRET: alchemy.secret(stripeWebhookEndpoint.secret),

    // AI Providers
    OPENAI_API_KEY: alchemy.secret(process.env.OPENAI_API_KEY),
  },
  domains: [apiDomain],
  dev: {
    port: apiDevPort,
  },
});

console.log({
  'API URL': apiUrl,
});

await app.finalize();
