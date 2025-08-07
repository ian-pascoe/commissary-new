import { HTTPException } from 'hono/http-exception';
import { factory } from '../../utils/factory';
import { modelsRoute } from './models';
import { providersRoute } from './providers';

export const v1Route = factory
  .createApp()
  .route('/models', modelsRoute)
  .route('/providers', providersRoute)
  .onError((error, c) => {
    if (error instanceof HTTPException) {
      return c.json({ message: error.message }, error.status);
    }
    return c.json({ message: 'Internal Server Error' }, 500);
  });
