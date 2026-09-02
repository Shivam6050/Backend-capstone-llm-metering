import { prisma } from '../db';

async function seed() {
  console.log('[Seed] Seeding database with initial plans and demo tenants...');

  // 1. Create/Update Plans
  const freePlan = await prisma.plan.upsert({
    where: { id: 'Free' },
    create: {
      id: 'Free',
      name: 'Free Plan',
      apiCallsLimit: 1000,
      tokensLimit: 100000, // 100k tokens
      priceCents: 0,
    },
    update: {
      apiCallsLimit: 1000,
      tokensLimit: 100000,
      priceCents: 0,
    },
  });

  const proPlan = await prisma.plan.upsert({
    where: { id: 'Pro' },
    create: {
      id: 'Pro',
      name: 'Pro Plan',
      apiCallsLimit: 50000,
      tokensLimit: 10000000, // 10M tokens
      priceCents: 2900,
    },
    update: {
      apiCallsLimit: 50000,
      tokensLimit: 10000000,
      priceCents: 2900,
    },
  });

  // 2. Create Demo Tenants
  const tenantFree = await prisma.tenant.upsert({
    where: { id: 'tenant_free' },
    create: {
      id: 'tenant_free',
      name: 'Acme Free Corp',
      email: 'free@acme.com',
      planId: 'Free',
      status: 'active',
    },
    update: {
      planId: 'Free',
      status: 'active',
    },
  });

  // Seed tenant near boundary (999 API calls used out of 1000 limit)
  const tenantBoundary = await prisma.tenant.upsert({
    where: { id: 'tenant_free_boundary' },
    create: {
      id: 'tenant_free_boundary',
      name: 'Boundary Tester Inc',
      email: 'boundary@tester.com',
      planId: 'Free',
      status: 'active',
    },
    update: {
      planId: 'Free',
      status: 'active',
    },
  });

  // Clear previous usage for boundary tenant to ensure exact 999 count
  await prisma.usageEvent.deleteMany({
    where: { tenantId: 'tenant_free_boundary' },
  });

  // Add initial usage event putting tenant_free_boundary at exactly 999 API calls
  await prisma.usageEvent.create({
    data: {
      tenantId: 'tenant_free_boundary',
      type: 'api_call',
      apiCallsCount: 999,
      totalTokens: 0,
      costMicroCents: 99900, // 999 * 100 micro-cents
    },
  });

  // Tenant with past_due status for 402 Payment Required testing
  const tenantLapsed = await prisma.tenant.upsert({
    where: { id: 'tenant_lapsed' },
    create: {
      id: 'tenant_lapsed',
      name: 'Lapsed Customer LLC',
      email: 'lapsed@customer.com',
      planId: 'Free',
      status: 'past_due',
    },
    update: {
      status: 'past_due',
    },
  });

  // Active Pro Tenant
  const tenantPro = await prisma.tenant.upsert({
    where: { id: 'tenant_pro' },
    create: {
      id: 'tenant_pro',
      name: 'Global Enterprise Corp',
      email: 'pro@global.com',
      planId: 'Pro',
      status: 'active',
    },
    update: {
      planId: 'Pro',
      status: 'active',
    },
  });

  console.log('[Seed] Database seeding completed successfully.');
  console.log(`- Plans: Free (${freePlan.apiCallsLimit} calls/mo), Pro (${proPlan.apiCallsLimit} calls/mo)`);
  console.log(`- Tenants: ${tenantFree.id}, ${tenantBoundary.id} (at 999 calls), ${tenantLapsed.id} (past_due), ${tenantPro.id}`);
}

seed()
  .catch((e) => {
    console.error('[Seed] Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
