import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/security';
import { recordUsageEvent } from '../services/meterService';
import { validateRequest } from '../middleware/validate';
import { verifyToken } from '../services/authService';
import { prisma } from '../db';
import { cacheService } from '../services/cacheService';

const billableRouter = Router();

const billableSchema = z.object({
  body: z.object({
    tenantId: z.string().optional().default('tenant_free'),
    provider: z.enum(['openai', 'claude', 'groq', 'deepseek', 'gemini', 'custom']).optional().default('openai'),
    prompt: z.string().optional(),
    inputTokens: z.number().int().nonnegative().optional().default(0),
    cachedInputTokens: z.number().int().nonnegative().optional().default(0),
    outputTokens: z.number().int().nonnegative().optional().default(0),
    reasoningTokens: z.number().int().nonnegative().optional().default(0),
    apiCallsCount: z.number().int().positive().optional().default(1),
  }),
});

async function handleBillableAction(req: AuthenticatedRequest, res: Response) {
  const tenantId = req.body.tenantId || req.tenantId || 'tenant_free';
  const idempotencyKey = (req.headers['idempotency-key'] || req.headers['Idempotency-Key'] || req.body?.idempotencyKey) as string | undefined;

  const {
    provider = 'openai',
    prompt = 'Simulated LLM prompt execution',
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
    apiCallsCount,
  } = req.body;

  const totalReqTokens = inputTokens + cachedInputTokens + outputTokens + reasoningTokens;
  const isAiTokensAction = totalReqTokens > 0;
  const type = isAiTokensAction ? 'ai_tokens' : 'api_call';

  // 1. Record usage event via Meter Service
  const result = await recordUsageEvent({
    tenantId,
    provider,
    idempotencyKey,
    endpoint: req.originalUrl,
    type,
    apiCallsCount,
    inputTokens,
    cachedInputTokens,
    outputTokens,
    reasoningTokens,
    payloadToReturn: {
      provider,
      generatedText: `[${provider.toUpperCase()} GATEWAY RESPONSE] Execution successful for prompt: "${prompt.substring(0, 60)}..."`,
      timestamp: new Date().toISOString(),
    },
  });

  // 2. If user is logged in, update matching user subscription in Prisma & clear cache
  let userToken = req.cookies?.token;
  if (!userToken && req.headers.authorization?.startsWith('Bearer ')) {
    userToken = req.headers.authorization.split(' ')[1];
  }

  if (userToken && result.statusCode === 200 && !result.isDuplicate) {
    const userPayload = verifyToken(userToken);
    if (userPayload) {
      const userSub = await prisma.userSubscription.findFirst({
        where: {
          userId: userPayload.userId,
          providerId: provider.toLowerCase(),
        },
      });

      if (userSub) {
        const tokensToAdd = totalReqTokens > 0 ? totalReqTokens : 1000;
        await prisma.userSubscription.update({
          where: { id: userSub.id },
          data: {
            tokensUsed: userSub.tokensUsed + tokensToAdd,
            apiCallsUsed: userSub.apiCallsUsed + 1,
          },
        });
        cacheService.delPattern(`user_subs_${userPayload.userId}`);
      }
    }
  }

  return res.status(result.statusCode).json(result.responseBody);
}

// Support both /api/v1/generate and /generate for probe compliance
billableRouter.post('/api/v1/generate', validateRequest(billableSchema), handleBillableAction);
billableRouter.post('/generate', validateRequest(billableSchema), handleBillableAction);

export { billableRouter };
