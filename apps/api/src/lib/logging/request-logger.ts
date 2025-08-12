import type { Database } from '../database';
import { eq } from 'drizzle-orm';
import { createId } from '~/core/utils/id';
import { requestsTable, messagesTable } from '../../../../../drizzle/schema/general';
import type { ChatCompletionRequest } from '~/core/schemas/openai';

export interface RequestLogData {
  teamId: string;
  environmentId: string;
  apiKeyId?: string;
  userId?: string;
  idempotencyKey?: string;
  requestType: 'chat' | 'completions' | 'embeddings' | 'images' | 'audio';
  requestedModel: string;
  inputSize: number;
  routingDecisionId?: string;
  status?: string;
  errorClass?: string;
  metadata?: Record<string, any>;
}

export interface MessageLogData {
  role: 'system' | 'user' | 'assistant' | 'tool' | 'function' | 'developer';
  content: any;
}

export class RequestLogger {
  constructor(private db: Database) {}

  async logRequest(data: RequestLogData): Promise<string> {
    const requestId = createId('req');

    await this.db.insert(requestsTable).values({
      id: requestId,
      teamId: data.teamId,
      environmentId: data.environmentId,
      apiKeyId: data.apiKeyId,
      userId: data.userId,
      idempotencyKey: data.idempotencyKey,
      requestType: data.requestType,
      requestedModel: data.requestedModel,
      inputSize: data.inputSize,
      routingDecisionId: data.routingDecisionId,
      status: data.status || 'pending',
      errorClass: data.errorClass,
      metadata: data.metadata,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return requestId;
  }

  async logMessages(requestId: string, messages: MessageLogData[]): Promise<void> {
    if (messages.length === 0) return;

    const messageRecords = messages.map((message) => ({
      id: createId('mess'),
      requestId,
      role: message.role,
      content: message.content,
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    await this.db.insert(messagesTable).values(messageRecords);
  }

  async updateRequestStatus(
    requestId: string,
    status: string,
    latencyMs?: number,
    errorClass?: string,
  ): Promise<void> {
    const updates: any = {
      status,
      updatedAt: new Date(),
    };

    if (latencyMs !== undefined) {
      updates.latencyMs = latencyMs;
    }

    if (errorClass !== undefined) {
      updates.errorClass = errorClass;
    }

    await this.db.update(requestsTable).set(updates).where(eq(requestsTable.id, requestId));
  }

  static fromChatRequest(
    request: ChatCompletionRequest,
    context: {
      teamId: string;
      environmentId: string;
      apiKeyId?: string;
      userId?: string;
      requestedModel: string;
      routingDecisionId?: string;
    },
  ): { requestData: RequestLogData; messages: MessageLogData[] } {
    const inputSize = JSON.stringify(request).length;

    const requestData: RequestLogData = {
      teamId: context.teamId,
      environmentId: context.environmentId,
      apiKeyId: context.apiKeyId,
      userId: context.userId,
      requestType: 'chat',
      requestedModel: context.requestedModel,
      inputSize,
      routingDecisionId: context.routingDecisionId,
      status: 'processing',
      metadata: {
        stream: request.stream,
        maxTokens: request.max_tokens,
        temperature: request.temperature,
        topP: request.top_p,
        frequencyPenalty: request.frequency_penalty,
        presencePenalty: request.presence_penalty,
        tools: request.tools?.length || 0,
        toolChoice: request.tool_choice,
      },
    };

    const messages: MessageLogData[] = request.messages.map((msg) => ({
      role: msg.role,
      content: msg.content,
    }));

    return { requestData, messages };
  }
}
