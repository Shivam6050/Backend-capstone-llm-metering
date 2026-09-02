import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/db';

describe('PROBE 1: Idempotent Metering & Duplicate Event Prevention', () => {
  const testTenantId = 'tenant_idempotency_test';

  beforeAll(async () => {
    await prisma.$connect();
    // Ensure test plan & tenant exist
    await prisma.plan.upsert({
      where: { id: 'Free' },
      create: { id: 'Free', name: 'Free', apiCallsLimit: 1000, tokensLimit: 100000, priceCents: 0 },
      update: {},
    });

    await prisma.tenant.upsert({
      where: { id: testTenantId },
      create: { id: testTenantId, name: 'Idempotency Test Tenant', email: 'idemp@test.com', planId: 'Free', status: 'active' },
      update: { status: 'active' },
    });

    // Clear previous usage events & idempotency records for clean test
    await prisma.usageEvent.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.idempotencyRecord.deleteMany({ where: { tenantId: testTenantId } });
  });

  afterAll(async () => {
    await prisma.usageEvent.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.idempotencyRecord.deleteMany({ where: { tenantId: testTenantId } });
    await prisma.tenant.delete({ where: { id: testTenantId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('PROBE 1: Send the same billable request twice with one idempotency key -> exactly 1 usage event recorded, second response mirrors the first', async () => {
    const idempotencyKey = `idem_key_${Date.now()}_${Math.random()}`;

    // First API call with idempotency key
    const res1 = await request(app)
      .post('/generate')
      .set('Idempotency-Key', idempotencyKey)
      .send({
        tenantId: testTenantId,
        prompt: 'Test prompt for Probe 1',
        inputTokens: 500,
        outputTokens: 200,
      });

    expect(res1.status).toBe(200);
    expect(res1.body.success).toBe(true);
    expect(res1.body.data.usageEventId).toBeDefined();

    const firstUsageEventId = res1.body.data.usageEventId;

    // Verify 1 usage event stored in DB
    const initialEvents = await prisma.usageEvent.findMany({ where: { tenantId: testTenantId } });
    expect(initialEvents.length).toBe(1);

    // Second API call with EXACT SAME idempotency key (retried request)
    const res2 = await request(app)
      .post('/generate')
      .set('Idempotency-Key', idempotencyKey)
      .send({
        tenantId: testTenantId,
        prompt: 'Test prompt for Probe 1',
        inputTokens: 500,
        outputTokens: 200,
      });

    expect(res2.status).toBe(200);
    expect(res2.body.success).toBe(true);
    // Response body must mirror the first response
    expect(res2.body.data.usageEventId).toBe(firstUsageEventId);

    // CRITICAL PROOF: Still exactly 1 usage event in database (no double-counting!)
    const finalEvents = await prisma.usageEvent.findMany({ where: { tenantId: testTenantId } });
    expect(finalEvents.length).toBe(1);
  });
});
