import { stream as honoStream } from 'hono/streaming';
import { ChatCompletionsV1RequestBody } from '~/api/schemas/v1/chat';
import { factory } from '~/api/utils/factory';
import { validator } from '~/api/utils/validator';

export const chatRoute = factory
  .createApp()
  .post(
    '/completions',
    validator('json', ChatCompletionsV1RequestBody),
    async (c) => {
      const db = c.get('db');
      const { stream } = c.req.valid('json');

      if (stream) {
        return honoStream(c, async (stream) => {});
      }

      return c.json({ message: 'Chat completion created successfully' });
    },
  );
