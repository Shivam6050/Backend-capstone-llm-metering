import { PrismaClient } from '@prisma/client';

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.VERCEL ? 'file:/tmp/dev.db' : 'file:./dev.db';
}

const globalForPrisma = global as unknown as { prisma: PrismaClient };

export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

let initPromise: Promise<void> | null = null;

export async function ensureDbInitialized(): Promise<void> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      const dbUrl = process.env.DATABASE_URL || '';
      const isSqlite = dbUrl.startsWith('file:') || dbUrl.startsWith('sqlite:');

      if (isSqlite) {
        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "User" (
            "id" TEXT PRIMARY KEY,
            "name" TEXT NOT NULL,
            "email" TEXT UNIQUE NOT NULL,
            "passwordHash" TEXT NOT NULL,
            "resetToken" TEXT,
            "resetTokenExpires" DATETIME,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Plan" (
            "id" TEXT PRIMARY KEY,
            "name" TEXT NOT NULL,
            "apiCallsLimit" INTEGER NOT NULL,
            "tokensLimit" INTEGER NOT NULL,
            "priceCents" INTEGER NOT NULL,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Tenant" (
            "id" TEXT PRIMARY KEY,
            "name" TEXT NOT NULL,
            "email" TEXT UNIQUE NOT NULL,
            "planId" TEXT NOT NULL,
            "status" TEXT DEFAULT 'active',
            "stripeCustomerId" TEXT UNIQUE,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "UserSubscription" (
            "id" TEXT PRIMARY KEY,
            "userId" TEXT NOT NULL,
            "providerId" TEXT NOT NULL,
            "providerName" TEXT NOT NULL,
            "planName" TEXT NOT NULL,
            "monthlyCostCents" INTEGER DEFAULT 0,
            "monthlyTokenAllowance" INTEGER DEFAULT 1000000,
            "tokensUsed" INTEGER DEFAULT 0,
            "apiCallsUsed" INTEGER DEFAULT 0,
            "renewalDate" DATETIME NOT NULL,
            "encryptedApiKey" TEXT,
            "lastSyncedAt" DATETIME,
            "syncStatus" TEXT DEFAULT 'IDLE',
            "balanceCents" INTEGER,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "Subscription" (
            "id" TEXT PRIMARY KEY,
            "tenantId" TEXT NOT NULL,
            "stripeSubscriptionId" TEXT UNIQUE NOT NULL,
            "stripePriceId" TEXT NOT NULL,
            "status" TEXT NOT NULL,
            "currentPeriodStart" DATETIME NOT NULL,
            "currentPeriodEnd" DATETIME NOT NULL,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP,
            "updatedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "UsageEvent" (
            "id" TEXT PRIMARY KEY,
            "tenantId" TEXT NOT NULL,
            "provider" TEXT DEFAULT 'openai',
            "type" TEXT NOT NULL,
            "apiCallsCount" INTEGER DEFAULT 1,
            "inputTokens" INTEGER DEFAULT 0,
            "cachedInputTokens" INTEGER DEFAULT 0,
            "outputTokens" INTEGER DEFAULT 0,
            "reasoningTokens" INTEGER DEFAULT 0,
            "totalTokens" INTEGER DEFAULT 0,
            "costMicroCents" INTEGER DEFAULT 0,
            "idempotencyKey" TEXT,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "IdempotencyRecord" (
            "id" TEXT PRIMARY KEY,
            "key" TEXT NOT NULL,
            "tenantId" TEXT NOT NULL,
            "endpoint" TEXT NOT NULL,
            "requestHash" TEXT NOT NULL,
            "statusCode" INTEGER NOT NULL,
            "responseBody" TEXT NOT NULL,
            "createdAt" DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        await prisma.$executeRawUnsafe(`
          CREATE TABLE IF NOT EXISTS "ProcessedWebhookEvent" (
            "id" TEXT PRIMARY KEY,
            "eventType" TEXT NOT NULL,
            "processedAt" DATETIME DEFAULT CURRENT_TIMESTAMP
          );
        `);

        // Seed Plans if empty
        const count = await prisma.plan.count();
        if (count === 0) {
          await prisma.plan.createMany({
            data: [
              { id: 'Free', name: 'Free Developer Plan', apiCallsLimit: 1000, tokensLimit: 100000, priceCents: 0 },
              { id: 'Pro', name: 'Pro Plan', apiCallsLimit: 50000, tokensLimit: 5000000, priceCents: 2900 },
            ],
          });
        }

        // Seed default tenants if empty
        const tenantCount = await prisma.tenant.count();
        if (tenantCount === 0) {
          await prisma.tenant.createMany({
            data: [
              { id: 'tenant_free', name: 'Acme Free Corp', email: 'dev@acme.com', planId: 'Free', status: 'active' },
              { id: 'tenant_pro', name: 'Stark Industries', email: 'tony@stark.com', planId: 'Pro', status: 'active' },
              { id: 'tenant_free_boundary', name: 'Boundary Test Corp', email: 'boundary@acme.com', planId: 'Free', status: 'active' },
              { id: 'tenant_past_due', name: 'Lapsed Corp', email: 'billing@lapsed.com', planId: 'Pro', status: 'past_due' },
            ],
          });
        }
      }
    } catch (err: any) {
      console.warn('[db] ensureDbInitialized non-fatal warning:', err?.message || err);
    }
  })();

  return initPromise;
}
