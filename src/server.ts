import 'dotenv/config'; // Load .env file before anything else
import './utils/logger'; // Initialize logger first (replaces console.* in production)
import { validateEnv } from './config/validateEnv';

// STEP 1: Validate all required environment variables BEFORE anything else initializes.
validateEnv();

import { logger } from './utils/logger';
import app from './app';
import { ENV } from './config/env';
import { prisma } from './db';

async function main() {
  try {
    await prisma.$connect();
    logger.info('Database connected successfully.');

    const PORT = ENV.PORT || 3000;
    const server = app.listen(PORT, () => {
      const env = process.env.NODE_ENV || 'development';
      logger.info(`Server started`, { port: PORT, env, url: `http://localhost:${PORT}` });

      if (env !== 'production') {
        logger.warn('Running in DEVELOPMENT mode — set NODE_ENV=production for production deployments.');
      }
    });

    // ─── Graceful Shutdown ─────────────────────────────────────────────────────
    // Handles SIGTERM (cloud deployments, Docker) and SIGINT (Ctrl+C)
    // Allows in-flight requests to complete before closing the server & DB.

    async function shutdown(signal: string) {
      logger.info(`${signal} received — starting graceful shutdown...`);

      // Stop accepting new connections
      server.close(async () => {
        logger.info('HTTP server closed. No new connections will be accepted.');

        try {
          // Disconnect Prisma cleanly (flushes pending queries)
          await prisma.$disconnect();
          logger.info('Database connection closed cleanly.');
          logger.info('Graceful shutdown complete. Goodbye.');
          process.exit(0);
        } catch (err: any) {
          logger.error('Error during graceful shutdown', { error: err.message });
          process.exit(1);
        }
      });

      // Force-kill after 15 seconds if shutdown takes too long
      setTimeout(() => {
        logger.error('Graceful shutdown timed out after 15s — forcing exit.');
        process.exit(1);
      }, 15_000).unref();
    }

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Catch unhandled promise rejections and log them before crashing
    process.on('unhandledRejection', (reason: any) => {
      logger.error('Unhandled promise rejection', { reason: reason?.message || String(reason) });
      shutdown('unhandledRejection');
    });

    process.on('uncaughtException', (err: Error) => {
      logger.error('Uncaught exception — shutting down', { error: err.message, stack: err.stack });
      shutdown('uncaughtException');
    });

  } catch (error: any) {
    logger.error('Fatal startup error', { error: error.message });
    process.exit(1);
  }
}

main();
