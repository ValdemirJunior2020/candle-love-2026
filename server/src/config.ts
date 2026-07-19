import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

loadEnv({ path: fileURLToPath(new URL('../.env', import.meta.url)) });

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(5000),
  SERVER_NAME: z.string().default('candle-love-api'),
  SERVER_URL: z.string().url().default('http://localhost:5000'),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_PROFILE_PHOTO_MB: z.coerce.number().int().min(1).max(20).default(8),
  CORS_ALLOWED_ORIGINS: z.string().default('http://localhost:8081,http://localhost:19006,http://localhost:3000'),
  DATABASE_URL: z.string().min(1).default('postgres://candle:candle@localhost:5432/candle_love'),
  DATABASE_SSL: z.enum(['true', 'false']).default('false'),
  JWT_SECRET: z.string().min(32).default('development-only-secret-change-before-production'),
  ACCESS_TOKEN_TTL_MINUTES: z.coerce.number().int().positive().default(15),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(30),
  COOKIE_DOMAIN: z.string().optional(),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  REVENUECAT_WEBHOOK_SECRET: z.string().optional(),
  SPARK_PACK_50_PRODUCT_ID: z.string().default('candle_sparks_50'),
  SPARK_PACK_140_PRODUCT_ID: z.string().default('candle_sparks_140'),
  SPARK_PACK_320_PRODUCT_ID: z.string().default('candle_sparks_320'),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().positive().default(60_000),
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(120),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info')
});

const parsed = schema.safeParse(process.env);
if (!parsed.success) {
  const fields = parsed.error.issues.map((issue) => issue.path.join('.') || 'environment').join(', ');
  throw new Error(`Invalid server environment variables: ${fields}`);
}

export const config = parsed.data;
export const isProduction = config.NODE_ENV === 'production';
export const allowedOrigins = config.CORS_ALLOWED_ORIGINS.split(',').map((value) => value.trim()).filter(Boolean);

if (isProduction) {
  const missing: string[] = [];
  if (config.JWT_SECRET.startsWith('development-only')) missing.push('JWT_SECRET');
  if (config.DATABASE_URL.includes('candle:candle@localhost')) missing.push('DATABASE_URL');
  if (!config.SERVER_URL.startsWith('https://')) missing.push('SERVER_URL');
  if (missing.length) throw new Error(`Production configuration is incomplete: ${missing.join(', ')}`);
}
