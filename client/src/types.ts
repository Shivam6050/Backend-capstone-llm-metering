export interface TenantOption {
  id: string;
  name: string;
  description: string;
}

export interface UsageSummary {
  tenantId: string;
  plan: 'Free' | 'Pro';
  status: 'active' | 'past_due' | 'canceled' | 'unpaid';
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
}

export interface ProviderUsageDetail {
  providerId: 'openai' | 'claude' | 'groq' | 'deepseek' | 'gemini';
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

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  usage?: any;
  limits?: any;
}
