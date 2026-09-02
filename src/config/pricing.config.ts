/**
 * Pinned pricing configuration for Multi-Provider AI token metering and cost rollups.
 * All pricing rates are stored as integer micro-cents per unit.
 * 
 * 1 USD = 100 Cents = 1,000,000 Micro-cents
 * 1 Cent = 10,000 Micro-cents
 */

export interface ProviderConfig {
  id: 'openai' | 'claude' | 'groq' | 'deepseek' | 'gemini';
  name: string;
  planName: string;
  model: string;
  monthlyTokensLimit: number;
  inputTokenMicroCents: number;
  cachedInputTokenMicroCents: number;
  outputTokenMicroCents: number;
  reasoningTokenMicroCents: number;
  priceCents: number;
}

export const PROVIDERS_CONFIG: Record<string, ProviderConfig> = {
  openai: {
    id: 'openai',
    name: 'OpenAI (ChatGPT)',
    planName: 'ChatGPT Plus / Team',
    model: 'GPT-4o',
    monthlyTokensLimit: 2000000, // 2M tokens/mo
    inputTokenMicroCents: 250, // $2.50 / 1M
    cachedInputTokenMicroCents: 125, // $1.25 / 1M (50% off)
    outputTokenMicroCents: 1000, // $10.00 / 1M
    reasoningTokenMicroCents: 1000,
    priceCents: 2000, // $20/mo
  },
  claude: {
    id: 'claude',
    name: 'Anthropic (Claude)',
    planName: 'Claude Pro Plan',
    model: 'Claude 3.5 Sonnet',
    monthlyTokensLimit: 1500000, // 1.5M tokens/mo
    inputTokenMicroCents: 300, // $3.00 / 1M
    cachedInputTokenMicroCents: 150, // $1.50 / 1M
    outputTokenMicroCents: 1500, // $15.00 / 1M
    reasoningTokenMicroCents: 1500,
    priceCents: 2000, // $20/mo
  },
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    planName: 'LPU Speed Tier',
    model: 'Llama-3.3 70B Versatile',
    monthlyTokensLimit: 5000000, // 5M tokens/mo
    inputTokenMicroCents: 59, // $0.59 / 1M
    cachedInputTokenMicroCents: 30, // $0.30 / 1M
    outputTokenMicroCents: 79, // $0.79 / 1M
    reasoningTokenMicroCents: 79,
    priceCents: 0, // Pay-as-you-go
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek AI',
    planName: 'Developer API Plan',
    model: 'DeepSeek V3 / R1',
    monthlyTokensLimit: 10000000, // 10M tokens/mo
    inputTokenMicroCents: 14, // $0.14 / 1M
    cachedInputTokenMicroCents: 7, // $0.07 / 1M
    outputTokenMicroCents: 55, // $0.55 / 1M
    reasoningTokenMicroCents: 55,
    priceCents: 0,
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    planName: 'Gemini Advanced',
    model: 'Gemini 1.5 Pro',
    monthlyTokensLimit: 4000000, // 4M tokens/mo
    inputTokenMicroCents: 125, // $1.25 / 1M
    cachedInputTokenMicroCents: 62, // $0.62 / 1M
    outputTokenMicroCents: 500, // $5.00 / 1M
    reasoningTokenMicroCents: 500,
    priceCents: 2000, // $20/mo
  },
};

export const PRICING_CONFIG = {
  plans: {
    Free: {
      monthlyApiCalls: 1000,
      monthlyTokens: 100000,
      priceCents: 0,
    },
    Pro: {
      monthlyApiCalls: 50000,
      monthlyTokens: 10000000,
      priceCents: 2900,
    },
  },
  rates: {
    apiCallMicroCents: 100,
    inputTokenMicroCents: 250,
    cachedInputTokenMicroCents: 125,
    outputTokenMicroCents: 1000,
    reasoningTokenMicroCents: 1000,
  },
};
