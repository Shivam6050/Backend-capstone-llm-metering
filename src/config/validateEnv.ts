import 'dotenv/config';

/**
 * Startup Environment Validator
 * Crashes the server with a clear error if any required environment variable
 * is missing, empty, or still set to a known insecure default value.
 *
 * This is the FIRST thing called in server.ts before anything else initializes.
 */

interface EnvRule {
  key: string;
  required: boolean;
  insecureDefaults?: string[];
  minLength?: number;
  description: string;
}

const ENV_RULES: EnvRule[] = [
  {
    key: 'JWT_SECRET',
    required: true,
    minLength: 32,
    insecureDefaults: [
      'flyrank_super_secret_jwt_key_2026',
      'secret',
      'jwt_secret',
      'changeme',
      'password',
    ],
    description: 'JWT signing secret (minimum 32 characters, cryptographically random)',
  },
  {
    key: 'DATABASE_URL',
    required: true,
    insecureDefaults: [],
    description: 'Database connection string (PostgreSQL in production, SQLite for local dev)',
  },
  {
    key: 'NODE_ENV',
    required: true,
    insecureDefaults: [],
    description: 'Application environment (development | production)',
  },
  {
    key: 'ENCRYPTION_KEY',
    required: false,
    minLength: 32,
    insecureDefaults: [
      '12345678901234567890123456789012',
      'changeme_32_byte_encryption_key',
    ],
    description: 'AES-256-GCM encryption key for provider credentials (32 chars)',
  },
];

const PRODUCTION_REQUIRED_RULES: EnvRule[] = [
  {
    key: 'ENCRYPTION_KEY',
    required: true,
    minLength: 32,
    insecureDefaults: [
      '12345678901234567890123456789012',
      'changeme_32_byte_encryption_key',
    ],
    description: 'AES-256-GCM encryption key for provider credentials (32 chars)',
  },
  {
    key: 'EMAIL_HOST',
    required: false,
    description: 'SMTP email host for sending password reset emails',
  },
  {
    key: 'EMAIL_FROM',
    required: false,
    description: 'From address for transactional emails',
  },
];

export function validateEnv(): void {
  const errors: string[] = [];
  const warnings: string[] = [];
  const isProduction = process.env.NODE_ENV === 'production';

  console.log('\n[Env Validator] Checking environment variables...');

  for (const rule of ENV_RULES) {
    const value = process.env[rule.key];

    if (rule.required && (!value || value.trim() === '')) {
      errors.push(`❌ MISSING: ${rule.key} — ${rule.description}`);
      continue;
    }

    if (value && rule.minLength && value.length < rule.minLength) {
      errors.push(
        `❌ TOO SHORT: ${rule.key} must be at least ${rule.minLength} characters. ` +
        `Current length: ${value.length}. Generate with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
      );
      continue;
    }

    if (value && rule.insecureDefaults && rule.insecureDefaults.includes(value)) {
      if (isProduction) {
        errors.push(
          `❌ INSECURE DEFAULT: ${rule.key} is set to a known insecure default value. ` +
          `Generate a secure value with: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"`
        );
      } else {
        warnings.push(`⚠️  WARNING: ${rule.key} is using an insecure default. OK for development only.`);
      }
    }
  }

  if (isProduction) {
    for (const rule of PRODUCTION_REQUIRED_RULES) {
      const value = process.env[rule.key];
      if (!value || value.trim() === '') {
        warnings.push(`⚠️  PRODUCTION WARNING: ${rule.key} is not set. ${rule.description}`);
      }
    }

    // In production, enforce HTTPS redirect
    if (!process.env.TRUST_PROXY) {
      warnings.push('⚠️  PRODUCTION WARNING: TRUST_PROXY is not set. Set to "1" if behind a reverse proxy/load balancer for correct IP detection.');
    }
  }

  // Print warnings
  if (warnings.length > 0) {
    console.warn('\n[Env Validator] Warnings:');
    warnings.forEach((w) => console.warn('  ' + w));
  }

  // Crash on errors
  if (errors.length > 0) {
    console.error('\n[Env Validator] FATAL — Server cannot start due to environment configuration errors:');
    errors.forEach((e) => console.error('  ' + e));
    console.error('\n[Env Validator] Fix the above issues in your .env file and restart the server.\n');
    process.exit(1);
  }

  console.log('[Env Validator] ✅ All required environment variables are valid.\n');
}
