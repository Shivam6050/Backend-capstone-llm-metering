import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import app from '../src/app';
import { prisma } from '../src/db';
import { ENV } from '../src/config/env';

function generateStripeSignature(payload: string, secret: string = ENV.STRIPE_WEBHOOK_SECRET): string {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const hmac = crypto.createHmac('sha256', secret).update(signedPayload).digest('hex');
  return `t=${timestamp},v1=${hmac}`;
}

describe('PROBE 3 & 4: Stripe Integration, Signature Verification & Event Deduplication', () => {
  const stripeTenantId = 'tenant_stripe_test';

  beforeAll(async () => {
    await prisma.$connect();

    await prisma.plan.upsert({
      where: { id: 'Free' },
      create: { id: 'Free', name: 'Free', apiCallsLimit: 1000, tokensLimit: 100000, priceCents: 0 },
      update: {},
    });

    await prisma.plan.upsert({
      where: { id: 'Pro' },
      create: { id: 'Pro', name: 'Pro', apiCallsLimit: 50000, tokensLimit: 10000000, priceCents: 2900 },
      update: {},
    });

    await prisma.tenant.upsert({
      where: { id: stripeTenantId },
      create: { id: stripeTenantId, name: 'Stripe Test Corp', email: 'stripe_test@acme.com', planId: 'Free', status: 'active' },
      update: { planId: 'Free', status: 'active' },
    });
  });

  afterAll(async () => {
    await prisma.processedWebhookEvent.deleteMany({});
    await prisma.tenant.delete({ where: { id: stripeTenantId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('PROBE 4A: Forged webhook (invalid signature) returns HTTP 400 Bad Request and changes nothing', async () => {
    const payload = JSON.stringify({
      id: 'evt_forged_123',
      type: 'checkout.session.completed',
      data: {
        object: {
          client_reference_id: stripeTenantId,
        },
      },
    });

    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', 't=1234567,v1=invalid_fake_signature_hash')
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('signature verification failed');

    // Verify tenant plan remains Free
    const tenant = await prisma.tenant.findUnique({ where: { id: stripeTenantId } });
    expect(tenant?.planId).toBe('Free');
  });

  it('PROBE 3 & 4B: Valid signed Stripe webhook flips tenant Free -> Pro and GET /usage reflects new limits', async () => {
    const eventId = `evt_test_checkout_${Date.now()}`;
    const payload = JSON.stringify({
      id: eventId,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_session_123',
          client_reference_id: stripeTenantId,
          customer: 'cus_test_customer_123',
          subscription: 'sub_test_subscription_123',
        },
      },
    });

    const validSignature = generateStripeSignature(payload);

    // Send valid webhook event
    const res = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', validSignature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verify tenant plan flipped to Pro in DB
    const tenant = await prisma.tenant.findUnique({ where: { id: stripeTenantId } });
    expect(tenant?.planId).toBe('Pro');
    expect(tenant?.status).toBe('active');

    // Verify GET /usage shows Pro limits (50,000 API calls)
    const usageRes = await request(app)
      .get('/usage')
      .query({ tenantId: stripeTenantId });

    expect(usageRes.status).toBe(200);
    expect(usageRes.body.plan).toBe('Pro');
    expect(usageRes.body.limits.apiCalls).toBe(50000);
    expect(usageRes.body.limits.tokens).toBe(10000000);

    // PROBE 4C: Replay the exact same webhook event twice -> processed once (ignored as duplicate)
    const replayRes = await request(app)
      .post('/webhooks/stripe')
      .set('stripe-signature', validSignature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(replayRes.status).toBe(200);
    expect(replayRes.body.message).toContain('already processed');
  });

  it('PROBE 3 Supplement: Stripe Checkout Session creation endpoint returns valid session payload', async () => {
    const res = await request(app)
      .post('/checkout/session')
      .send({ tenantId: stripeTenantId });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.sessionId).toBeDefined();
    expect(res.body.checkoutUrl).toBeDefined();
  });
});
