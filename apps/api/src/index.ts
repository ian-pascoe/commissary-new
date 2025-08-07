import { openAPISpecs } from 'hono-openapi';
import { env } from './utils/env';
import { factory } from './utils/factory';
import { v1Route } from './v1/routes';

const app = factory.createApp().route('/v1', v1Route);

app.get('/doc', (c, next) =>
  openAPISpecs(app, {
    documentation: {
      info: {
        title: 'Commissary API',
        version: '1.0.0',
        description: 'API documentation for the Commissary application.',
      },
      servers: [{ url: env(c).API_URL, description: 'Commissary API Server' }],
    },
  })(c, next),
);

export default app;
