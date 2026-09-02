import express from 'express';
import path from 'path';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { securityHeaders, globalRateLimiter, extractTenantId } from './middleware/security';
import { httpsRedirect } from './middleware/httpsRedirect';
import { errorHandler } from './middleware/errorHandler';
import { billableRouter } from './routes/billable';
import { usageRouter } from './routes/usage';
import { checkoutRouter } from './routes/checkout';
import { webhookRouter } from './routes/webhook';
import { authRouter } from './routes/authRoutes';
import { userSubscriptionsRouter } from './routes/userSubscriptionsRoutes';
import { exportRouter } from './routes/exportRoutes';
import { mcpRouter } from './routes/mcpRoutes';

const app = express();

// 0. Trust proxy headers from reverse proxies (Railway, Render, Nginx, etc.)
//    Required for correct IP detection behind load balancers and for HTTPS redirect
if (process.env.TRUST_PROXY) {
  app.set('trust proxy', parseInt(process.env.TRUST_PROXY, 10) || 1);
}

// 1. HTTPS Redirect (must be FIRST — before any other middleware)
app.use(httpsRedirect);

// 2. Security Headers & CORS — Explicit Origin Allowlist
app.use(securityHeaders);

const CORS_ORIGIN = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',').map((o) => o.trim())
  : ['http://localhost:3000', 'http://localhost:5173'];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow server-to-server requests (no origin header) and listed origins
      if (!origin || CORS_ORIGIN.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin '${origin}' is not allowed.`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Idempotency-Key', 'X-Tenant-Id'],
  })
);
app.use(globalRateLimiter);

// 2. Stripe Webhook (MUST be mounted BEFORE express.json to preserve raw Buffer)
app.use(webhookRouter);

// 3. Body Parsing & Cookie Middleware
app.use(express.json({ limit: '100kb' }));
app.use(express.urlencoded({ extended: true, limit: '100kb' }));
app.use(cookieParser());

// 4. Tenant ID Extraction Middleware
app.use(extractTenantId);

// 5. Health Check Endpoints
app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// 6. Application Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/user/subscriptions', userSubscriptionsRouter);
app.use('/api/v1/user/export', exportRouter);
app.use('/mcp', mcpRouter);
app.use('/api/v1/mcp', mcpRouter);
app.use(billableRouter);
app.use(usageRouter);
app.use(checkoutRouter);

// 7. Static Client Assets (React SPA)
const clientBuildPath = path.join(__dirname, '../client/dist');
app.use(express.static(clientBuildPath));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path === '/healthz' || req.path === '/generate' || req.path === '/usage' || req.path.startsWith('/mcp')) {
    return next();
  }
  res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
    if (err) {
      res.json({
        name: 'Usage Metering & Billing Engine API',
        status: 'healthy',
        version: '1.0.0',
      });
    }
  });
});

// 8. Global Error Handler
app.use(errorHandler);

export default app;
