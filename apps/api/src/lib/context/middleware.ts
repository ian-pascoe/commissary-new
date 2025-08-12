import type { MiddlewareHandler } from 'hono';
import type { Env } from '../../types/hono';
import { RequestContextBuilder, type RequestContext } from './request-context-builder';

export type ContextMiddlewareOptions = {
  enableApiKeyCache?: boolean;
  cacheKeyPrefix?: string;
  cacheTtlSeconds?: number;
  requireAuth?: boolean;
};

/**
 * Middleware that resolves API key context and adds it to Hono context
 */
export function requestContextMiddleware(
  options: ContextMiddlewareOptions = {},
): MiddlewareHandler<Env & { Variables: { requestContext?: RequestContext } }> {
  return async (c, next) => {
    const db = c.get('db');
    const contextBuilder = new RequestContextBuilder(db, options);

    try {
      const requestContext = await contextBuilder.buildContext(c);

      if (options.requireAuth && !requestContext) {
        return c.json(
          {
            error: {
              message: 'Invalid or missing API key',
              type: 'authentication_error',
              code: 'invalid_api_key',
            },
          },
          401,
        );
      }

      if (requestContext) {
        c.set('requestContext', requestContext);
      }

      return next();
    } catch (error) {
      console.error('Request context middleware error:', error);

      if (options.requireAuth) {
        return c.json(
          {
            error: {
              message: 'Authentication failed',
              type: 'authentication_error',
              code: 'auth_failed',
            },
          },
          500,
        );
      }

      return next();
    }
  };
}
