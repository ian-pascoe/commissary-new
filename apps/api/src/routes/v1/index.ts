import { factory } from '../../utils/factory';
import { chatRoute } from './chat';

export const v1Route = factory.createApp().route('/chat', chatRoute);
