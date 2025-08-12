import type { Database } from '../database';
import { eq, and, lte, gte, isNull, or } from 'drizzle-orm';
import { createId } from '~/core/utils/id';
import {
  responsesTable,
  usageEventsTable,
  priceBookTable,
} from '../../../../../drizzle/schema/general';

export interface ResponseLogData {
  requestId: string;
  providerModelId?: string;
  outputSize: number;
  finishReason?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  status: string;
}

export interface UsageEventData {
  requestId?: string;
  teamId: string;
  environmentId: string;
  apiKeyId?: string;
  providerId?: string;
  modelId?: string;
  providerModelId?: string;
  alias?: string;
  inputTokens?: number;
  outputTokens?: number;
  images?: number;
  audio?: number;
  costMicros?: number;
  currency?: string;
}

export class ResponseLogger {
  constructor(private db: Database) {}

  async logResponse(data: ResponseLogData): Promise<string> {
    const responseId = createId('resp');

    await this.db.insert(responsesTable).values({
      id: responseId,
      requestId: data.requestId,
      providerModelId: data.providerModelId,
      outputSize: data.outputSize,
      finishReason: data.finishReason,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      totalTokens: data.totalTokens,
      status: data.status,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return responseId;
  }

  async createUsageEvent(data: UsageEventData): Promise<string> {
    const eventId = createId('use');

    let costMicros = data.costMicros;
    let currency = data.currency;

    // Calculate cost if not provided and we have token data
    if (!costMicros && data.providerModelId && (data.inputTokens || data.outputTokens)) {
      const costResult = await this.calculateCost(
        data.providerModelId,
        data.inputTokens || 0,
        data.outputTokens || 0,
      );
      costMicros = costResult.costMicros;
      currency = costResult.currency;
    }

    await this.db.insert(usageEventsTable).values({
      id: eventId,
      requestId: data.requestId,
      teamId: data.teamId,
      environmentId: data.environmentId,
      apiKeyId: data.apiKeyId,
      providerId: data.providerId,
      modelId: data.modelId,
      providerModelId: data.providerModelId,
      alias: data.alias,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      images: data.images,
      audio: data.audio,
      costMicros,
      currency,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return eventId;
  }

  private async calculateCost(
    providerModelId: string,
    inputTokens: number,
    outputTokens: number,
  ): Promise<{ costMicros: number; currency: string }> {
    const now = new Date();

    // Query price book for current pricing
    const prices = await this.db
      .select()
      .from(priceBookTable)
      .where(
        and(
          eq(priceBookTable.providerModelId, providerModelId),
          or(isNull(priceBookTable.effectiveFrom), lte(priceBookTable.effectiveFrom, now)),
          or(isNull(priceBookTable.effectiveTo), gte(priceBookTable.effectiveTo, now)),
        ),
      );

    if (prices.length === 0) {
      return { costMicros: 0, currency: 'USD' };
    }

    let totalCostMicros = 0;
    const currency = prices[0]?.currency || 'USD';

    for (const price of prices) {
      switch (price.unit) {
        case 'token-input':
          totalCostMicros += Math.round((inputTokens * price.priceMicros) / 1000);
          break;
        case 'token-output':
          totalCostMicros += Math.round((outputTokens * price.priceMicros) / 1000);
          break;
        case 'request':
          totalCostMicros += price.priceMicros;
          break;
      }
    }

    return { costMicros: totalCostMicros, currency };
  }

  static fromChatResponse(
    response: any,
    context: {
      requestId: string;
      providerModelId?: string;
      teamId: string;
      environmentId: string;
      apiKeyId?: string;
      providerId?: string;
      modelId?: string;
      alias?: string;
    },
  ): { responseData: ResponseLogData; usageData: UsageEventData } {
    const responseSize = JSON.stringify(response).length;

    const responseData: ResponseLogData = {
      requestId: context.requestId,
      providerModelId: context.providerModelId,
      outputSize: responseSize,
      finishReason: response.choices?.[0]?.finish_reason,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
      totalTokens: response.usage?.total_tokens,
      status: 'completed',
    };

    const usageData: UsageEventData = {
      requestId: context.requestId,
      teamId: context.teamId,
      environmentId: context.environmentId,
      apiKeyId: context.apiKeyId,
      providerId: context.providerId,
      modelId: context.modelId,
      providerModelId: context.providerModelId,
      alias: context.alias,
      inputTokens: response.usage?.prompt_tokens,
      outputTokens: response.usage?.completion_tokens,
    };

    return { responseData, usageData };
  }

  static fromErrorResponse(
    error: Error,
    context: {
      requestId: string;
      providerModelId?: string;
      teamId: string;
      environmentId: string;
      apiKeyId?: string;
      providerId?: string;
      modelId?: string;
      alias?: string;
    },
  ): { responseData: ResponseLogData; usageData: UsageEventData } {
    const responseData: ResponseLogData = {
      requestId: context.requestId,
      providerModelId: context.providerModelId,
      outputSize: error.message.length,
      status: 'error',
    };

    const usageData: UsageEventData = {
      requestId: context.requestId,
      teamId: context.teamId,
      environmentId: context.environmentId,
      apiKeyId: context.apiKeyId,
      providerId: context.providerId,
      modelId: context.modelId,
      providerModelId: context.providerModelId,
      alias: context.alias,
      inputTokens: 0,
      outputTokens: 0,
    };

    return { responseData, usageData };
  }
}
