import { factory } from '../utils/factory';

export const authRoute = factory.createApp().on(['GET', 'POST'], '/**', (c) => {
  return c.get('auth').handler(c.req.raw);
});
