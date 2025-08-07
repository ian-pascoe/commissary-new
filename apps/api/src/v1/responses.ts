import type { ResolverResult } from 'hono-openapi';
import { resolver } from 'hono-openapi/zod';
import type { OpenAPIV3 } from 'openapi-types';
import * as z from 'zod';

export const defaultResponses: {
  [key: string]:
    | OpenAPIV3.ReferenceObject
    | (OpenAPIV3.ResponseObject & {
        content?: {
          [key: string]: Omit<OpenAPIV3.MediaTypeObject, 'schema'> & {
            schema?:
              | OpenAPIV3.ReferenceObject
              | OpenAPIV3.SchemaObject
              | ResolverResult;
          };
        };
      });
} = {
  400: {
    description: 'Invalid request payload',
    content: {
      'application/json': {
        schema: resolver(z.object({ message: z.string() })),
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: resolver(z.object({ message: z.string() })),
      },
    },
  },
};
