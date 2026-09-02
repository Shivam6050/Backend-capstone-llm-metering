import { Router, Response } from 'express';
import { z } from 'zod';
import { AuthenticatedRequest } from '../middleware/security';
import { createCheckoutSession } from '../services/stripeService';
import { validateRequest } from '../middleware/validate';

const checkoutRouter = Router();

const checkoutSchema = z.object({
  body: z.object({
    tenantId: z.string().min(1, 'tenantId is required'),
    successUrl: z.string().url().optional(),
    cancelUrl: z.string().url().optional(),
  }),
});

async function handleCheckoutSession(req: AuthenticatedRequest, res: Response) {
  const tenantId = req.body.tenantId || req.tenantId;

  try {
    const session = await createCheckoutSession(tenantId, req.body.successUrl, req.body.cancelUrl);
    return res.status(200).json({
      success: true,
      tenantId,
      sessionId: session.sessionId,
      checkoutUrl: session.url,
    });
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      error: 'CHECKOUT_SESSION_FAILED',
      message: error.message,
    });
  }
}

// Support both /api/v1/checkout/session and /checkout/session
checkoutRouter.post('/api/v1/checkout/session', validateRequest(checkoutSchema), handleCheckoutSession);
checkoutRouter.post('/checkout/session', validateRequest(checkoutSchema), handleCheckoutSession);

export { checkoutRouter };
