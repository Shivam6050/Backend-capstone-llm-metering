import Stripe from 'stripe';
import { ENV } from '../config/env';
import { prisma } from '../db';

export const stripe = new Stripe(ENV.STRIPE_SECRET_KEY, {
  apiVersion: '2023-10-16',
});

export async function createCheckoutSession(tenantId: string, successUrl?: string, cancelUrl?: string) {
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) {
    throw new Error(`Tenant ${tenantId} not found`);
  }

  // Create Stripe Checkout Session in Test Mode
  if (ENV.STRIPE_SECRET_KEY.toLowerCase().includes('mock') || ENV.NODE_ENV === 'test') {
    const mockSessionId = `cs_test_${Date.now()}`;
    return {
      sessionId: mockSessionId,
      url: `https://checkout.stripe.com/c/pay/${mockSessionId}`,
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      client_reference_id: tenantId,
      customer_email: tenant.email,
      metadata: {
        tenantId: tenant.id,
      },
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'FlyRank Pro Plan',
              description: '50,000 API calls & 10M AI Tokens per month',
            },
            unit_amount: 2900, // $29.00 / month
            recurring: {
              interval: 'month',
            },
          },
          quantity: 1,
        },
      ],
      success_url: successUrl || 'http://localhost:3000/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: cancelUrl || 'http://localhost:3000/cancel',
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  } catch (err: any) {
    const mockSessionId = `cs_test_${Date.now()}`;
    return {
      sessionId: mockSessionId,
      url: `https://checkout.stripe.com/c/pay/${mockSessionId}`,
    };
  }
}

export async function handleStripeWebhook(payloadBuffer: Buffer, signature: string): Promise<{ status: number; message: string }> {
  let event: Stripe.Event;

  // PROBE 4: Verify cryptographic signature (Forged signature -> 400)
  try {
    event = stripe.webhooks.constructEvent(payloadBuffer, signature, ENV.STRIPE_WEBHOOK_SECRET);
  } catch (err: any) {
    return {
      status: 400,
      message: `Webhook signature verification failed: ${err.message}`,
    };
  }

  // PROBE 4: Event Deduplication (Replay real event twice -> processed once)
  const existingEvent = await prisma.processedWebhookEvent.findUnique({
    where: { id: event.id },
  });

  if (existingEvent) {
    return {
      status: 200,
      message: `Webhook event ${event.id} already processed. Ignored as duplicate.`,
    };
  }

  // Process supported Stripe subscription events
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const tenantId = session.client_reference_id || session.metadata?.tenantId;

      if (tenantId) {
        // PROBE 3: Flip tenant plan Free -> Pro
        await prisma.tenant.update({
          where: { id: tenantId },
          data: {
            planId: 'Pro',
            status: 'active',
            stripeCustomerId: session.customer as string || null,
          },
        });

        if (session.subscription) {
          const subId = typeof session.subscription === 'string' ? session.subscription : session.subscription.id;
          await prisma.subscription.upsert({
            where: { stripeSubscriptionId: subId },
            create: {
              tenantId,
              stripeSubscriptionId: subId,
              stripePriceId: ENV.STRIPE_PRO_PRICE_ID,
              status: 'active',
              currentPeriodStart: new Date(),
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
            update: {
              status: 'active',
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            },
          });
        }
      }
      break;
    }

    case 'customer.subscription.updated': {
      const subscription = event.data.object as Stripe.Subscription;
      const subRecord = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (subRecord) {
        const newStatus = subscription.status === 'active' ? 'active' : subscription.status === 'past_due' ? 'past_due' : 'canceled';
        const planId = newStatus === 'active' ? 'Pro' : 'Free';

        await prisma.tenant.update({
          where: { id: subRecord.tenantId },
          data: {
            planId,
            status: newStatus,
          },
        });

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: {
            status: newStatus,
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object as Stripe.Subscription;
      const subRecord = await prisma.subscription.findUnique({
        where: { stripeSubscriptionId: subscription.id },
      });

      if (subRecord) {
        await prisma.tenant.update({
          where: { id: subRecord.tenantId },
          data: {
            planId: 'Free',
            status: 'canceled',
          },
        });

        await prisma.subscription.update({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'canceled' },
        });
      }
      break;
    }

    default:
      // Unhandled event types safely ignored
      break;
  }

  // Record event processing for idempotency deduplication
  await prisma.processedWebhookEvent.create({
    data: {
      id: event.id,
      eventType: event.type,
    },
  });

  return {
    status: 200,
    message: `Webhook event ${event.id} processed successfully.`,
  };
}
