# ⚡ Production-Grade Usage Metering, Quota & Billing Engine

[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Express.js](https://img.shields.io/badge/Express.js-4.x-lightgrey.svg)](https://expressjs.com/)
[![Prisma ORM](https://img.shields.io/badge/Prisma-ORM-2D3748.svg)](https://www.prisma.io/)
[![Vitest](https://img.shields.io/badge/Tests-20%2F20%20Passed-success.svg)](https://vitest.dev/)
[![Model Context Protocol](https://img.shields.io/badge/MCP-Enabled-purple.svg)](https://modelcontextprotocol.io/)

> **Repository**: [Shivam6050/Backend-capstone-llm-metering](https://github.com/Shivam6050/Backend-capstone-llm-metering.git)  
> A high-throughput, correct-by-construction usage metering, quota enforcement, integer money math calculation, Stripe integration, and Model Context Protocol (MCP) service built with **Node.js, Express, TypeScript, Prisma ORM, and React**.

---

## 📋 Table of Contents
1. [Architecture & Design System](#-architecture--design-system)
2. [Key Capabilities & Features](#-key-capabilities--features)
3. [Model Context Protocol (MCP) Server](#-model-context-protocol-mcp-server)
4. [Integer Micro-Cents Money Math](#-integer-micro-cents-money-math)
5. [Database Schema & Data Modeling](#-database-schema--data-modeling)
6. [API Specification & Endpoints](#-api-specification--endpoints)
7. [Interactive Visual Dashboard](#-interactive-visual-dashboard)
8. [Automated Test Suite](#-automated-test-suite)
9. [Quickstart & Local Setup](#-quickstart--local-setup)
10. [Deployment (Docker & Vercel)](#-deployment-docker--vercel)

---

## 🌟 Architecture & Design System

```
                                ┌──────────────────────────────────────┐
                                │   Clients / AI Agents / Stripe CLI   │
                                └──────────────────┬───────────────────┘
                                                   │
        ┌──────────────────────────────────────────┼──────────────────────────────────────────┐
        │ HTTP POST /generate                      │ HTTP GET /usage                          │ HTTP POST /webhooks/stripe
        │ HTTP POST /mcp (JSON-RPC)                │ HTTP GET /export/csv                     │ HTTP POST /checkout/session
        ▼                                          ▼                                          ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 Security & Middleware Gateway                                          │
│  - Helmet HTTP Security Headers (HSTS, CSP, XSS, Clickjacking prevention)                              │
│  - Anti-DDoS Rate Limiter (100 req/min IP-based rate limiting)                                         │
│  - Zod Request Schema Validation & Payload Sanitization                                                │
│  - X-Tenant-ID Header Extraction & Tenant Scoping Verification                                         │
│  - JWT Bearer Authentication & User Session Management                                                 │
└──────────┬───────────────────────────────────────┬───────────────────────────────────────┬─────────────┘
           │                                       │                                       │
           ▼                                       ▼                                       ▼
  ┌──────────────────┐                    ┌──────────────────┐                    ┌──────────────────┐
  │  Metering & Quota│                    │ Usage Rollup &   │                    │ Stripe Webhook   │
  │  Engine          │                    │ Analytics Engine │                    │ Handler          │
  └────────┬─────────┘                    └────────┬─────────┘                    └────────┬─────────┘
           │                                       │                                       │
           ▼                                       ▼                                       ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    Core Services & Domain Logic                                        │
│  - Idempotency Deduplicator (Prevents double-charging on network retries via IdempotencyRecords)      │
│  - Quota Boundary Enforcer (Returns 429 Quota Exceeded & 402 Payment Required for past due)            │
│  - Deterministic Micro-Cents Calculator (Integer precision: $1 = 1,000,000 micro-cents)                │
│  - Model Context Protocol (MCP) Server (Exposes 5 billing tools to AI assistants via JSON-RPC)         │
│  - Quota Exhaustion Predictor (Calculates run-rate, projected depletion dates, alert triggers)         │
│  - Real-Time Live Provider Pricing Sync (OpenAI, Anthropic, Gemini, DeepSeek, Groq, Mistral)            │
│  - Multi-Currency Conversion Engine (USD, EUR, GBP, INR, CAD, AUD, JPY)                                │
│  - Multi-Driver Cache System (Redis with automatic fallback to single-process In-Memory)               │
│  - Async SMTP Email Notification System (Quota warnings, invoices, password reset)                     │
└──────────────────────────────────────────────────┬─────────────────────────────────────────────────────┘
                                                   │
                                                   ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   Persistence Layer (Prisma ORM)                                       │
│    Tenants | Plans | Subscriptions | UsageEvents | IdempotencyRecords | Users | ProcessedWebhooks     │
└────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 🚀 Key Capabilities & Features

### 1. Idempotent Metering (No Double-Counting)
- `POST /generate` verifies the `Idempotency-Key` header against historical `IdempotencyRecord` entries before processing.
- Duplicate or retried client requests return cached status codes and payloads, recording **exactly one** `UsageEvent`. Zero risk of double-charging.

### 2. Boundary-Honest Quota Enforcement
- Enforces multi-tier plan limits (API calls and total tokens).
- **`429 Too Many Requests`**: Triggered when active plan allowances are exhausted.
- **`402 Payment Required`**: Triggered when tenant subscription status is `past_due`, `canceled`, or `unpaid`.

### 3. Stripe Test Mode Integration & Deduplication
- Automated checkout session creation (`POST /checkout/session`) for `Free -> Pro` upgrades.
- **HMAC SHA-256 Signature Safety**: Rejects forged Stripe webhooks with `400 Bad Request`.
- **Webhook Deduplication**: Logs processed Stripe event IDs in `ProcessedWebhookEvent` to prevent duplicate plan upgrades.

### 4. Real-Time Provider Sync & Multi-Currency Support
- Synchronizes pricing models across 6 top providers: **OpenAI**, **Anthropic**, **Google Gemini**, **DeepSeek**, **Groq**, and **Mistral**.
- Real-time currency conversion supporting **USD ($)**, **EUR (€)**, **GBP (£)**, **INR (₹)**, **CAD ($)**, **AUD ($)**, and **JPY (¥)**.

### 5. Quota Exhaustion Predictor
- Analyzes 7-day and 30-day historical usage trends.
- Computes daily burn rates, remaining quota buffer, and projected depletion date to trigger proactive email alerts before service interruptions.

---

## 🤖 Model Context Protocol (MCP) Server

This project embeds a compliant **Model Context Protocol (MCP)** server (`/mcp` endpoint) allowing LLM agents (Claude Desktop, Cursor, Antigravity, custom agents) to inspect tenant usage, execute billable actions, and check quota status programmatically.

### Available MCP JSON-RPC Tools

| MCP Tool | Description | Parameters |
| :--- | :--- | :--- |
| `get_tenant_usage` | Fetch usage rollup and limits for a tenant | `tenantId` (string) |
| `calculate_cost` | Compute micro-cents cost for custom token amounts | `inputTokens`, `cachedInputTokens`, `outputTokens`, `reasoningTokens` |
| `check_quota` | Check whether a tenant has available quota | `tenantId`, `requestedTokens` |
| `simulate_billable_event` | Execute a metered event via MCP | `tenantId`, `prompt`, `inputTokens`, `outputTokens`, etc. |
| `predict_exhaustion` | Predict quota exhaustion date and burn rate | `tenantId` |

---

## 💰 Integer Micro-Cents Money Math

Floating-point math in financial systems leads to cumulative rounding errors. This engine calculates all money using **integer micro-cents**:

$$\text{1 USD (\$) = 1,000,000 Micro-Cents} \quad \Big( \text{1 Cent (\textcent) = 10,000 Micro-Cents} \Big)$$

### AI Token Pricing Rules (Default Model: GPT-4o Class)
- **Standard Input Tokens**: $\$2.50 \text{ / 1M tokens} = 2.5 \text{ micro-cents/token}$
- **Cached Input Tokens**: $50\% \text{ discount} = \$1.25 \text{ / 1M tokens} = 1.25 \text{ micro-cents/token}$
- **Standard Output Tokens**: $\$10.00 \text{ / 1M tokens} = 10.0 \text{ micro-cents/token}$
- **Reasoning Tokens**: Billed at output token rate ($10.0 \text{ micro-cents/token}$)

---

## 🗄️ Database Schema & Data Modeling

Built with **Prisma ORM** supporting SQLite for local zero-config setup and PostgreSQL for production deployments.

```prisma
// Core Data Entities
model Plan {
  id            String   @id
  name          String
  apiCallsLimit Int
  tokensLimit   Int
  priceCents    Int
  tenants       Tenant[]
}

model Tenant {
  id                 String              @id
  name               String
  email              String              @unique
  planId             String
  status             String              // active, past_due, canceled, unpaid
  stripeCustomerId   String?             @unique
  plan               Plan                @relation(fields: [planId], references: [id])
  subscriptions      Subscription[]
  usageEvents        UsageEvent[]
  idempotencyRecords IdempotencyRecord[]
}

model UsageEvent {
  id                String   @id @default(uuid())
  tenantId          String
  type              String   // api_call, ai_tokens
  apiCallsCount     Int      @default(1)
  inputTokens       Int      @default(0)
  cachedInputTokens Int      @default(0)
  outputTokens      Int      @default(0)
  reasoningTokens   Int      @default(0)
  totalTokens       Int      @default(0)
  costMicroCents    Int      @default(0)
  idempotencyKey    String?
  createdAt         DateTime @default(now())
}
```

---

## 🔌 API Specification & Endpoints

### 1. Execute Billable Action (`POST /generate`)
- **Headers**: `X-Tenant-ID: tenant_free`, `Idempotency-Key: key_12345`
- **Request**:
```json
{
  "tenantId": "tenant_free",
  "prompt": "Analyze dataset for anomaly detection",
  "inputTokens": 1000,
  "cachedInputTokens": 500,
  "outputTokens": 200,
  "reasoningTokens": 100
}
```
- **Response (`200 OK`)**:
```json
{
  "success": true,
  "data": {
    "usageEventId": "b1e72a45-9876-4321-a1b2-c3d4e5f67890",
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
      "microCents": 6125,
      "cents": 0,
      "usd": "$0.006125"
    }
  }
}
```

### 2. Get Usage Rollup (`GET /usage?tenantId=tenant_free`)
- **Response (`200 OK`)**:
```json
{
  "success": true,
  "tenantId": "tenant_free",
  "plan": "Free",
  "status": "active",
  "used": {
    "apiCalls": 45,
    "tokens": { "input": 12000, "cachedInput": 4000, "output": 3000, "reasoning": 1000, "total": 20000 }
  },
  "limits": { "apiCalls": 1000, "tokens": 100000 },
  "cost": { "totalMicroCents": 115000, "totalCents": 11, "formattedUsd": "$0.1150" }
}
```

### 3. Additional Key Endpoints
- `POST /checkout/session` — Create Stripe upgrade session.
- `POST /webhooks/stripe` — Cryptographic Stripe event listener.
- `POST /mcp` — Model Context Protocol JSON-RPC handler.
- `GET /export/csv?tenantId=...` — Export tenant usage logs to CSV.
- `GET /export/json?tenantId=...` — Export tenant usage logs to JSON.

---

## 🎨 Interactive Visual Dashboard

The repository includes a modern React single-page dashboard built with **Vite, Tailwind CSS, Three.js (3D canvas), and Recharts**:

- **3D Interactive Hero Canvas**: Animated GPU-rendered token visualization.
- **Real-Time Metering Simulator**: Interactively trigger billable API calls and observe real-time cost breakdowns.
- **Provider Grid & Live Pricing Sync**: Toggle models across OpenAI, Anthropic, Gemini, DeepSeek, Groq, and Mistral.
- **Quota Exhaustion Visualizer**: View real-time burn rates, health scores, and depletion projections.
- **MCP Client Modal**: Interactive debugger to run JSON-RPC tools against `/mcp`.

---

## 🧪 Automated Test Suite

The project features a **100% passing Vitest test suite** with 20 unit/integration tests across 6 domain suites:

```bash
npm test
```

### Test Coverage Results
```
 ✓ tests/pricing.test.ts   (4 tests) - Integer money math & discount calculations
 ✓ tests/mcp.test.ts       (6 tests) - MCP JSON-RPC server tools & error handling
 ✓ tests/security.test.ts  (3 tests) - Rate limiting, Helmet security, Zod validation
 ✓ tests/quota.test.ts     (3 tests) - Boundary 429 quota limit & 402 payment status
 ✓ tests/stripe.test.ts    (3 tests) - Webhook signature verification & deduplication
 ✓ tests/metering.test.ts  (1 test)  - End-to-end idempotency deduplication probe

 Test Files  6 passed (6)
      Tests  20 passed (20)
```

---

## 🛠️ Quickstart & Local Setup

### Prerequisites
- **Node.js**: >= 18.0.0
- **npm**: >= 9.0.0

### 1. Clone & Install
```bash
git clone https://github.com/Shivam6050/Backend-capstone-llm-metering.git
cd Backend-capstone-llm-metering
npm install
```

### 2. Environment Setup
Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

### 3. Database Initialization & Seed
```bash
# Push Prisma schema to SQLite database
npm run db:push

# Seed plans (Free, Pro) and test tenants
npm run seed
```

### 4. Launch Application
```bash
# Start backend server & frontend client concurrently in development mode
npm run dev
```

- **Backend API**: `http://localhost:3000`
- **Frontend Dashboard**: `http://localhost:5173`

---

## 🐋 Deployment (Docker & Vercel)

### Docker Deployment
```bash
# Build and spin up containers
docker-compose up --build
```
Or execute the automated batch script on Windows:
```cmd
deploy-docker.bat
```

### Vercel Deployment
The repository includes a ready-to-deploy [`vercel.json`](file:///c:/Users/60shi/OneDrive/Desktop/backend%20capstone/vercel.json) configuration and serverless API entrypoint in [`api/index.ts`](file:///c:/Users/60shi/OneDrive/Desktop/backend%20capstone/api/index.ts).

```bash
npx vercel
```

---

## 📄 License

Distributed under the MIT License. Built for the FlyRank Backend Engineering Capstone.
nstall dependencies
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
