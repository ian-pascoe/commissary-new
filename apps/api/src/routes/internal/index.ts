import { factory } from '../../utils/factory';
import { modelsRoute } from './models';
import { providersRoute } from './providers';

export const internalRoute = factory
  .createApp()
  .route('/providers', providersRoute)
  .route('/models', modelsRoute);
