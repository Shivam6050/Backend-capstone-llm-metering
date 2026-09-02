import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  const statusCode = err.statusCode || err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Structured error logging — includes request context for tracing
  logger.error('Unhandled error', {
    method: req.method,
    path: req.path,
    statusCode,
    error: err.name || 'Error',
    message: err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });

  // Zero information disclosure in production: never expose stack traces or internal details
  const responsePayload = {
    success: false,
    error: err.code || 'INTERNAL_SERVER_ERROR',
    message:
      statusCode === 500 && isProduction
        ? 'An internal error occurred. Please contact support.'
        : err.message || 'Internal Server Error',
    ...(isProduction ? {} : { stack: err.stack }),
  };

  res.status(statusCode).json(responsePayload);
}
