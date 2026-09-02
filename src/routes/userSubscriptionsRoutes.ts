import { Router, Response } from 'express';
import { z } from 'zod';
import { prisma, ensureDbInitialized } from '../db';
import { cacheService } from '../services/cacheService';
import { requireUserAuth, UserAuthenticatedRequest } from '../middleware/authMiddleware';
import { validateRequest } from '../middleware/validate';
import { convertUsdToCurrency, CurrencyCode } from '../services/currencyService';
import { predictQuotaExhaustion } from '../services/exhaustionPredictor';
import { encryptString } from '../utils/crypto';

const userSubscriptionsRouter = Router();

const addSubscriptionSchema = z.object({
  body: z.object({
    providerId: z.string().min(1, 'providerId is required'),
    providerName: z.string().min(1, 'providerName is required'),
    planName: z.string().min(1, 'planName is required'),
    monthlyCostUsd: z.number().nonnegative().optional().default(0),
    monthlyTokenAllowance: z.number().int().positive().optional().default(1000000),
    apiKey: z.string().optional(),
  }),
});

// GET /api/v1/user/subscriptions (supports ?currency=USD|EUR|GBP|INR|JPY)
userSubscriptionsRouter.get('/', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    await ensureDbInitialized();
    const userId = req.user!.userId;
    const currency = ((req.query.currency as string) || 'USD').toUpperCase() as CurrencyCode;
    const cacheKey = `user_subs_${userId}_${currency}`;

    const cachedData = cacheService.get(cacheKey);
    if (cachedData) {
      return res.status(200).json({
        success: true,
        cached: true,
        data: cachedData,
      });
    }

    const subscriptions = await prisma.userSubscription.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    let totalMonthlySpendCents = 0;
    let totalTokensAllowance = 0;
    let totalTokensUsed = 0;

    const exhaustionPredictions: any[] = [];

    const items = subscriptions.map((sub) => {
      totalMonthlySpendCents += sub.monthlyCostCents;
      totalTokensAllowance += sub.monthlyTokenAllowance;
      totalTokensUsed += sub.tokensUsed;

      const tokensRemaining = Math.max(0, sub.monthlyTokenAllowance - sub.tokensUsed);
      const percentUtilized = Math.min(100, Math.round((sub.tokensUsed / sub.monthlyTokenAllowance) * 100));

      const costUsd = sub.monthlyCostCents / 100;
      const convertedCost = convertUsdToCurrency(costUsd, currency);

      const prediction = predictQuotaExhaustion(
        sub.id,
        sub.providerName,
        sub.monthlyTokenAllowance,
        sub.tokensUsed,
        10 // 10 days elapsed
      );

      if (prediction.alertLevel !== 'NORMAL') {
        exhaustionPredictions.push(prediction);
      }

      return {
        id: sub.id,
        providerId: sub.providerId,
        providerName: sub.providerName,
        planName: sub.planName,
        monthlyCostUsd: `$${costUsd.toFixed(2)}`,
        monthlyCostConverted: convertedCost.formatted,
        currencySymbol: convertedCost.symbol,
        monthlyCostCents: sub.monthlyCostCents,
        monthlyTokenAllowance: sub.monthlyTokenAllowance,
        tokensUsed: sub.tokensUsed,
        tokensRemaining,
        percentUtilized,
        hasApiKey: !!sub.encryptedApiKey,
        lastSyncedAt: sub.lastSyncedAt?.toISOString() || null,
        syncStatus: sub.syncStatus || (sub.encryptedApiKey ? 'IDLE' : 'NO_KEY'),
        balanceCents: sub.balanceCents,
        balanceUsd: sub.balanceCents !== null && sub.balanceCents !== undefined ? `$${(sub.balanceCents / 100).toFixed(2)}` : null,
        prediction,
        renewalDate: sub.renewalDate.toISOString(),
      };
    });

    const totalUsd = totalMonthlySpendCents / 100;
    const convertedTotal = convertUsdToCurrency(totalUsd, currency);

    const payload = {
      userId,
      currency,
      totalMonthlySpendUsd: `$${totalUsd.toFixed(2)}`,
      totalMonthlySpendConverted: convertedTotal.formatted,
      totalTokensAllowance,
      totalTokensUsed,
      totalTokensRemaining: Math.max(0, totalTokensAllowance - totalTokensUsed),
      exhaustionPredictions,
      subscriptions: items,
    };

    cacheService.set(cacheKey, payload, 30); // cache for 30s

    return res.status(200).json({
      success: true,
      cached: false,
      data: payload,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'FETCH_SUBSCRIPTIONS_FAILED',
      message: err.message,
    });
  }
});

