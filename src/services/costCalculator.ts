import { PRICING_CONFIG, PROVIDERS_CONFIG } from '../config/pricing.config';

export interface UsageInput {
  apiCallsCount?: number;
  inputTokens?: number;
  cachedInputTokens?: number;
  outputTokens?: number;
  reasoningTokens?: number;
  provider?: string;
}

export interface CostBreakdown {
  apiCallMicroCents: number;
  inputTokenMicroCents: number;
  cachedInputTokenMicroCents: number;
  outputTokenMicroCents: number;
  reasoningTokenMicroCents: number;
  totalMicroCents: number;
  totalCents: number;
  formattedUsd: string;
}

/**
 * Deterministic Integer Cost Calculator for Usage Metering.
 * Converts usage numbers into exact micro-cents and USD strings.
 */
export function calculateUsageCost(usage: UsageInput): CostBreakdown {
  const apiCalls = usage.apiCallsCount || 0;
  const input = usage.inputTokens || 0;
  const cachedInput = usage.cachedInputTokens || 0;
  const output = usage.outputTokens || 0;
  const reasoning = usage.reasoningTokens || 0;

  const providerCfg = (usage.provider && PROVIDERS_CONFIG[usage.provider]) || PROVIDERS_CONFIG.openai;

  const rates = providerCfg ? {
    inputTokenMicroCents: providerCfg.inputTokenMicroCents,
    cachedInputTokenMicroCents: providerCfg.cachedInputTokenMicroCents,
    outputTokenMicroCents: providerCfg.outputTokenMicroCents,
    reasoningTokenMicroCents: providerCfg.reasoningTokenMicroCents,
  } : PRICING_CONFIG.rates;

  const apiCallCost = Math.round(apiCalls * PRICING_CONFIG.rates.apiCallMicroCents);
  const inputCost = Math.round((input / 1000) * rates.inputTokenMicroCents);
  const cachedInputCost = Math.round((cachedInput / 1000) * rates.cachedInputTokenMicroCents);
  const outputCost = Math.round((output / 1000) * rates.outputTokenMicroCents);
  const reasoningCost = Math.round((reasoning / 1000) * rates.reasoningTokenMicroCents);

  const totalMicroCents = apiCallCost + inputCost + cachedInputCost + outputCost + reasoningCost;
  const totalCents = Math.round(totalMicroCents / 10000);
  const formattedUsd = `$${(totalMicroCents / 1000000).toFixed(4)}`;

  return {
    apiCallMicroCents: apiCallCost,
    inputTokenMicroCents: inputCost,
    cachedInputTokenMicroCents: cachedInputCost,
    outputTokenMicroCents: outputCost,
    reasoningTokenMicroCents: reasoningCost,
    totalMicroCents,
    totalCents,
    formattedUsd,
  };
}

export function microCentsToCents(microCents: number): number {
  return Math.round(microCents / 10000);
}

export function microCentsToUsd(microCents: number): string {
  return `$${(microCents / 1000000).toFixed(4)}`;
}
