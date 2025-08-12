import { factory } from '../utils/factory';

export const authRoute = factory
  .createApp()
  .on(['GET', 'POST'], '/**', (c) => c.get('auth').handler(c.req.raw));
