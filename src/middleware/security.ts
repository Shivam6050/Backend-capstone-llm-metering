import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { Request, Response, NextFunction } from 'express';

// Helmet Security Headers Config
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
    },
  },
  crossOriginEmbedderPolicy: false,
});

// Rate Limiter to prevent DDoS & Abuse (100 requests per minute per IP)
export const globalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // Limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'TOO_MANY_REQUESTS',
    message: 'Rate limit exceeded. Please try again after 1 minute.',
  },
});

// Tenant Auth / ID Extraction & Isolation Middleware
export interface AuthenticatedRequest extends Request {
  tenantId?: string;
}

export function extractTenantId(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const tenantIdHeader = req.headers['x-tenant-id'] || req.query.tenantId || req.body?.tenantId;

  if (tenantIdHeader && typeof tenantIdHeader === 'string') {
    req.tenantId = tenantIdHeader.trim();
  }

  next();
}
