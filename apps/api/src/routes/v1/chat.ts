import { ChatCompletionRequest } from '~/core/schemas/openai';
import { factory } from '../../utils/factory';
import { validator } from '../../utils/validator';
import { RequestContextBuilder } from '../../lib/context';
import { ModelCapabilityMatcher } from '../../lib/models';
import { ProviderService } from '../../lib/providers';
import { RequestLogger, ResponseLogger, RoutingDecisionLogger } from '../../lib/logging';
import { StreamParser } from '../../lib/providers/stream-parser';
import { stream } from 'hono/streaming';
import { RequestContext as RequestContextSchema } from '~/core/schemas/provider';

const chatRoute = factory
  .createApp()
  .post('/completions', validator('json', ChatCompletionRequest), async (c) => {
    const request = c.req.valid('json');
    const db = c.get('db');
    const startTime = Date.now();

    // Initialize logging
    const requestLogger = new RequestLogger(db);
    const responseLogger = new ResponseLogger(db);
    const routingLogger = new RoutingDecisionLogger(db);

    // Build request context with model resolution
    const contextBuilder = new RequestContextBuilder(db, {
      enableApiKeyCache: true,
      enableModelCache: true,
    });
    const requestContext = await contextBuilder.buildContextWithModel(c, request.model);

    if (!requestContext) {
      return c.json(
        {
          error: {
            message: 'Invalid API key or model not found',
            type: 'authentication_error',
            code: 'invalid_request',
          },
        },
        401,
      );
    }

    // Create request log data
    const { requestData, messages } = RequestLogger.fromChatRequest(request, {
      teamId: requestContext.apiKey.team!.id,
      environmentId: requestContext.apiKey.environment!.id,
      apiKeyId: requestContext.apiKey.apiKey.id,
      userId: requestContext.apiKey.apiKey.userId || undefined,
      requestedModel: request.model,
    });

    // Log request and messages
    let requestId: string;
    try {
      requestId = await requestLogger.logRequest(requestData);
      await requestLogger.logMessages(requestId, messages);
    } catch (error) {
      console.error('Failed to log request:', error);
      return c.json(
        {
          error: {
            message: 'Logging failed',
            type: 'internal_server_error',
            code: 'logging_error',
          },
        },
        500,
      );
    }

    // Validate request against model capabilities
    const capabilityMatcher = new ModelCapabilityMatcher();
    const validation = capabilityMatcher.validateRequest(request, requestContext.model);

    if (!validation.valid) {
      // Log validation failure
      await requestLogger.updateRequestStatus(
        requestId,
        'failed',
        Date.now() - startTime,
        'validation_error',
      );

      return c.json(
        {
          error: {
            message: `Request validation failed: ${validation.errors.join(', ')}`,
            type: 'invalid_request_error',
            code: 'invalid_parameters',
          },
        },
        400,
      );
    }

    // TODO: Implement core routing logic:
    // 1. ✅ Extract API key and resolve team/environment context
    // 2. ✅ Resolve model alias to concrete provider model
    // 3. Apply routing policies and rules
    // 4. Check quotas and rate limits
    // 5. ✅ Forward to provider
    // 6. ✅ Log request/response
    // 7. ✅ Track usage events

    // Log validation warnings if any
    if (validation.warnings.length > 0) {
      console.warn('Request validation warnings:', validation.warnings);
    }

    try {
      // Initialize provider service
      const providerService = new ProviderService(db);

      // Build request context for provider
      const providerContextData = {
        teamId: requestContext.apiKey.team!.id,
        environmentId: requestContext.apiKey.environment!.id,
        apiKeyId: requestContext.apiKey.apiKey.id,
        userId: requestContext.apiKey.apiKey.userId || undefined,
        ip: c.req.header('cf-connecting-ip') || c.req.header('x-forwarded-for') || 'unknown',
        userAgent: c.req.header('user-agent') || 'unknown',
      };

      // Validate the provider context
      const contextValidation = RequestContextSchema.safeParse(providerContextData);
      if (!contextValidation.success) {
        console.error('Provider context validation failed:', contextValidation.error);

        // Log context validation failure
        await requestLogger.updateRequestStatus(
          requestId,
          'failed',
          Date.now() - startTime,
          'context_validation_error',
        );

        return c.json(
          {
            error: {
              message: 'Invalid request context',
              type: 'internal_server_error',
              code: 'context_validation_error',
            },
          },
          500,
        );
      }

      const providerContext = contextValidation.data;

      // Log routing decision (currently using simple deterministic routing)
      const routingDecision = RoutingDecisionLogger.createDecision(
        {
          requestId,
          teamId: requestContext.apiKey.team!.id,
          environmentId: requestContext.apiKey.environment!.id,
          requestedModel: request.model,
        },
        {
          providerId: requestContext.model.provider.id,
          providerModelId: requestContext.model.providerModel.id,
          reason: 'deterministic', // For now, we only have deterministic routing
          metadata: {
            modelDisplayName: requestContext.model.model.displayName,
            providerName: requestContext.model.provider.name,
          },
        },
      );

      const routingDecisionId = await routingLogger.logRoutingDecision(routingDecision);

      // Update request with routing decision ID
      await requestLogger.updateRequestStatus(requestId, 'processing', undefined, undefined);

      // Check if this is a streaming request
      if (request.stream) {
        // Set streaming headers
        c.header('Content-Type', 'text/event-stream');
        c.header('Cache-Control', 'no-cache');
        c.header('Connection', 'keep-alive');
        
        // Handle streaming request
        return stream(c, async (streamWriter) => {
          const parser = new StreamParser();
          let fullResponse = '';
          let usage: any = null;
          
          try {
            // Execute streaming request through provider
            const providerStream = await providerService.executeStreamingRequest(
              request,
              requestContext.model.providerModel.id,
              providerContext,
            );

            const reader = providerStream.getReader();
            
            while (true) {
              const { done, value } = await reader.read();
              
              if (done) break;
              
              // Parse chunks from provider stream
              const chunks = parser.parseChunk(value);
              
              for (const chunk of chunks) {
                // Accumulate content for logging
                if (chunk.choices?.[0]?.delta?.content) {
                  fullResponse += chunk.choices[0].delta.content;
                }
                
                // Track usage information
                if (chunk.usage) {
                  usage = chunk.usage;
                }
                
                // Send chunk to client
                await streamWriter.write(StreamParser.formatSSEChunk(chunk));
              }
            }
            
            // Process any remaining buffer content
            const finalChunks = parser.finish();
            for (const chunk of finalChunks) {
              await streamWriter.write(StreamParser.formatSSEChunk(chunk));
            }
            
            // Send [DONE] signal
            await streamWriter.write(StreamParser.formatSSEEnd());
            
            const latencyMs = Date.now() - startTime;
            
            // Log successful streaming request
            await requestLogger.updateRequestStatus(requestId, 'completed', latencyMs);
            
            // Log response and create usage event for streaming
            const mockResponse = {
              choices: [{ message: { content: fullResponse } }],
              usage: usage || { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
            };
            
            const loggingContext = {
              requestId,
              providerModelId: requestContext.model.providerModel.id,
              teamId: requestContext.apiKey.team!.id,
              environmentId: requestContext.apiKey.environment!.id,
              apiKeyId: requestContext.apiKey.apiKey.id,
              providerId: requestContext.model.provider.id,
              modelId: requestContext.model.model.id,
              alias: request.model,
            };
            
            const { responseData, usageData } = ResponseLogger.fromChatResponse(mockResponse, loggingContext);
            
            await responseLogger.logResponse(responseData);
            await responseLogger.createUsageEvent(usageData);
            
            console.log('Streaming request processed successfully:', {
              requestId,
              provider: requestContext.model.provider.name,
              model: requestContext.model.model.displayName,
              latencyMs,
              usage,
            });
            
          } catch (error) {
            const latencyMs = Date.now() - startTime;
            
            console.error('Provider streaming execution failed:', error);
            
            // Log error
            await requestLogger.updateRequestStatus(requestId, 'failed', latencyMs, 'provider_error');
            
            // Log error response and usage event
            const loggingContext = {
              requestId,
              providerModelId: requestContext.model.providerModel.id,
              teamId: requestContext.apiKey.team!.id,
              environmentId: requestContext.apiKey.environment!.id,
              apiKeyId: requestContext.apiKey.apiKey.id,
              providerId: requestContext.model.provider.id,
              modelId: requestContext.model.model.id,
              alias: request.model,
            };
            
            const { responseData, usageData } = ResponseLogger.fromErrorResponse(
              error instanceof Error ? error : new Error('Unknown error'),
              loggingContext,
            );
            
            await responseLogger.logResponse(responseData);
            await responseLogger.createUsageEvent(usageData);
            
            // Send error as SSE
            await streamWriter.write(StreamParser.formatSSEChunk({
              choices: [{
                index: 0,
                delta: {},
                finish_reason: 'error'
              }]
            }));
            await streamWriter.write(StreamParser.formatSSEEnd());
          }
        }, async (err, streamWriter) => {
          // Error handler for streaming
          console.error('Streaming error:', err);
          await streamWriter.write('data: {"error": "Stream error occurred"}\n\n');
        });
      }

      // Handle non-streaming request (existing logic)
      const response = await providerService.executeRequest(
        request,
        requestContext.model.providerModel.id,
        providerContext,
      );

      const latencyMs = Date.now() - startTime;

      // Log successful request
      await requestLogger.updateRequestStatus(requestId, 'completed', latencyMs);

      // Log response and create usage event
      const loggingContext = {
        requestId,
        providerModelId: requestContext.model.providerModel.id,
        teamId: requestContext.apiKey.team!.id,
        environmentId: requestContext.apiKey.environment!.id,
        apiKeyId: requestContext.apiKey.apiKey.id,
        providerId: requestContext.model.provider.id,
        modelId: requestContext.model.model.id,
        alias: request.model,
      };

      const { responseData, usageData } = ResponseLogger.fromChatResponse(response, loggingContext);

      await responseLogger.logResponse(responseData);
      await responseLogger.createUsageEvent(usageData);

      // Log successful request for debugging
      console.log('Request processed successfully:', {
        requestId,
        provider: requestContext.model.provider.name,
        model: requestContext.model.model.displayName,
        latencyMs,
        usage: response.usage,
      });

      return c.json(response);
    } catch (error) {
      const latencyMs = Date.now() - startTime;

      console.error('Provider execution failed:', error);

      // Log error
      await requestLogger.updateRequestStatus(requestId, 'failed', latencyMs, 'provider_error');

      // Log error response and usage event
      const loggingContext = {
        requestId,
        providerModelId: requestContext.model.providerModel.id,
        teamId: requestContext.apiKey.team!.id,
        environmentId: requestContext.apiKey.environment!.id,
        apiKeyId: requestContext.apiKey.apiKey.id,
        providerId: requestContext.model.provider.id,
        modelId: requestContext.model.model.id,
        alias: request.model,
      };

      const { responseData, usageData } = ResponseLogger.fromErrorResponse(
        error instanceof Error ? error : new Error('Unknown error'),
        loggingContext,
      );

      await responseLogger.logResponse(responseData);
      await responseLogger.createUsageEvent(usageData);

      // Return error response
      return c.json(
        {
          error: {
            message: error instanceof Error ? error.message : 'Internal server error',
            type: 'internal_server_error',
            code: 'provider_error',
          },
        },
        500,
      );
    }
  });

export { chatRoute };