// POST /api/v1/user/subscriptions (Add new subscription with optional encrypted API key)
userSubscriptionsRouter.post('/', requireUserAuth, validateRequest(addSubscriptionSchema), async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { providerId, providerName, planName, monthlyCostUsd, monthlyTokenAllowance, apiKey } = req.body;

    const monthlyCostCents = Math.round(monthlyCostUsd * 100);
    const renewalDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const encryptedApiKey = apiKey && apiKey.trim() ? encryptString(apiKey.trim()) : null;

    const subscription = await prisma.userSubscription.create({
      data: {
        userId,
        providerId: providerId.toLowerCase(),
        providerName,
        planName,
        monthlyCostCents,
        monthlyTokenAllowance,
        renewalDate,
        encryptedApiKey,
        syncStatus: encryptedApiKey ? 'IDLE' : 'NO_KEY',
      },
    });

    cacheService.delPattern(`user_subs_${userId}`);

    return res.status(201).json({
      success: true,
      message: 'Subscription added successfully',
      subscription,
      apiKeyEncrypted: !!encryptedApiKey,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: 'ADD_SUBSCRIPTION_FAILED',
      message: err.message,
    });
  }
});

// POST /api/v1/user/subscriptions/:id/sync (Trigger real-time upstream sync)
userSubscriptionsRouter.post('/:id/sync', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const { syncSubscriptionUsage } = await import('../services/providerSyncService');
    const result = await syncSubscriptionUsage(id, userId);

    return res.status(result.success ? 200 : 400).json(result);
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'SYNC_FAILED',
      message: err.message,
    });
  }
});

// POST /api/v1/user/subscriptions/sync-all (Batch sync all user providers)
userSubscriptionsRouter.post('/sync-all', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { syncAllUserSubscriptions } = await import('../services/providerSyncService');
    const result = await syncAllUserSubscriptions(userId);

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'BATCH_SYNC_FAILED',
      message: err.message,
    });
  }
});

// PATCH /api/v1/user/subscriptions/:id/key (Update provider API key)
userSubscriptionsRouter.patch('/:id/key', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { apiKey } = req.body;

    const sub = await prisma.userSubscription.findFirst({
      where: { id, userId },
    });

    if (!sub) {
      return res.status(404).json({ success: false, message: 'Subscription not found' });
    }

    const encryptedApiKey = apiKey && apiKey.trim() ? encryptString(apiKey.trim()) : null;
    await prisma.userSubscription.update({
      where: { id },
      data: {
        encryptedApiKey,
        syncStatus: encryptedApiKey ? 'IDLE' : 'NO_KEY',
      },
    });

    cacheService.delPattern(`user_subs_${userId}`);

    return res.status(200).json({
      success: true,
      message: encryptedApiKey ? 'API Key saved securely (AES-256 encrypted).' : 'API Key removed.',
      hasApiKey: !!encryptedApiKey,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'UPDATE_KEY_FAILED',
      message: err.message,
    });
  }
});

// DELETE /api/v1/user/subscriptions/:id
userSubscriptionsRouter.delete('/:id', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;

    const sub = await prisma.userSubscription.findFirst({
      where: { id, userId },
    });

    if (!sub) {
      return res.status(404).json({
        success: false,
        error: 'SUBSCRIPTION_NOT_FOUND',
        message: 'Subscription not found or access denied',
      });
    }

    await prisma.userSubscription.delete({ where: { id } });
    cacheService.delPattern(`user_subs_${userId}`);

    return res.status(200).json({
      success: true,
      message: 'Subscription removed',
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'DELETE_SUBSCRIPTION_FAILED',
      message: err.message,
    });
  }
});

// POST /api/v1/user/subscriptions/:id/meter
userSubscriptionsRouter.post('/:id/meter', requireUserAuth, async (req: UserAuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.userId;
    const { id } = req.params;
    const { tokensToMeter = 75000 } = req.body;

    const sub = await prisma.userSubscription.findFirst({
      where: { id, userId },
    });

    if (!sub) {
      return res.status(404).json({
        success: false,
        error: 'SUBSCRIPTION_NOT_FOUND',
        message: 'Subscription not found',
      });
    }

    const updated = await prisma.userSubscription.update({
      where: { id },
      data: {
        tokensUsed: sub.tokensUsed + Number(tokensToMeter),
        apiCallsUsed: sub.apiCallsUsed + 1,
      },
    });

    cacheService.delPattern(`user_subs_${userId}`);

    return res.status(200).json({
      success: true,
      message: `${tokensToMeter.toLocaleString()} tokens metered for ${sub.providerName}`,
      subscription: updated,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: 'METER_FAILED',
      message: err.message,
    });
  }
});

export { userSubscriptionsRouter };
