# Usage Metering & Billing Engine - Comprehensive Project Documentation

> **FlyRank Internship · Backend Development Track · Capstone Project**  
> *A Production-Grade Backend Service for Idempotent Usage Metering, Quota Enforcement, Integer Money Math, and Stripe Integration.*

---

## 📋 Table of Contents
1. [Executive Summary & Core Mission](#1-executive-summary--core-mission)
2. [System Architecture & Data Flow](#2-system-architecture--data-flow)
3. [Database Schema & Data Modeling](#3-database-schema--data-modeling)
4. [Deep-Dive: The 5 Acceptance Probes](#4-deep-dive-the-5-acceptance-probes)
   - [Probe 1: Idempotent Metering (No Double-Counting)](#probe-1-idempotent-metering-no-double-counting)
   - [Probe 2: Boundary-Honest Quotas (429 vs 402)](#probe-2-boundary-honest-quotas-429-vs-402)
   - [Probe 3: Stripe Test Mode Checkout & Sync](#probe-3-stripe-test-mode-checkout--sync)
   - [Probe 4: Webhook Signature Verification & Deduplication](#probe-4-webhook-signature-verification--deduplication)
   - [Probe 5: Integer Money Math & AI Pricing Rules](#probe-5-integer-money-math--ai-pricing-rules)
5. [Security Architecture & Defense-in-Depth](#5-security-architecture--defense-in-depth)
6. [API Specification & Endpoints](#6-api-specification--endpoints)
7. [6-Minute Final Demo Rehearsal Guide](#7-6-minute-final-demo-rehearsal-guide)
8. [Setup, Verification & Operations Guide](#8-setup-verification--operations-guide)

---

## 1. Executive Summary & Core Mission

Every modern Software-as-a-Service (SaaS) platform must answer three fundamental questions reliably:
1. **How much has this customer used?** (Usage Metering)
2. **Have they hit their plan limits?** (Quota Enforcement)
3. **How much should they pay?** (Cost Calculation & Billing)

Billing backend systems appear simple from the outside, but real-world network retries, duplicate webhooks, boundary limits, and rounding errors create critical vulnerabilities. A single bug can result in double-charging customers, leaking free access, or losing revenue.

This project delivers a **correct-by-construction, production-grade backend billing engine** built with **Node.js, Express, TypeScript, and Prisma ORM**. It guarantees **exactly-once metering**, **boundary-honest quota responses**, **integer money math precision**, **cryptographically verified Stripe webhook synchronization**, and **zero-trust HTTP security**.

---

## 2. System Architecture & Data Flow

The system is designed with strict separation of concerns into three distinct layers:
- **HTTP/API Gateway Layer**: Handles security headers (Helmet), rate limiting, Zod payload validation, and tenant extraction.
- **Domain & Business Logic Layer**: Executes idempotency deduplication, quota boundary checks, micro-cent cost calculations, and subscription state transitions.
- **Data Persistence Layer**: Manages relational entities in SQLite / PostgreSQL via Prisma ORM.

### Architecture Overview

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

### Request Flow Paths

1. **Billable Metering Path (`POST /generate`)**:
   - Check `Idempotency-Key` header against `IdempotencyRecord` table. If cached, replay original response (0 new usage events).
   - Evaluate tenant quota usage for the current billing cycle against plan limits.
   - If quota exceeded -> return `429 Too Many Requests`.
   - If subscription past due -> return `402 Payment Required`.
   - Calculate cost in integer micro-cents, persist `UsageEvent` and `IdempotencyRecord` inside an atomic database transaction.

2. **Usage Rollup Read Path (`GET /usage`)**:
   - Aggregate all `UsageEvent` records for tenant within current monthly cycle.
   - Compute current totals (API calls, fresh input tokens, cached input tokens, output tokens, reasoning tokens, total cost).
   - Return detailed JSON rollup comparing usage against plan limits.

3. **Payment Sync Path (`POST /webhooks/stripe`)**:
   - Intercept raw request buffer and verify `stripe-signature` using HMAC SHA-256.
   - Deduplicate event ID against `ProcessedWebhookEvent` table.
   - On `checkout.session.completed`, upgrade tenant plan from `Free` to `Pro` and activate subscription live.

---

## 3. Database Schema & Data Modeling

The data schema is modeled in `prisma/schema.prisma` with explicit tenant isolation and indexing.

```
PLAN (id: Free|Pro, name, apiCallsLimit, tokensLimit, priceCents)
  │
  └── TENANT (id, name, email, planId, status: active|past_due|canceled|unpaid, stripeCustomerId)
        ├── SUBSCRIPTION (id, tenantId, stripeSubscriptionId, stripePriceId, status, currentPeriodStart, currentPeriodEnd)
        ├── USAGE_EVENT (id, tenantId, type: api_call|ai_tokens, apiCallsCount, inputTokens, cachedInputTokens, outputTokens, reasoningTokens, totalTokens, costMicroCents, idempotencyKey, createdAt)
        └── IDEMPOTENCY_RECORD (id, key, tenantId, endpoint, requestHash, statusCode, responseBody)

PROCESSED_WEBHOOK_EVENT (id: Stripe Event ID, eventType, processedAt)
```

---

## 4. Deep-Dive: The 5 Acceptance Probes

### Probe 1: Idempotent Metering (No Double-Counting)
- **Challenge**: Network retries often resend requests when clients don't receive an immediate acknowledgment. Without idempotency, retries duplicate billing events and overcharge customers.
- **Solution**: The `Idempotency-Key` header is checked before executing any business logic. If an existing `(tenantId, idempotencyKey)` pair is found, the server immediately returns the cached response status and body without creating a new `UsageEvent`.

### Probe 2: Boundary-Honest Quotas (429 vs 402)
- **Challenge**: Systems must accurately distinguish between exceeding a plan's allowed usage vs an unpaid/lapsed subscription.
- **Solution**:
  - `429 Too Many Requests`: Returned when a tenant on an active plan reaches their monthly API call limit (e.g. 1,000 / 1,000) or token limit (100k / 100k).
  - `402 Payment Required`: Returned when a tenant's subscription status is `past_due`, `canceled`, or `unpaid`.

### Probe 3: Stripe Test Mode Checkout & Sync
- **Challenge**: Upgrading plans in Stripe must automatically synchronize tenant capabilities in the local database.
- **Solution**: Initiating a checkout session generates a Stripe Checkout URL with `client_reference_id = tenantId`. Upon payment completion, Stripe fires `checkout.session.completed`, updating the tenant's plan from `Free` to `Pro` and increasing monthly limits from 1,000 to 50,000 API calls.

### Probe 4: Webhook Signature Verification & Deduplication
- **Challenge**: Malicious attackers might post fake webhook calls to grant themselves free Pro access, or network delays might trigger duplicate webhooks.
- **Solution**:
  - **Signature Verification**: Raw request buffers are cryptographically verified using HMAC SHA-256 with the secret `STRIPE_WEBHOOK_SECRET`. Forged requests fail verification and return `400 Bad Request`.
  - **Deduplication**: `ProcessedWebhookEvent` stores processed event IDs. Replayed events return `200 OK` with a message indicating duplicate suppression.

### Probe 5: Integer Money Math & AI Pricing Rules
- **Challenge**: Floating point arithmetic (e.g. `0.1 + 0.2 = 0.30000000000000004`) causes accumulating financial errors. Additionally, AI model pricing has non-linear category rules.
- **Solution**:
  - All monetary values are represented as **integer micro-cents** (`1 USD = 1,000,000 micro-cents`, `1 Cent = 10,000 micro-cents`).
  - **Cached Input Tokens**: Billed at a 50% discount ($1.25 / 1M tokens vs $2.50 / 1M standard input tokens).
  - **Reasoning Tokens**: Billed at the output token rate ($10.00 / 1M tokens).

---

## 5. Security Architecture & Defense-in-Depth

The service implements multi-layered security controls to protect against penetration attacks:

| Security Control | Technology / Mechanism | Description |
| :--- | :--- | :--- |
| **HTTP Security Headers** | `helmet` | Enforces HSTS, Content Security Policy, X-Frame-Options (clickjacking), and X-Content-Type-Options (MIME sniffing). |
| **DDoS & Rate Limiting** | `express-rate-limit` | Restricts clients to 100 requests per minute per IP. |
| **Input Validation** | `zod` | Validates and sanitizes all incoming headers, params, query parameters, and JSON bodies. |
| **Tenant Isolation** | Database scoping | Scopes all queries by `tenantId` to prevent IDOR cross-tenant access. |
| **Signature Safety** | HMAC-SHA256 | Verifies Stripe webhooks against raw binary body buffers. |
| **Zero Disclosure** | Error handler | Swallows stack traces and raw DB errors in production responses. |

---

## 6. API Specification & Endpoints

### 1. Execute Billable Action (`POST /generate`)
- **Headers**: `Idempotency-Key` (optional, string), `X-Tenant-ID` (string)
- **Request Body**:
```json
{
  "tenantId": "tenant_free",
  "prompt": "Summarize standard financial agreement",
  "inputTokens": 1000,
  "cachedInputTokens": 500,
  "outputTokens": 200,
  "reasoningTokens": 100
}
```
- **Response (200 OK)**:
```json
{
  "success": true,
  "data": {
    "usageEventId": "3a9c7e2b-1234-5678-9abc-def012345678",
    "tenantId": "tenant_free",
    "type": "ai_tokens",
    "metrics": {
      "apiCallsCount": 1,
      "inputTokens": 1000,
      "cachedInputTokens": 500,
      "outputTokens": 200,
      "reasoningTokens": 100,
      "totalTokens": 1800
    },
    "cost": {
      "microCents": 612,
      "cents": 0,
      "usd": "$0.0006"
    }
  }
}
```

### 2. Get Usage & Cost Rollup (`GET /usage`)
- **Query Parameter**: `?tenantId=tenant_free`
- **Response (200 OK)**:
```json
{
  "success": true,
  "tenantId": "tenant_free",
  "plan": "Free",
  "status": "active",
  "used": {
    "apiCalls": 45,
    "tokens": {
      "input": 12000,
      "cachedInput": 4000,
      "output": 3000,
      "reasoning": 1000,
      "total": 20000
    }
  },
  "limits": {
    "apiCalls": 1000,
    "tokens": 100000
  },
  "cost": {
    "totalMicroCents": 11500,
    "totalCents": 1,
    "formattedUsd": "$0.0115"
  }
}
```

### 3. Create Stripe Checkout Session (`POST /checkout/session`)
- **Request Body**: `{ "tenantId": "tenant_free" }`
- **Response (200 OK)**:
```json
{
  "success": true,
  "tenantId": "tenant_free",
  "sessionId": "cs_test_a1b2c3d4",
  "checkoutUrl": "https://checkout.stripe.com/c/pay/cs_test_a1b2c3d4"
}
```

### 4. Stripe Webhook Endpoint (`POST /webhooks/stripe`)
- **Headers**: `stripe-signature: t=1724500000,v1=...`
- **Raw Body**: Stripe event JSON buffer.
- **Response (200 OK)**: `{ "success": true, "message": "Webhook event evt_123 processed successfully." }`

---

## 7. 6-Minute Final Demo Rehearsal Guide

Follow this step-by-step transcript during live evaluations or interviews:

1. **Step 1: Quota Refusal at Boundary**
   - Query `GET /usage?tenantId=tenant_free_boundary` -> show tenant is at 999/1,000 calls.
   - Execute `POST /generate` with `tenantId: tenant_free_boundary` -> succeeds (1,000th call).
   - Execute `POST /generate` again -> returns `429 Too Many Requests` with clear quota message.

2. **Step 2: Idempotency Retry Proof**
   - Execute `POST /generate` with `Idempotency-Key: demo_key_1001`.
   - Retry the identical request with `Idempotency-Key: demo_key_1001`.
   - Show database query proving usage event count did **not** increase.

3. **Step 3: Stripe Test Mode Upgrade**
   - Send `POST /webhooks/stripe` signed `checkout.session.completed` event for `tenant_free`.
   - Query `GET /usage?tenantId=tenant_free` -> observe live upgrade to `Pro` plan with 50,000 call limit.

4. **Step 4: Forged Webhook Rejection & Replay Protection**
   - Send `POST /webhooks/stripe` with invalid signature -> returns `400 Bad Request`.
   - Replay valid webhook event -> returns `200 OK` ("Ignored as duplicate").

5. **Step 5: Pinned Pricing Tests**
   - Run `npm test` on screen -> show all 14 tests green.

---

## 8. Setup, Verification & Operations Guide

### Installation & Environment Setup
```bash
# Install dependencies
npm install

# Initialize database schema and generate Prisma Client
npm run db:push

# Seed database with initial plans and demo tenants
npm run seed
```

### Running Automated Test Suite
```bash
npm test
```

### Building & Running Production Server
```bash
# Compile TypeScript
npm run build

# Start HTTP server
npm start
```

### Docker Compose
```bash
docker-compose up --build
```
