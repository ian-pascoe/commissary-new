import { HTTPException } from 'hono/http-exception';
import { openAPISpecs } from 'hono-openapi';
import { internalModelsRoute } from './routes/internal/models';
import { internalProvidersRoute } from './routes/internal/providers';
import { v1ModelsRoute } from './routes/v1/models';
import { v1ProvidersRoute } from './routes/v1/providers';
import { env } from './utils/env';
import { factory } from './utils/factory';

const app = factory
  .createApp()
  .route('/internal/models', internalModelsRoute)
  .route('/internal/providers', internalProvidersRoute)
  .route('/v1/models', v1ModelsRoute)
  .route('/v1/providers', v1ProvidersRoute)
  .onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ message: error.message }, error.status);
    }
    return c.json({ message: 'Internal Server Error' }, 500);
  });

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
