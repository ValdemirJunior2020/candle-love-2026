import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import Fastify from 'fastify';
import rawBody from 'fastify-raw-body';
import { Server as SocketServer } from 'socket.io';

import { config, isOriginAllowed } from './config.js';
import { sql } from './db.js';
import { setRealtimeServer } from './realtime.js';
import { authRoutes } from './routes/auth.js';
import { chatRoutes } from './routes/chat.js';
import { discoveryRoutes } from './routes/discovery.js';
import { intentionalRoutes } from './routes/intentional.js';
import { profileRoutes } from './routes/profile.js';
import { safetyRoutes } from './routes/safety.js';
import { walletRoutes } from './routes/wallet.js';
import { verifyAccessToken } from './services/auth.js';

/**
 * Fastify Static requires an absolute directory path.
 *
 * Local example:
 * ./uploads
 *
 * Render example:
 * /app/uploads
 */
const uploadDirectory = resolve(config.UPLOAD_DIR);

await mkdir(uploadDirectory, {
  recursive: true,
});

const app = Fastify({
  logger: {
    level: config.LOG_LEVEL,
  },
  trustProxy: true,
  bodyLimit:
    (config.MAX_PROFILE_PHOTO_MB + 1) *
    1024 *
    1024,
});

/**
 * Cross-origin requests.
 */
await app.register(cors, {
  origin: (origin, callback) => {
    callback(null, isOriginAllowed(origin));
  },
  credentials: true,
  methods: [
    'GET',
    'POST',
    'PATCH',
    'DELETE',
    'OPTIONS',
  ],
});

/**
 * Authentication cookies.
 */
await app.register(cookie);

/**
 * Security headers.
 */
await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: {
    policy: 'cross-origin',
  },
});

/**
 * Global rate limiting.
 */
await app.register(rateLimit, {
  max: config.RATE_LIMIT_MAX_REQUESTS,
  timeWindow: config.RATE_LIMIT_WINDOW_MS,
});

/**
 * Profile-photo uploads.
 */
await app.register(multipart, {
  limits: {
    files: 1,
    fileSize:
      config.MAX_PROFILE_PHOTO_MB *
      1024 *
      1024,
    fields: 4,
  },
});

/**
 * Publicly serve uploaded profile photos.
 */
await app.register(staticFiles, {
  root: uploadDirectory,
  prefix: '/uploads/',
  decorateReply: false,
  cacheControl: true,
  maxAge: '7d',
  immutable: true,
});

/**
 * Required for signed webhook payload verification.
 */
await app.register(rawBody, {
  field: 'rawBody',
  global: false,
  encoding: false,
  runFirst: true,
});

/**
 * Reject unapproved browser origins for write requests.
 *
 * Requests without an Origin header, including native mobile
 * requests and server health checks, continue normally.
 */
app.addHook(
  'onRequest',
  async (request, reply) => {
    const safeMethods = [
      'GET',
      'HEAD',
      'OPTIONS',
    ];

    const isWebhook =
      request.url.includes('stripe-webhook') ||
      request.url.includes(
        'revenuecat-webhook',
      );

    if (
      safeMethods.includes(request.method) ||
      isWebhook
    ) {
      return;
    }

    const origin = request.headers.origin;

    if (
      origin &&
      !isOriginAllowed(origin)
    ) {
      return reply.code(403).send({
        error: 'INVALID_ORIGIN',
      });
    }
  },
);

/**
 * Safe global error handling.
 */
app.setErrorHandler(
  (error, request, reply) => {
    request.log.error(
      {
        err: error,
      },
      'Unhandled request error',
    );

    if (reply.sent) {
      return;
    }

    const possibleStatusCode = (
      error as {
        statusCode?: unknown;
      }
    ).statusCode;

    const statusCode =
      typeof possibleStatusCode === 'number'
        ? possibleStatusCode
        : 500;

    const safeStatusCode =
      statusCode >= 400 &&
      statusCode < 500
        ? statusCode
        : 500;

    return reply
      .code(safeStatusCode)
      .send({
        error:
          safeStatusCode < 500
            ? 'REQUEST_FAILED'
            : 'INTERNAL_SERVER_ERROR',
      });
  },
);

/**
 * Basic server health check.
 */
app.get('/health', async () => {
  return {
    status: 'ok',
    service: config.SERVER_NAME,
    environment: config.NODE_ENV,
  };
});

/**
 * API health check.
 */
app.get('/api/health', async () => {
  return {
    status: 'ok',
    service: 'api',
    environment: config.NODE_ENV,
  };
});

/**
 * Readiness check that confirms PostgreSQL connectivity.
 */
