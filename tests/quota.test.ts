import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app';
import { prisma } from '../src/db';

describe('PROBE 2: Quota Enforcement & Honest Boundary Status Codes (429 / 402)', () => {
  const boundaryTenantId = 'tenant_quota_boundary_test';
  const lapsedTenantId = 'tenant_quota_lapsed_test';

  beforeAll(async () => {
    await prisma.$connect();

    await prisma.plan.upsert({
      where: { id: 'Free' },
      create: { id: 'Free', name: 'Free', apiCallsLimit: 1000, tokensLimit: 100000, priceCents: 0 },
      update: { apiCallsLimit: 1000, tokensLimit: 100000 },
    });

    // Create tenant at 999 / 1000 calls
    await prisma.tenant.upsert({
      where: { id: boundaryTenantId },
      create: { id: boundaryTenantId, name: 'Boundary Quota Tenant', email: 'boundary_test@q.com', planId: 'Free', status: 'active' },
      update: { planId: 'Free', status: 'active' },
    });

    await prisma.usageEvent.deleteMany({ where: { tenantId: boundaryTenantId } });
    await prisma.idempotencyRecord.deleteMany({ where: { tenantId: boundaryTenantId } });

    await prisma.usageEvent.create({
      data: {
        tenantId: boundaryTenantId,
        type: 'api_call',
        apiCallsCount: 999,
        totalTokens: 0,
        costMicroCents: 99900,
      },
    });

    // Create tenant with past_due status
    await prisma.tenant.upsert({
      where: { id: lapsedTenantId },
      create: { id: lapsedTenantId, name: 'Lapsed Status Tenant', email: 'lapsed_test@q.com', planId: 'Free', status: 'past_due' },
      update: { status: 'past_due' },
    });
  });

  afterAll(async () => {
    await prisma.usageEvent.deleteMany({ where: { tenantId: boundaryTenantId } });
    await prisma.idempotencyRecord.deleteMany({ where: { tenantId: boundaryTenantId } });
    await prisma.tenant.delete({ where: { id: boundaryTenantId } }).catch(() => {});
    await prisma.tenant.delete({ where: { id: lapsedTenantId } }).catch(() => {});
    await prisma.$disconnect();
  });

  it('PROBE 2A: Request at exact quota boundary (1,000 / 1,000) succeeds', async () => {
    const res = await request(app)
      .post('/generate')
      .send({
        tenantId: boundaryTenantId,
        prompt: '1000th call at exact boundary limit',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });

  it('PROBE 2B: Request after boundary (1,001 / 1,000) returns HTTP 429 Too Many Requests', async () => {
    const res = await request(app)
      .post('/generate')
      .send({
        tenantId: boundaryTenantId,
        prompt: '1001st call exceeding quota boundary',
      });

    expect(res.status).toBe(429);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('QUOTA_EXCEEDED');
    expect(res.body.message).toContain('limit reached');
  });

  it('PROBE 2C: Request on a tenant with past_due status returns HTTP 402 Payment Required', async () => {
    const res = await request(app)
      .post('/generate')
      .send({
        tenantId: lapsedTenantId,
        prompt: 'Call on past_due subscription',
      });

    expect(res.status).toBe(402);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBe('PAYMENT_REQUIRED');
    expect(res.body.message).toContain('past_due');
  });
});
