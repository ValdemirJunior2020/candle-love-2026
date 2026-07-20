import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

/**
 * Load the server-level .env file when it exists.
 *
 * In Docker and Render, environment variables are normally injected directly.
 * dotenv does not overwrite variables that already exist in process.env.
 */
loadEnv({
  path: fileURLToPath(new URL('../.env', import.meta.url)),
});

const renderExternalHostname =
  process.env.RENDER_EXTERNAL_HOSTNAME?.trim();

const defaultServerUrl = renderExternalHostname
  ? `https://${renderExternalHostname}`
  : 'http://localhost:5000';

const environmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce
    .number()
    .int()
    .positive()
    .default(5000),

  SERVER_NAME: z
    .string()
    .trim()
    .min(1)
    .default('candle-love-api'),

  SERVER_URL: z
    .string()
    .url()
    .default(defaultServerUrl),

  RENDER_EXTERNAL_HOSTNAME: z
    .string()
    .trim()
    .optional(),

  UPLOAD_DIR: z
    .string()
    .trim()
    .min(1)
    .default('./uploads'),

  MAX_PROFILE_PHOTO_MB: z.coerce
    .number()
    .int()
    .min(1)
    .max(20)
    .default(8),

  CORS_ALLOWED_ORIGINS: z
    .string()
    .default(
      'http://localhost:8081,http://localhost:19006,http://localhost:3000',
    ),

  DATABASE_URL: z
    .string()
    .trim()
    .min(1)
    .default(
      'postgres://candle:candle@localhost:5432/candle_love',
    ),

  DATABASE_SSL: z
    .enum(['true', 'false'])
    .default('false'),

  JWT_SECRET: z
    .string()
    .min(32)
    .default(
      'development-only-secret-change-before-production',
    ),

  ACCESS_TOKEN_TTL_MINUTES: z.coerce
    .number()
    .int()
    .positive()
    .default(15),

  REFRESH_TOKEN_TTL_DAYS: z.coerce
    .number()
    .int()
    .positive()
    .default(30),

  COOKIE_DOMAIN: z
    .string()
    .trim()
    .optional(),

  STRIPE_SECRET_KEY: z
    .string()
    .trim()
    .optional(),

  STRIPE_WEBHOOK_SECRET: z
    .string()
    .trim()
    .optional(),

  REVENUECAT_WEBHOOK_SECRET: z
    .string()
    .trim()
    .optional(),

  SPARK_PACK_50_PRODUCT_ID: z
    .string()
    .trim()
    .default('candle_sparks_50'),

  SPARK_PACK_140_PRODUCT_ID: z
    .string()
    .trim()
    .default('candle_sparks_140'),

  SPARK_PACK_320_PRODUCT_ID: z
    .string()
    .trim()
    .default('candle_sparks_320'),

  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(60_000),

  RATE_LIMIT_MAX_REQUESTS: z.coerce
    .number()
    .int()
    .positive()
    .default(120),

  LOG_LEVEL: z
    .enum([
      'fatal',
      'error',
      'warn',
      'info',
      'debug',
      'trace',
      'silent',
    ])
    .default('info'),
});

const parsedEnvironment = environmentSchema.safeParse(
  process.env,
);

if (!parsedEnvironment.success) {
  const invalidFields = parsedEnvironment.error.issues
    .map((issue) => {
      const fieldName =
        issue.path.join('.') || 'environment';

      return `${fieldName}: ${issue.message}`;
    })
    .join('; ');

  throw new Error(
    `Invalid server environment variables: ${invalidFields}`,
  );
}

export const config = parsedEnvironment.data;

export const isProduction =
  config.NODE_ENV === 'production';

/**
 * Remove trailing slashes so these values are treated as equal:
 *
 * https://example.com
 * https://example.com/
 */
function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/+$/, '');
}

/**
 * Exported because wallet.ts and other routes may import it directly.
 */
export const allowedOrigins: string[] =
  config.CORS_ALLOWED_ORIGINS
    .split(',')
    .map(normalizeOrigin)
    .filter((origin) => origin.length > 0);

/**
 * Kept as a separate export for compatibility with any existing code that
 * imports allowedOriginPatterns.
 */
export const allowedOriginPatterns: string[] = [
  ...allowedOrigins,
];

function escapeRegularExpression(
  value: string,
): string {
  return value.replace(
    /[.*+?^${}()|[\]\\]/g,
    '\\$&',
  );
}

function wildcardPatternToRegExp(
  pattern: string,
): RegExp {
  const patternParts = pattern.split('*');

  const escapedParts = patternParts.map(
    escapeRegularExpression,
  );

  return new RegExp(
    `^${escapedParts.join('.*')}$`,
    'i',
  );
}

export function isOriginAllowed(
  origin?: string,
): boolean {
  /*
   * Requests without an Origin header include:
   * - server-to-server requests
   * - health checks
   * - some native mobile requests
   */
  if (!origin) {
    return true;
  }

  const normalizedOrigin = normalizeOrigin(origin);

  return allowedOriginPatterns.some((pattern) => {
    if (pattern === '*') {
      /*
       * Never allow unrestricted browser origins in production.
       */
      return !isProduction;
    }

    if (!pattern.includes('*')) {
      return normalizedOrigin === pattern;
    }

    return wildcardPatternToRegExp(pattern).test(
      normalizedOrigin,
    );
  });
}

if (isProduction) {
  const missingConfiguration: string[] = [];

  if (
    config.JWT_SECRET.startsWith(
      'development-only',
    )
  ) {
    missingConfiguration.push('JWT_SECRET');
  }

  if (
    config.DATABASE_URL.includes(
      'candle:candle@localhost',
    )
  ) {
    missingConfiguration.push('DATABASE_URL');
  }

  if (
    !config.SERVER_URL.startsWith('https://')
  ) {
    missingConfiguration.push('SERVER_URL');
  }

  if (allowedOriginPatterns.length === 0) {
    missingConfiguration.push(
      'CORS_ALLOWED_ORIGINS',
    );
  }

  if (missingConfiguration.length > 0) {
    throw new Error(
      `Production configuration is incomplete: ${missingConfiguration.join(
        ', ',
      )}`,
    );
  }
}