app.get(
  '/api/ready',
  async (_request, reply) => {
    try {
      await sql`
        SELECT 1
      `;

      return {
        status: 'ready',
        database: 'connected',
      };
    } catch (error) {
      app.log.error(
        {
          err: error,
        },
        'Database readiness check failed',
      );

      return reply.code(503).send({
        status: 'not_ready',
        database: 'unavailable',
      });
    }
  },
);

/**
 * REST API routes.
 */
await app.register(authRoutes, {
  prefix: '/api/auth',
});

await app.register(discoveryRoutes, {
  prefix: '/api/discover',
});

await app.register(chatRoutes, {
  prefix: '/api/conversations',
});

await app.register(walletRoutes, {
  prefix: '/api/wallet',
});

await app.register(safetyRoutes, {
  prefix: '/api/safety',
});

await app.register(profileRoutes, {
  prefix: '/api/profile',
});

await app.register(intentionalRoutes, {
  prefix: '/api/intentional',
});

/**
 * Socket.IO real-time messaging server.
 */
const io = new SocketServer(
  app.server,
  {
    cors: {
      origin: (origin, callback) => {
        callback(
          null,
          isOriginAllowed(origin),
        );
      },
      credentials: true,
    },
  },
);

/**
 * Authenticate Socket.IO connections.
 */
io.use(async (socket, next) => {
  try {
    const bearerToken =
      typeof socket.handshake.auth?.token ===
      'string'
        ? socket.handshake.auth.token
        : undefined;

    const cookieHeader = String(
      socket.request.headers.cookie ?? '',
    );

    const cookies: Record<
      string,
      string
    > = {};

    for (const cookiePart of cookieHeader
      .split(';')
      .filter(Boolean)) {
      const separatorIndex =
        cookiePart.indexOf('=');

      if (separatorIndex === -1) {
        continue;
      }

      const cookieName = decodeURIComponent(
        cookiePart
          .slice(0, separatorIndex)
          .trim(),
      );

      const cookieValue =
        decodeURIComponent(
          cookiePart
            .slice(separatorIndex + 1)
            .trim(),
        );

      cookies[cookieName] = cookieValue;
    }

    const token =
      bearerToken ||
      cookies.candle_access;

    if (!token) {
      return next(
        new Error('AUTH_REQUIRED'),
      );
    }

    socket.data.user =
      await verifyAccessToken(token);

    return next();
  } catch {
    return next(
      new Error('AUTH_REQUIRED'),
    );
  }
});

/**
 * Allow authenticated conversation members to join
 * their real-time conversation room.
 */
io.on('connection', (socket) => {
  socket.on(
    'conversation:join',
    async (conversationId: string) => {
      try {
        const userId = socket.data.user
          .id as string;

        const [membership] = await sql`
          SELECT 1
          FROM conversations AS c
          JOIN matches AS m
            ON m.id = c.match_id
          WHERE c.id = ${conversationId}
            AND m.active = TRUE
            AND (
              m.user_a = ${userId}
              OR m.user_b = ${userId}
            )
          LIMIT 1
        `;

        if (membership) {
          await socket.join(
            `conversation:${conversationId}`,
          );
        }
      } catch (error) {
        app.log.error(
          {
            err: error,
            conversationId,
          },
          'Failed to join conversation room',
        );
      }
    },
  );
});

setRealtimeServer(io);

/**
 * Graceful shutdown for Docker and Render.
 */
let shuttingDown = false;

const shutdown = async (
  signal: string,
): Promise<void> => {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;

  app.log.info(
    {
      signal,
    },
    'Shutting down Candle Love API',
  );

  try {
    io.close();
    await app.close();
    await sql.end({
      timeout: 5,
    });

    process.exit(0);
  } catch (error) {
    app.log.error(
      {
        err: error,
      },
      'Graceful shutdown failed',
    );

    process.exit(1);
  }
};

process.on('SIGTERM', () => {
  void shutdown('SIGTERM');
});

process.on('SIGINT', () => {
  void shutdown('SIGINT');
});

/**
 * Render supplies PORT automatically.
 * The server must listen on 0.0.0.0.
 */
try {
  await app.listen({
    port: config.PORT,
    host: '0.0.0.0',
  });

  app.log.info(
    {
      port: config.PORT,
      uploadDirectory,
      environment: config.NODE_ENV,
    },
    'Candle Love API started',
  );
} catch (error) {
  app.log.fatal(
    {
      err: error,
    },
    'Candle Love API failed to start',
  );

  await sql.end({
    timeout: 5,
  });

  process.exit(1);
}