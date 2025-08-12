import { HTTPException } from 'hono/http-exception';
import { openAPISpecs } from 'hono-openapi';
import { authRoute } from './routes/auth';
import { internalRoute } from './routes/internal';
import { v1Route } from './routes/v1';
import { env } from './utils/env';
import { factory } from './utils/factory';

const app = factory
  .createApp()
  .route('/auth', authRoute)
  .route('/v1', v1Route)
  .route('/internal', internalRoute)
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
