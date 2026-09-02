import crypto from 'crypto';
import { prisma } from '../db';
import { calculateUsageCost } from './costCalculator';
import { evaluateQuota } from './quotaService';

export interface MeterRecordParams {
  tenantId: string;
  provider?: string;
  idempotencyKey?: string;
  endpoint: string;
  type: 'api_call' | 'ai_tokens';
  apiCallsCount?: number;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  payloadToReturn?: any;
}

export interface MeterRecordResult {
  isDuplicate: boolean;
  statusCode: number;
  responseBody: any;
  usageEventId?: string;
}

/**
 * Idempotent Meter Service.
 * Ensures billable requests are deduplicated by (tenantId, idempotencyKey).
 */
export async function recordUsageEvent(params: MeterRecordParams): Promise<MeterRecordResult> {
  const {
    tenantId,
    provider = 'openai',
    idempotencyKey,
    endpoint,
    type,
    apiCallsCount = 1,
    inputTokens = 0,
    cachedInputTokens = 0,
    outputTokens = 0,
    reasoningTokens = 0,
    payloadToReturn = {},
  } = params;

  // 1. Check for Idempotency Duplicate
  if (idempotencyKey) {
    const existingRecord = await prisma.idempotencyRecord.findUnique({
      where: {
        tenantId_key: {
          tenantId,
          key: idempotencyKey,
        },
      },
    });

    if (existingRecord) {
      return {
        isDuplicate: true,
        statusCode: existingRecord.statusCode,
        responseBody: JSON.parse(existingRecord.responseBody),
      };
    }
  }

  // 2. Evaluate Quota Boundaries
  const quotaResult = await evaluateQuota(tenantId, apiCallsCount, {
    input: inputTokens,
    cachedInput: cachedInputTokens,
    output: outputTokens,
    reasoning: reasoningTokens,
  });

  if (!quotaResult.allowed) {
    const errorBody = {
      success: false,
      error: quotaResult.errorCode,
      message: quotaResult.message,
      usage: quotaResult.usageSummary.used,
      limits: quotaResult.usageSummary.limits,
    };

    const statusCode = quotaResult.statusCode || 429;

    if (idempotencyKey) {
      await prisma.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          tenantId,
          endpoint,
          requestHash: crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex'),
          statusCode,
          responseBody: JSON.stringify(errorBody),
        },
      });
    }

    return {
      isDuplicate: false,
      statusCode,
      responseBody: errorBody,
    };
  }

  // 3. Calculate exact integer cost in micro-cents
  const costBreakdown = calculateUsageCost({
    provider,
    apiCallsCount,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
  });

  const totalTokens = inputTokens + cachedInputTokens + outputTokens + reasoningTokens;

  // 4. Atomically persist Usage Event & Idempotency Record
  const result = await prisma.$transaction(async (tx) => {
    const event = await tx.usageEvent.create({
      data: {
        tenantId,
        provider,
        type,
        apiCallsCount,
        inputTokens,
        cachedInputTokens,
        outputTokens,
        reasoningTokens,
        totalTokens,
        costMicroCents: costBreakdown.totalMicroCents,
        idempotencyKey: idempotencyKey || null,
      },
    });

    const successResponseBody = {
      success: true,
      data: {
        usageEventId: event.id,
        tenantId: event.tenantId,
        provider: event.provider,
        type: event.type,
        metrics: {
          apiCallsCount: event.apiCallsCount,
          inputTokens: event.inputTokens,
          cachedInputTokens: event.cachedInputTokens,
          outputTokens: event.outputTokens,
          reasoningTokens: event.reasoningTokens,
          totalTokens: event.totalTokens,
        },
        cost: {
          microCents: costBreakdown.totalMicroCents,
          cents: costBreakdown.totalCents,
          usd: costBreakdown.formattedUsd,
        },
        result: payloadToReturn,
      },
    };

    if (idempotencyKey) {
      await tx.idempotencyRecord.create({
        data: {
          key: idempotencyKey,
          tenantId,
          endpoint,
          requestHash: crypto.createHash('sha256').update(JSON.stringify(params)).digest('hex'),
          statusCode: 200,
          responseBody: JSON.stringify(successResponseBody),
        },
      });
    }

    return {
      usageEventId: event.id,
      responseBody: successResponseBody,
    };
  });

  return {
    isDuplicate: false,
    statusCode: 200,
    responseBody: result.responseBody,
    usageEventId: result.usageEventId,
  };
}
