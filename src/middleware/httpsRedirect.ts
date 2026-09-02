import { Request, Response, NextFunction } from 'express';

/**
 * HTTPS Redirect Middleware
 *
 * In production: Forces all HTTP requests to redirect to HTTPS via 301.
 * Respects X-Forwarded-Proto header from reverse proxies (Nginx, Railway, Render, Heroku).
 * In development: passes through without redirect.
 */
export function httpsRedirect(req: Request, res: Response, next: NextFunction): void {
  if (process.env.NODE_ENV !== 'production' || process.env.VERCEL) {
    return next();
  }

  // Check X-Forwarded-Proto (set by reverse proxies like Nginx, Railway, Render)
  const proto = req.headers['x-forwarded-proto'] as string;
  const host = req.headers['host'] || '';

  if (proto && proto !== 'https') {
    const redirectUrl = `https://${host}${req.originalUrl}`;
    res.redirect(301, redirectUrl);
    return;
  }

  next();
}
