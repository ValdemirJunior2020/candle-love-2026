import { mkdir } from 'node:fs/promises';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import staticFiles from '@fastify/static';
import rawBody from 'fastify-raw-body';
import { Server as SocketServer } from 'socket.io';
import { allowedOrigins, config } from './config.js';
import { sql } from './db.js';
import { authRoutes } from './routes/auth.js';
import { chatRoutes } from './routes/chat.js';
import { discoveryRoutes } from './routes/discovery.js';
import { safetyRoutes } from './routes/safety.js';
import { profileRoutes } from './routes/profile.js';
import { walletRoutes } from './routes/wallet.js';
import { setRealtimeServer } from './realtime.js';
import { verifyAccessToken } from './services/auth.js';

await mkdir(config.UPLOAD_DIR, { recursive: true });

const app = Fastify({
  logger: { level: config.LOG_LEVEL },
  trustProxy: true,
  bodyLimit: (config.MAX_PROFILE_PHOTO_MB + 1) * 1024 * 1024,
});

const originAllowed = (origin?: string) => !origin || allowedOrigins.includes(origin);

await app.register(cors, {
  origin: (origin, callback) => callback(null, originAllowed(origin)),
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
});
await app.register(cookie);
await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' },
});
await app.register(rateLimit, {
  max: config.RATE_LIMIT_MAX_REQUESTS,
  timeWindow: config.RATE_LIMIT_WINDOW_MS,
});
await app.register(multipart, {
  limits: {
    files: 1,
    fileSize: config.MAX_PROFILE_PHOTO_MB * 1024 * 1024,
    fields: 4,
  },
});
await app.register(staticFiles, {
  root: config.UPLOAD_DIR,
  prefix: '/uploads/',
  decorateReply: false,
  cacheControl: true,
  maxAge: '7d',
  immutable: true,
});
await app.register(rawBody, {
  field: 'rawBody',
  global: false,
  encoding: false,
  runFirst: true,
});

app.addHook('onRequest', async (request, reply) => {
  if (
    ['GET', 'HEAD', 'OPTIONS'].includes(request.method) ||
    request.url.includes('stripe-webhook') ||
    request.url.includes('revenuecat-webhook')
  ) {
    return;
  }

  const origin = request.headers.origin;
  if (origin && !originAllowed(origin)) {
    return reply.code(403).send({ error: 'INVALID_ORIGIN' });
  }
});

app.setErrorHandler((error, request, reply) => {
  request.log.error({ err: error }, 'Unhandled request error');
  if (reply.sent) return;

  const statusCode =
    typeof (error as { statusCode?: unknown }).statusCode === 'number'
      ? (error as { statusCode: number }).statusCode
      : 500;
  const safeStatus = statusCode < 500 ? statusCode : 500;

  reply.code(safeStatus).send({
    error: safeStatus < 500 ? 'REQUEST_FAILED' : 'INTERNAL_SERVER_ERROR',
  });
});

app.get('/health', async () => ({
  status: 'ok',
  service: config.SERVER_NAME,
  environment: config.NODE_ENV,
}));

app.get('/api/health', async () => ({
  status: 'ok',
  service: 'api',
  environment: config.NODE_ENV,
}));

app.get('/api/ready', async (_request, reply) => {
  try {
    await sql`SELECT 1`;
    return { status: 'ready', database: 'connected' };
  } catch {
    return reply
      .code(503)
      .send({ status: 'not_ready', database: 'unavailable' });
  }
});

app.register(authRoutes, { prefix: '/api/auth' });
app.register(discoveryRoutes, { prefix: '/api/discover' });
app.register(chatRoutes, { prefix: '/api/conversations' });
app.register(walletRoutes, { prefix: '/api/wallet' });
app.register(safetyRoutes, { prefix: '/api/safety' });
app.register(profileRoutes, { prefix: '/api/profile' });

const io = new SocketServer(app.server, {
  cors: { origin: allowedOrigins, credentials: true },
});

io.use(async (socket, next) => {
  try {
    const bearer =
      typeof socket.handshake.auth?.token === 'string'
        ? socket.handshake.auth.token
        : undefined;
    const cookies = Object.fromEntries(
      String(socket.request.headers.cookie ?? '')
        .split(';')
        .filter(Boolean)
        .map(
          (part) =>
            part.trim().split('=').map(decodeURIComponent) as [string, string],
        ),
    );
    const token = bearer || cookies.candle_access;
    if (!token) return next(new Error('AUTH_REQUIRED'));
    socket.data.user = await verifyAccessToken(token);
    next();
  } catch {
    next(new Error('AUTH_REQUIRED'));
  }
});

io.on('connection', (socket) => {
  socket.on('conversation:join', async (conversationId: string) => {
    const userId = socket.data.user.id as string;
    const [member] = await sql`
      SELECT 1
      FROM conversations c
      JOIN matches m ON m.id = c.match_id
      WHERE c.id = ${conversationId}
        AND m.active = TRUE
        AND (m.user_a = ${userId} OR m.user_b = ${userId})
    `;
    if (member) socket.join(`conversation:${conversationId}`);
  });
});

setRealtimeServer(io);

const shutdown = async () => {
  io.close();
  await app.close();
  await sql.end({ timeout: 5 });
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

await app.listen({ port: config.PORT, host: '0.0.0.0' });
