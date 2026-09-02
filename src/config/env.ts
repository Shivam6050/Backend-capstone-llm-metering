import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default('3000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().default('file:./dev.db'),
  STRIPE_SECRET_KEY: z.string().default('sk_test_mock_stripe_key_12345'),
  STRIPE_WEBHOOK_SECRET: z.string().default('whsec_mock_webhook_secret_12345'),
  STRIPE_PRO_PRICE_ID: z.string().default('price_pro_test_123'),
});

export const ENV = envSchema.parse(process.env);
