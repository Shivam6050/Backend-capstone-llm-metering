import { prisma } from '../db';
import { PRICING_CONFIG, PROVIDERS_CONFIG, ProviderConfig } from '../config/pricing.config';
import { calculateUsageCost } from './costCalculator';

export interface QuotaCheckResult {
  allowed: boolean;
  statusCode?: 429 | 402;
  errorCode?: 'QUOTA_EXCEEDED' | 'PAYMENT_REQUIRED';
  message?: string;
  usageSummary: {
    tenantId: string;
    plan: string;
    status: string;
    periodStart: string;
    periodEnd: string;
    used: {
      apiCalls: number;
      tokens: {
        input: number;
        cachedInput: number;
        output: number;
        reasoning: number;
        total: number;
      };
    };
    limits: {
      apiCalls: number;
      tokens: number;
    };
    cost: {
      totalMicroCents: number;
      totalCents: number;
      formattedUsd: string;
    };
  };
}

export interface ProviderUsageDetail {
  providerId: string;
  name: string;
  planName: string;
  model: string;
  monthlyTokensLimit: number;
  tokensUsed: number;
  tokensRemaining: number;
  percentUtilized: number;
  microCents: number;
  formattedUsd: string;
  status: 'active' | 'near_limit' | 'limit_reached';
}

export interface MultiProviderSummary {
  tenantId: string;
  totalMonthlySpendUsd: string;
  totalTokensUsedAcrossProviders: number;
  providers: ProviderUsageDetail[];
}

export async function getTenantMonthlyUsage(tenantId: string): Promise<QuotaCheckResult['usageSummary']> {
  const tenant = await prisma.tenant.findUnique({
    where: { id: tenantId },
    include: { plan: true },
  });

  if (!tenant) {
    throw new Error(`Tenant not found: ${tenantId}`);
  }

  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const events = await prisma.usageEvent.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  let usedApiCalls = 0;
  let usedInputTokens = 0;
  let usedCachedInputTokens = 0;
  let usedOutputTokens = 0;
  let usedReasoningTokens = 0;
  let usedTotalTokens = 0;
  let totalCostMicroCents = 0;

  for (const event of events) {
    usedApiCalls += event.apiCallsCount;
    usedInputTokens += event.inputTokens;
    usedCachedInputTokens += event.cachedInputTokens;
    usedOutputTokens += event.outputTokens;
    usedReasoningTokens += event.reasoningTokens;
    usedTotalTokens += event.totalTokens;
    totalCostMicroCents += event.costMicroCents;
  }

  const costBreakdown = calculateUsageCost({
    apiCallsCount: usedApiCalls,
    inputTokens: usedInputTokens,
    cachedInputTokens: usedCachedInputTokens,
    outputTokens: usedOutputTokens,
    reasoningTokens: usedReasoningTokens,
  });

  return {
    tenantId: tenant.id,
    plan: tenant.planId,
    status: tenant.status,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    used: {
      apiCalls: usedApiCalls,
      tokens: {
        input: usedInputTokens,
        cachedInput: usedCachedInputTokens,
        output: usedOutputTokens,
        reasoning: usedReasoningTokens,
        total: usedTotalTokens,
      },
    },
    limits: {
      apiCalls: tenant.plan.apiCallsLimit,
      tokens: tenant.plan.tokensLimit,
    },
    cost: {
      totalMicroCents: totalCostMicroCents || costBreakdown.totalMicroCents,
      totalCents: Math.round((totalCostMicroCents || costBreakdown.totalMicroCents) / 10000),
      formattedUsd: `$${((totalCostMicroCents || costBreakdown.totalMicroCents) / 1000000).toFixed(4)}`,
    },
  };
}

