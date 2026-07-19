import type { FastifyReply, FastifyRequest } from 'fastify';
import { createHash, randomBytes } from 'node:crypto';
import { SignJWT, jwtVerify } from 'jose';
import { config, isProduction } from '../config.js';
import { sql } from '../db.js';
import type { AuthUser } from '../types.js';

const secret = new TextEncoder().encode(config.JWT_SECRET);
const accessCookie = 'candle_access';
const refreshCookie = 'candle_refresh';
export type SessionTokens = { accessToken: string; refreshToken: string };

export async function signAccessToken(user: AuthUser): Promise<string> {
  return new SignJWT({ email: user.email }).setProtectedHeader({ alg: 'HS256' }).setSubject(user.id).setIssuedAt().setExpirationTime(`${config.ACCESS_TOKEN_TTL_MINUTES}m`).sign(secret);
}
export async function verifyAccessToken(token: string): Promise<AuthUser> {
  const { payload } = await jwtVerify(token, secret, { algorithms: ['HS256'] });
  if (!payload.sub || typeof payload.email !== 'string') throw new Error('INVALID_TOKEN');
  return { id: payload.sub, email: payload.email };
}
export function hashOpaqueToken(token: string): string { return createHash('sha256').update(token).digest('hex'); }
function ipHash(request: FastifyRequest): string { return createHash('sha256').update(request.ip).digest('hex'); }
function readBearer(request: FastifyRequest): string | undefined {
  const header = request.headers.authorization;
  if (!header?.startsWith('Bearer ')) return undefined;
  return header.slice(7).trim();
}
function setCookies(reply: FastifyReply, accessToken: string, refreshToken: string) {
  const base = { httpOnly: true, secure: isProduction, sameSite: 'lax' as const, path: '/', domain: config.COOKIE_DOMAIN || undefined };
  reply.setCookie(accessCookie, accessToken, { ...base, maxAge: config.ACCESS_TOKEN_TTL_MINUTES * 60 });
  reply.setCookie(refreshCookie, refreshToken, { ...base, maxAge: config.REFRESH_TOKEN_TTL_DAYS * 86400 });
}
export async function issueSession(reply: FastifyReply, request: FastifyRequest, user: AuthUser): Promise<SessionTokens> {
  const accessToken = await signAccessToken(user);
  const refreshToken = randomBytes(48).toString('base64url');
  const expiresAt = new Date(Date.now() + config.REFRESH_TOKEN_TTL_DAYS * 86400000);
  await sql`INSERT INTO refresh_sessions (user_id, token_hash, user_agent, ip_hash, expires_at) VALUES (${user.id}, ${hashOpaqueToken(refreshToken)}, ${request.headers['user-agent'] ?? null}, ${ipHash(request)}, ${expiresAt})`;
  setCookies(reply, accessToken, refreshToken);
  return { accessToken, refreshToken };
}
export function clearSession(reply: FastifyReply): void {
  const options = { path: '/', domain: config.COOKIE_DOMAIN || undefined };
  reply.clearCookie(accessCookie, options); reply.clearCookie(refreshCookie, options);
}
export async function authenticate(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  const token = readBearer(request) || request.cookies[accessCookie];
  if (!token) { await reply.code(401).send({ error: 'AUTH_REQUIRED' }); return; }
  try { request.authUser = await verifyAccessToken(token); }
  catch { await reply.code(401).send({ error: 'SESSION_EXPIRED' }); }
}
export async function rotateRefreshSession(request: FastifyRequest, reply: FastifyReply, bodyToken?: string): Promise<{ user: AuthUser; session: SessionTokens } | null> {
  const token = bodyToken || request.cookies[refreshCookie];
  if (!token) return null;
  const hash = hashOpaqueToken(token);
  const [session] = await sql<{ id: string; userId: string; email: string }[]>`
    SELECT rs.id, rs.user_id, u.email FROM refresh_sessions rs JOIN users u ON u.id = rs.user_id
    WHERE rs.token_hash = ${hash} AND rs.revoked_at IS NULL AND rs.expires_at > NOW() AND u.status = 'active'
  `;
  if (!session) return null;
  await sql`UPDATE refresh_sessions SET revoked_at = NOW() WHERE id = ${session.id}`;
  const user = { id: session.userId, email: session.email };
  return { user, session: await issueSession(reply, request, user) };
}
