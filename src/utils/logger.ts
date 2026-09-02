/**
 * Structured Logger — Winston
 *
 * Outputs:
 * - Development: colorized, human-readable console output
 * - Production:  structured JSON logs (timestamp, level, message, meta)
 *                piped to combined.log + error.log files on disk
 *
 * Usage:
 *   import { logger } from './utils/logger';
 *   logger.info('Server started', { port: 3000 });
 *   logger.error('DB connection failed', { error: err.message });
 *   logger.warn('Rate limit approaching', { userId, usage });
 */

import winston from 'winston';
import path from 'path';
import fs from 'fs';

const isProduction = process.env.NODE_ENV === 'production';

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${timestamp} [${level}] ${message}${metaStr}`;
  })
);

const jsonFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: isProduction ? jsonFormat : consoleFormat,
    silent: process.env.NODE_ENV === 'test', // Suppress logs during testing
  }),
];

// Only enable disk log files in traditional server environments (not Vercel/Lambda serverless)
if (isProduction && !process.env.VERCEL && !process.env.LAMBDA_TASK_ROOT && !process.env.NOW_REGION) {
  try {
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    transports.push(
      new winston.transports.File({
        filename: path.join(logDir, 'error.log'),
        level: 'error',
        format: jsonFormat,
        maxsize: 10 * 1024 * 1024, // 10MB
        maxFiles: 5,
      }),
      new winston.transports.File({
        filename: path.join(logDir, 'combined.log'),
        format: jsonFormat,
        maxsize: 20 * 1024 * 1024, // 20MB
        maxFiles: 10,
      })
    );
  } catch (err) {
    // Read-only filesystem — fallback to console logging only
  }
}

export const logger = winston.createLogger({
  level: isProduction ? 'info' : 'debug',
  transports,
});

// Replace console.error globally in production to route to logger
if (isProduction) {
  console.error = (...args) => logger.error(args.join(' '));
  console.warn = (...args) => logger.warn(args.join(' '));
  console.log = (...args) => logger.info(args.join(' '));
}
