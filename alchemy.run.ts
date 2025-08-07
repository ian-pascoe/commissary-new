import alchemy from 'alchemy';
import { D1Database, Worker } from 'alchemy/cloudflare';

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

const db = await D1Database('db', {
  migrationsDir: 'drizzle',
});

// API
const apiDomain = `api.${domain}`;
const apiDevPort = 8787;
const apiUrl = app.local
  ? `http://localhost:${apiDevPort}`
  : `https://${apiDomain}`;
export const api = await Worker('api', {
  cwd: 'apps/api',
  entrypoint: 'src/index.ts',
  compatibilityFlags: ['nodejs_compat'],
  bindings: {
    DB: db,
    API_URL: apiUrl,
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
