import { describe, it, expect } from 'vitest';
import { calculateUsageCost, microCentsToCents, microCentsToUsd } from '../src/services/costCalculator';
import { PRICING_CONFIG } from '../src/config/pricing.config';

describe('PROBE 5: Cost Calculation & Pinned AI Token Pricing Rules', () => {
  it('should price standard API calls correctly', () => {
    // 10 API calls = 10 * 100 micro-cents = 1,000 micro-cents
    const result = calculateUsageCost({ apiCallsCount: 10 });
    expect(result.apiCallMicroCents).toBe(1000);
    expect(result.totalMicroCents).toBe(1000);
  });

  it('should apply 50% discount on cached input tokens compared to fresh input tokens', () => {
    // 10,000 fresh input tokens @ 250 micro-cents/1k = 2,500 micro-cents
    const freshResult = calculateUsageCost({ inputTokens: 10000 });
    expect(freshResult.inputTokenMicroCents).toBe(2500);

    // 10,000 cached input tokens @ 125 micro-cents/1k = 1,250 micro-cents (50% discount)
    const cachedResult = calculateUsageCost({ cachedInputTokens: 10000 });
    expect(cachedResult.cachedInputTokenMicroCents).toBe(1250);

    expect(cachedResult.cachedInputTokenMicroCents).toBe(freshResult.inputTokenMicroCents / 2);
  });

  it('should count reasoning tokens as output tokens', () => {
    // 5,000 output tokens @ 1000 micro-cents/1k = 5,000 micro-cents
    const outputResult = calculateUsageCost({ outputTokens: 5000 });
    expect(outputResult.outputTokenMicroCents).toBe(5000);

    // 5,000 reasoning tokens @ 1000 micro-cents/1k = 5,000 micro-cents
    const reasoningResult = calculateUsageCost({ reasoningTokens: 5000 });
    expect(reasoningResult.reasoningTokenMicroCents).toBe(5000);

    expect(reasoningResult.reasoningTokenMicroCents).toBe(outputResult.outputTokenMicroCents);
  });

  it('should aggregate complex AI token usage into exact total micro-cents and USD strings', () => {
    // Usage: 100 API calls, 50,000 input, 20,000 cached input, 10,000 output, 5,000 reasoning
    // API calls: 100 * 100 = 10,000 micro-cents
    // Input: (50,000/1000) * 250 = 12,500 micro-cents
    // Cached Input: (20,000/1000) * 125 = 2,500 micro-cents
    // Output: (10,000/1000) * 1000 = 10,000 micro-cents
    // Reasoning: (5,000/1000) * 1000 = 5,000 micro-cents
    // Expected Total = 10,000 + 12,500 + 2,500 + 10,000 + 5,000 = 40,000 micro-cents ($0.0400 USD / 4 cents)
    const result = calculateUsageCost({
      apiCallsCount: 100,
      inputTokens: 50000,
      cachedInputTokens: 20000,
      outputTokens: 10000,
      reasoningTokens: 5000,
    });

    expect(result.apiCallMicroCents).toBe(10000);
    expect(result.inputTokenMicroCents).toBe(12500);
    expect(result.cachedInputTokenMicroCents).toBe(2500);
    expect(result.outputTokenMicroCents).toBe(10000);
    expect(result.reasoningTokenMicroCents).toBe(5000);
    expect(result.totalMicroCents).toBe(40000);
    expect(result.totalCents).toBe(4);
    expect(result.formattedUsd).toBe('$0.0400');
  });
});
