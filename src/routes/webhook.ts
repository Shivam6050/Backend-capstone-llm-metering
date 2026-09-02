import express, { Router, Request, Response } from 'express';
import { handleStripeWebhook } from '../services/stripeService';

const webhookRouter = Router();

// Stripe webhook handler (requires raw Buffer body)
webhookRouter.post(
  '/webhooks/stripe',
  express.raw({ type: 'application/json' }),
  async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'] as string;

    if (!signature) {
      return res.status(400).json({
        success: false,
        error: 'MISSING_SIGNATURE',
        message: 'Stripe signature header (stripe-signature) is missing.',
      });
    }

    const payloadBuffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));
    const result = await handleStripeWebhook(payloadBuffer, signature);

    return res.status(result.status).json({
      success: result.status === 200,
      message: result.message,
    });
  }
);

export { webhookRouter };
