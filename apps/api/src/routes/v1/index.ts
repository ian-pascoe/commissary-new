import { factory } from '../../utils/factory';
import { chatRoute } from './chat';

const v1Route = factory.createApp().route('/chat', chatRoute);

export { v1Route };
