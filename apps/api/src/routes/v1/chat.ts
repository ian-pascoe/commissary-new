import { stream as honoStream } from 'hono/streaming';
import { ChatCompletionsRequest } from '~/api/schemas/chat';
import { factory } from '~/api/utils/factory';
import { validator } from '~/api/utils/validator';

export const chatRoute = factory
  .createApp()
  .post('/completions', validator('json', ChatCompletionsRequest), async (c) => {
    const db = c.get('db');
    const { stream } = c.req.valid('json');

    if (stream) {
      return honoStream(c, async (stream) => {
      });
    }

    return c.json({ message: 'Chat completion created successfully' });
  });
