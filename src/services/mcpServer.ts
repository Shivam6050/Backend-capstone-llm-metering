import { prisma } from '../db';
import { syncSubscriptionUsage, syncAllUserSubscriptions } from './providerSyncService';
import { calculateUsageCost } from './costCalculator';
import { PROVIDERS_CONFIG } from '../config/pricing.config';
import { predictQuotaExhaustion } from './exhaustionPredictor';

export interface McpJsonRpcRequest {
  jsonrpc: '2.0';
  id?: string | number | null;
  method: string;
  params?: any;
}

export interface McpJsonRpcResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
}

export const MCP_TOOLS = [
  {
    name: 'get_llm_usage',
    description: 'Retrieve real-time token quotas, metered usage, utilization percentages, and burn velocity for all tracked LLM subscriptions (OpenAI, Claude, Groq, DeepSeek, Gemini, etc.).',
    inputSchema: {
      type: 'object',
      properties: {
        userId: {
          type: 'string',
          description: 'Optional User ID to query. If omitted, queries the first active workspace.',
        },
        providerId: {
          type: 'string',
          description: 'Optional filter by provider (openai, claude, groq, deepseek, gemini).',
        },
      },
    },
  },
  {
    name: 'sync_provider_usage',
    description: 'Trigger a real-time telemetry sync with upstream LLM APIs (DeepSeek balance, Groq rate-limits, OpenRouter quotas, OpenAI credentials).',
    inputSchema: {
      type: 'object',
      properties: {
        subscriptionId: {
          type: 'string',
          description: 'Optional subscription ID to sync. If omitted, syncs all user subscriptions.',
        },
        userId: {
          type: 'string',
          description: 'Optional User ID.',
        },
      },
    },
  },
  {
    name: 'meter_llm_tokens',
    description: 'Directly meter tokens used by an AI agent or completion into FlyRank quotas in real-time.',
    inputSchema: {
      type: 'object',
      required: ['providerId', 'inputTokens', 'outputTokens'],
      properties: {
        providerId: {
          type: 'string',
          description: 'Target provider (openai, claude, groq, deepseek, gemini).',
        },
        inputTokens: {
          type: 'number',
          description: 'Fresh prompt input tokens.',
        },
        cachedInputTokens: {
          type: 'number',
          description: 'Cached input tokens (discounted rate).',
        },
        outputTokens: {
          type: 'number',
          description: 'Generated completion tokens.',
        },
        reasoningTokens: {
          type: 'number',
          description: 'Reasoning/thinking tokens (e.g. DeepSeek-R1 / OpenAI o1).',
        },
        userId: {
          type: 'string',
          description: 'Optional User ID.',
        },
      },
    },
  },
  {
    name: 'estimate_prompt_cost',
    description: 'Calculate the exact billable USD cost (with integer micro-cent precision) for a prompt across different LLM providers.',
    inputSchema: {
      type: 'object',
      required: ['provider', 'inputTokens', 'outputTokens'],
      properties: {
        provider: {
          type: 'string',
          description: 'Provider name (openai, claude, groq, deepseek, gemini).',
        },
        inputTokens: { type: 'number' },
        cachedInputTokens: { type: 'number' },
        outputTokens: { type: 'number' },
        reasoningTokens: { type: 'number' },
      },
    },
  },
  {
    name: 'list_supported_llms',
    description: 'List all supported LLM providers, official rate limits, token pricing models, and sync capabilities.',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

export async function handleMcpRequest(req: McpJsonRpcRequest, defaultUserId?: string): Promise<McpJsonRpcResponse> {
  const id = req.id ?? null;

  try {
    switch (req.method) {
      case 'initialize': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2024-11-05',
            capabilities: {
              tools: {},
            },
            serverInfo: {
              name: 'flyrank-mcp-server',
              version: '2.0.0',
            },
          },
        };
      }

      case 'notifications/initialized': {
        return {
          jsonrpc: '2.0',
          id,
          result: { initialized: true },
        };
      }

      case 'tools/list': {
        return {
          jsonrpc: '2.0',
          id,
          result: {
            tools: MCP_TOOLS,
          },
        };
      }

      case 'tools/call': {
        const { name, arguments: args = {} } = req.params || {};

        if (name === 'get_llm_usage') {
          const userId = args.userId || defaultUserId;
          const whereClause: any = {};
          if (userId) whereClause.userId = userId;
          if (args.providerId) whereClause.providerId = args.providerId.toLowerCase();

          const subs = await prisma.userSubscription.findMany({
            where: whereClause,
            orderBy: { createdAt: 'desc' },
          });

          const formatted = subs.map((s) => {
            const tokensRemaining = Math.max(0, s.monthlyTokenAllowance - s.tokensUsed);
            const percentUtilized = Math.min(100, Math.round((s.tokensUsed / s.monthlyTokenAllowance) * 100));
            const prediction = predictQuotaExhaustion(s.id, s.providerName, s.monthlyTokenAllowance, s.tokensUsed, 10);

            return {
              id: s.id,
              providerId: s.providerId,
              providerName: s.providerName,
              planName: s.planName,
              tokensUsed: s.tokensUsed,
              monthlyTokenAllowance: s.monthlyTokenAllowance,
              tokensRemaining,
              percentUtilized: percentUtilized + '%',
              syncStatus: s.syncStatus || 'IDLE',
              lastSyncedAt: s.lastSyncedAt?.toISOString() || null,
              balanceUsd: s.balanceCents !== null && s.balanceCents !== undefined ? '$' + (s.balanceCents / 100).toFixed(2) : null,
              predictedExhaustion: prediction.predictedExhaustionDate,
              burnVelocity: prediction.dailyVelocityTokens.toLocaleString() + ' tokens/day',
              recommendation: prediction.recommendation,
            };
          });

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify({ subscriptions: formatted, totalTracked: formatted.length }, null, 2),
                },
              ],
            },
          };
        }

        if (name === 'sync_provider_usage') {
          const userId = args.userId || defaultUserId;
          if (args.subscriptionId) {
            const syncRes = await syncSubscriptionUsage(args.subscriptionId, userId);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(syncRes, null, 2) }],
              },
            };
          } else if (userId) {
            const batchRes = await syncAllUserSubscriptions(userId);
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify(batchRes, null, 2) }],
              },
            };
          } else {
            return {
              jsonrpc: '2.0',
              id,
              result: {
                content: [{ type: 'text', text: JSON.stringify({ error: 'Please provide either subscriptionId or userId' }) }],
              },
            };
          }
        }

        if (name === 'meter_llm_tokens') {
          const {
            providerId,
            inputTokens = 0,
            cachedInputTokens = 0,
            outputTokens = 0,
            reasoningTokens = 0,
          } = args;

          const totalTokens = inputTokens + cachedInputTokens + outputTokens + reasoningTokens;
          const userId = args.userId || defaultUserId;

          let updatedSub = null;
          if (userId) {
            const sub = await prisma.userSubscription.findFirst({
              where: { userId, providerId: providerId.toLowerCase() },
            });

            if (sub) {
              updatedSub = await prisma.userSubscription.update({
                where: { id: sub.id },
                data: {
                  tokensUsed: sub.tokensUsed + totalTokens,
                  apiCallsUsed: sub.apiCallsUsed + 1,
                },
              });
            }
          }

          const costRes = calculateUsageCost({
            provider: providerId,
            inputTokens,
            cachedInputTokens,
            outputTokens,
            reasoningTokens,
          });

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      success: true,
                      meteredTokens: totalTokens,
                      costUsd: costRes.formattedUsd,
                      updatedSubscription: updatedSub
                        ? {
                            id: updatedSub.id,
                            tokensUsed: updatedSub.tokensUsed,
                            tokensRemaining: Math.max(0, updatedSub.monthlyTokenAllowance - updatedSub.tokensUsed),
                          }
                        : null,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          };
        }

        if (name === 'estimate_prompt_cost') {
          const {
            provider = 'openai',
            inputTokens = 0,
            cachedInputTokens = 0,
            outputTokens = 0,
            reasoningTokens = 0,
          } = args;

          const costRes = calculateUsageCost({
            provider,
            inputTokens,
            cachedInputTokens,
            outputTokens,
            reasoningTokens,
          });

          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      provider,
                      totalTokens: inputTokens + cachedInputTokens + outputTokens + reasoningTokens,
                      costMicroCents: costRes.totalMicroCents,
                      costUsd: costRes.formattedUsd,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          };
        }

        if (name === 'list_supported_llms') {
          return {
            jsonrpc: '2.0',
            id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      providers: Object.values(PROVIDERS_CONFIG).map((p) => ({
                        id: p.id,
                        name: p.name,
                        model: p.model,
                        monthlyTokensLimit: p.monthlyTokensLimit,
                        inputTokenMicroCents: p.inputTokenMicroCents,
                        outputTokenMicroCents: p.outputTokenMicroCents,
                        planName: p.planName,
                      })),
                      syncCapabilities: {
                        deepseek: 'Real-time HTTP balance & token quota sync (/user/balance)',
                        openrouter: 'Real-time key balance, usage, and rate-limit intervals (/api/v1/auth/key)',
                        groq: 'Real-time remaining rate-limit headers telemetry (x-ratelimit-remaining-tokens)',
                        openai: 'Organization and API key telemetry (/v1/models)',
                        gemini: 'Google AI Studio quota sync',
                      },
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          };
        }

        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: 'Method not found: ' + name,
          },
        };
      }

      default:
        return {
          jsonrpc: '2.0',
          id,
          error: {
            code: -32601,
            message: 'Unsupported MCP method: ' + req.method,
          },
        };
    }
  } catch (err: any) {
    return {
      jsonrpc: '2.0',
      id,
      error: {
        code: -32603,
        message: 'Internal MCP error: ' + err.message,
      },
    };
  }
}
