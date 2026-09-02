# Usage Metering & Billing Engine (`flyrank-capstone-metering-billing`)

> A production-grade usage metering, quota enforcement, money math calculation, and Stripe integration service built with Node.js, Express, TypeScript, and Prisma ORM.

---

## 🌟 Architecture Overview

```
                               ┌────────────────────────┐
                               │   Client / Stripe CLI  │
                               └───────────┬────────────┘
                                           │
       ┌───────────────────────────────────┼───────────────────────────────────┐
       │ HTTP POST /generate               │ HTTP GET /usage                   │ HTTP POST /webhooks/stripe
       ▼                                   ▼                                   ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                          Security & Middleware Gateway                            │
│  - Helmet HTTP Security Headers (HSTS, CSP, XSS, Clickjacking prevention)         │
│  - Rate Limiter (100 req/min anti-DDoS)                                           │
│  - Zod Request Schema Validation & Input Sanitization                             │
│  - X-Tenant-ID Header & Authorization Scoping                                     │
└──────────┬───────────────────────────────┬───────────────────────────────┬────────┘
           │                               │                               │
           ▼                               ▼                               ▼
  ┌─────────────────┐             ┌─────────────────┐             ┌────────────────────────┐
  │ Metering &      │             │ Usage & Cost    │             │ Stripe Webhook Handler │
  │ Quota Engine    │             │ Rollup Service  │             │ (Raw HMAC-SHA256 DUP) │
  └────────┬────────┘             └────────┬────────┘             └───────────┬────────────┘
           │                               │                                  │
           ▼                               ▼                                  ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                             Core Domain Logic Services                            │
│  - Idempotency Engine (Deduplicates retries via IdempotencyRecord)                │
│  - Quota Enforcement Engine (Enforces 429 Quota Exceeded & 402 Payment Required)  │
│  - Deterministic Integer Cost Calculator (Micro-cents precision, AI token rules)  │
│  - Stripe Sync Machine (Free <-> Pro plan upgrades, webhook deduplication)        │
└──────────────────────────────────────────┬────────────────────────────────────────┘
                                           │
                                           ▼
┌───────────────────────────────────────────────────────────────────────────────────┐
│                            Persistence Layer (SQLite / Postgres)                  │
│   Tenants | Plans | Subscriptions | UsageEvents | IdempotencyRecords               │
└───────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Features

1. **Idempotent Metering (Acceptance Probe 1)**
   - Retried requests with the same `Idempotency-Key` return identical original HTTP responses and record exactly **one** `UsageEvent`. Zero double-charging.

2. **Boundary-Honest Quota Enforcement (Acceptance Probe 2)**
   - Checks plan allowances before allowing billable actions.
   - Responds with `429 Too Many Requests` when plan limits are reached.
   - Responds with `402 Payment Required` when subscriptions are in `past_due`, `canceled`, or `unpaid` states.

3. **Stripe Test Mode Integration (Acceptance Probes 3 & 4)**
   - Creates checkout sessions for `Free -> Pro` upgrades.
   - Cryptographically verifies `stripe-signature` HMAC SHA-256 signatures, rejecting forged events with `400 Bad Request`.
   - Deduplicates incoming Stripe webhooks by `event.id`, preventing duplicate processing.

4. **Deterministic Integer Cost Calculator (Acceptance Probe 5)**
   - All monetary calculations are performed in integer micro-cents (`1 USD = 1,000,000 micro-cents`).
   - Supports complex AI token pricing: cached input tokens receive a 50% discount; reasoning tokens count as output tokens.

5. **Security Hardening**
   - Helmet HTTP headers, rate limiting, Zod validation, parameter sanitization, tenant isolation, and non-disclosing error handlers.

---

## 🛠️ Quickstart & Local Setup

### Prerequisites
- Node.js (>= 18)
- npm (>= 9)

### 1. Installation
```bash
# Clone repository and install dependencies
git clone https://github.com/your-username/flyrank-capstone-metering-billing.git
cd flyrank-capstone-metering-billing
npm install
```

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

### 3. Database Setup & Seed Data
Initialize the database schema and seed initial plans and demo tenants:
```bash
# Generate Prisma Client & Push SQLite schema
npm run db:push

# Seed plans (Free, Pro) and test tenants
npm run seed
```

### 4. Running the API Server
```bash
# Start production server
npm start

# Or start development mode with hot reload
npm run dev
```

Server runs on: `http://localhost:3000`

---

## 🧪 Running Automated Tests

Run the complete Vitest test suite covering all 5 Acceptance Probes and security tests:
```bash
npm test
```

Expected Output:
```
✓ tests/pricing.test.ts (4 tests)
✓ tests/metering.test.ts (1 test)
✓ tests/quota.test.ts (3 tests)
✓ tests/stripe.test.ts (4 tests)
✓ tests/security.test.ts (3 tests)

Test Files  5 passed (5)
     Tests  15 passed (15)
```

---

## 🐋 Docker Setup

Run via Docker Compose:
```bash
docker-compose up --build
```

---

## ⚠️ Honest Limitations Note

1. **Storage Backend**: Defaults to SQLite for zero-dependency execution and instantaneous testing. For production multi-instance scale, set `DATABASE_URL` to a PostgreSQL connection string.
2. **Stripe Test Mode**: Works in Stripe test mode (`sk_test_...` and `whsec_...`). Live cards and real money movements are intentionally disabled.
3. **Simulated AI Provider**: Model tokens are metered as exact numeric inputs without requiring external OpenAI / Anthropic API keys.
