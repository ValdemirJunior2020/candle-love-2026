import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { sql } from '../db.js';
import { authenticate, clearSession, hashOpaqueToken, issueSession, rotateRefreshSession } from '../services/auth.js';
import { hashPassword, verifyPassword } from '../services/password.js';

const credentials = z.object({ email: z.string().email().max(254), password: z.string().min(10).max(128) });
const registerSchema = credentials.extend({ displayName: z.string().trim().min(2).max(50), birthDate: z.string().date(), acceptedTerms: z.literal(true) });
function isAdult(birthDate: string): boolean { const birth = new Date(`${birthDate}T00:00:00Z`); const today = new Date(); let age = today.getUTCFullYear() - birth.getUTCFullYear(); if (today.getUTCMonth() < birth.getUTCMonth() || (today.getUTCMonth() === birth.getUTCMonth() && today.getUTCDate() < birth.getUTCDate())) age--; return age >= 18; }

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/register', { config: { rateLimit: { max: 5, timeWindow: '1 hour' } } }, async (request, reply) => {
    const parsed = registerSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT', details: parsed.error.flatten() });
    if (!isAdult(parsed.data.birthDate)) return reply.code(400).send({ error: 'ADULTS_ONLY' });
    const passwordHash = await hashPassword(parsed.data.password);
    try {
      const user = await sql.begin(async (tx) => {
        const [created] = await tx<{ id: string; email: string; displayName: string }[]>`INSERT INTO users (email, password_hash, display_name, birth_date) VALUES (${parsed.data.email.toLowerCase()}, ${passwordHash}, ${parsed.data.displayName}, ${parsed.data.birthDate}) RETURNING id, email, display_name`;
        if (!created) throw new Error('CREATE_FAILED');
        await tx`INSERT INTO profiles (user_id) VALUES (${created.id})`;
        await tx`INSERT INTO wallets (user_id, balance) VALUES (${created.id}, 25)`;
        await tx`INSERT INTO wallet_ledger (user_id, amount, reason) VALUES (${created.id}, 25, 'starter_sparks')`;
        return created;
      });
      const session = await issueSession(reply, request, { id: user.id, email: user.email });
      return reply.code(201).send({ user, session, starterSparks: 25 });
    } catch (error) {
      if (String(error).includes('duplicate key')) return reply.code(409).send({ error: 'EMAIL_IN_USE' });
      request.log.error(error); return reply.code(500).send({ error: 'REGISTER_FAILED' });
    }
  });

  app.post('/login', { config: { rateLimit: { max: 10, timeWindow: '15 minutes' } } }, async (request, reply) => {
    const parsed = credentials.safeParse(request.body); if (!parsed.success) return reply.code(400).send({ error: 'INVALID_INPUT' });
    const [user] = await sql<{ id: string; email: string; passwordHash: string; displayName: string; status: string }[]>`SELECT id, email, password_hash, display_name, status FROM users WHERE email = ${parsed.data.email.toLowerCase()}`;
    if (!user || user.status !== 'active' || !(await verifyPassword(parsed.data.password, user.passwordHash))) return reply.code(401).send({ error: 'INVALID_CREDENTIALS' });
    const session = await issueSession(reply, request, { id: user.id, email: user.email });
    return { user: { id: user.id, email: user.email, displayName: user.displayName }, session };
  });

  app.post('/refresh', async (request, reply) => {
    const parsed = z.object({ refreshToken: z.string().min(20).optional() }).safeParse(request.body ?? {});
    const result = await rotateRefreshSession(request, reply, parsed.success ? parsed.data.refreshToken : undefined);
    if (!result) return reply.code(401).send({ error: 'INVALID_REFRESH_SESSION' });
    return result;
  });

  app.post('/logout', async (request, reply) => {
    const parsed = z.object({ refreshToken: z.string().optional() }).safeParse(request.body ?? {});
    const refresh = parsed.success ? parsed.data.refreshToken : undefined;
    const token = refresh || request.cookies.candle_refresh;
    if (token) await sql`UPDATE refresh_sessions SET revoked_at = NOW() WHERE token_hash = ${hashOpaqueToken(token)}`;
    clearSession(reply); return reply.code(204).send();
  });

  app.get('/me', { preHandler: authenticate }, async (request, reply) => {
    const [user] = await sql`
      SELECT
        u.id,
        u.email,
        u.display_name,
        u.birth_date,
        u.verified,
        u.trust_level,
        p.bio,
        p.city,
        p.photo_url,
        p.intentions,
        p.interests,
        p.prompt_answer,
        p.relationship_intention,
        p.voice_intro_url,
        p.profile_complete,
        w.balance AS spark_balance,
        COALESCE(
          (
            SELECT json_agg(
              json_build_object(
                'id', pp.id,
                'photoUrl', pp.photo_url,
                'mimeType', pp.mime_type,
                'position', pp.position,
                'createdAt', pp.created_at
              )
              ORDER BY pp.position
            )
            FROM profile_photos pp
            WHERE pp.user_id = u.id
          ),
          '[]'::json
        ) AS photos
      FROM users u
      JOIN profiles p ON p.user_id = u.id
      JOIN wallets w ON w.user_id = u.id
      WHERE u.id = ${request.authUser!.id} AND u.status = 'active'
    `;

    if (!user) return reply.code(404).send({ error: 'USER_NOT_FOUND' });
    return { user };
  });
};