export async function getMultiProviderUsage(tenantId: string): Promise<MultiProviderSummary> {
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const events = await prisma.usageEvent.findMany({
    where: {
      tenantId,
      createdAt: {
        gte: periodStart,
        lte: periodEnd,
      },
    },
  });

  // Group usage events by provider
  const providerStats: Record<string, { totalTokens: number; costMicroCents: number }> = {
    openai: { totalTokens: 0, costMicroCents: 0 },
    claude: { totalTokens: 0, costMicroCents: 0 },
    groq: { totalTokens: 0, costMicroCents: 0 },
    deepseek: { totalTokens: 0, costMicroCents: 0 },
    gemini: { totalTokens: 0, costMicroCents: 0 },
  };

  let aggregatedMicroCents = 0;
  let aggregatedTokens = 0;

  for (const event of events) {
    const provId = event.provider || 'openai';
    if (!providerStats[provId]) {
      providerStats[provId] = { totalTokens: 0, costMicroCents: 0 };
    }
    providerStats[provId].totalTokens += event.totalTokens;
    providerStats[provId].costMicroCents += event.costMicroCents;

    aggregatedMicroCents += event.costMicroCents;
    aggregatedTokens += event.totalTokens;
  }

  const providers: ProviderUsageDetail[] = Object.keys(PROVIDERS_CONFIG).map((provKey) => {
    const cfg = PROVIDERS_CONFIG[provKey];
    const stat = providerStats[provKey] || { totalTokens: 0, costMicroCents: 0 };
    const tokensUsed = stat.totalTokens;
    const tokensRemaining = Math.max(0, cfg.monthlyTokensLimit - tokensUsed);
    const percentUtilized = Math.min(100, Math.round((tokensUsed / cfg.monthlyTokensLimit) * 100));

    let status: 'active' | 'near_limit' | 'limit_reached' = 'active';
    if (percentUtilized >= 100) status = 'limit_reached';
    else if (percentUtilized >= 80) status = 'near_limit';

    return {
      providerId: cfg.id,
      name: cfg.name,
      planName: cfg.planName,
      model: cfg.model,
      monthlyTokensLimit: cfg.monthlyTokensLimit,
      tokensUsed,
      tokensRemaining,
      percentUtilized,
      microCents: stat.costMicroCents,
      formattedUsd: `$${(stat.costMicroCents / 1000000).toFixed(4)}`,
      status,
    };
  });

  return {
    tenantId,
    totalMonthlySpendUsd: `$${(aggregatedMicroCents / 1000000).toFixed(4)}`,
    totalTokensUsedAcrossProviders: aggregatedTokens,
    providers,
  };
}

export async function evaluateQuota(
  tenantId: string,
  requestedApiCalls: number = 1,
  requestedTokens: {
    input?: number;
    cachedInput?: number;
    output?: number;
    reasoning?: number;
  } = {}
): Promise<QuotaCheckResult> {
  const usageSummary = await getTenantMonthlyUsage(tenantId);

  if (['past_due', 'canceled', 'unpaid'].includes(usageSummary.status)) {
    return {
      allowed: false,
      statusCode: 402,
      errorCode: 'PAYMENT_REQUIRED',
      message: `Tenant subscription is ${usageSummary.status}. Payment or upgrade is required to continue billable actions.`,
      usageSummary,
    };
  }

  const reqTotalTokens =
    (requestedTokens.input || 0) +
    (requestedTokens.cachedInput || 0) +
    (requestedTokens.output || 0) +
    (requestedTokens.reasoning || 0);

  const nextApiCalls = usageSummary.used.apiCalls + requestedApiCalls;
  const nextTokens = usageSummary.used.tokens.total + reqTotalTokens;

  if (nextApiCalls > usageSummary.limits.apiCalls) {
    return {
      allowed: false,
      statusCode: 429,
      errorCode: 'QUOTA_EXCEEDED',
      message: `Monthly API call limit reached (${usageSummary.used.apiCalls} / ${usageSummary.limits.apiCalls}). Upgrade to Pro plan for higher quota.`,
      usageSummary,
    };
  }

  if (nextTokens > usageSummary.limits.tokens) {
    return {
      allowed: false,
      statusCode: 429,
      errorCode: 'QUOTA_EXCEEDED',
      message: `Monthly token quota exceeded (${usageSummary.used.tokens.total} / ${usageSummary.limits.tokens}). Upgrade to Pro plan for higher quota.`,
      usageSummary,
    };
  }

  return {
    allowed: true,
    usageSummary,
  };
}
