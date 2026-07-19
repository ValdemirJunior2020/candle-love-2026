import { randomUUID } from 'node:crypto';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { sql } from '../db.js';
import { authenticate } from '../services/auth.js';

const QUESTIONS = [
  { key: 'communication', label: 'Open communication matters to me.' },
  { key: 'commitment', label: 'I am ready to build a committed relationship.' },
  { key: 'family', label: 'Family plans should be discussed early.' },
  { key: 'finances', label: 'Financial responsibility is important in a partner.' },
  { key: 'affection', label: 'Affection and reassurance are important to me.' },
  { key: 'conflict', label: 'I prefer calm repair after disagreements.' },
  { key: 'growth', label: 'Personal growth should continue inside a relationship.' },
  { key: 'social', label: 'I value a healthy balance of couple time and social time.' },
] as const;

const PROMPTS = [
  'What made you smile this week?',
  'What does a peaceful relationship look like to you?',
  'What is something you hope to build with a partner?',
  'What makes you feel appreciated?',
  'What is one value you never compromise on?',
  'What does a great ordinary Sunday look like to you?',
];

async function getMembership(conversationId: string, userId: string) {
  const [row] = await sql<{ matchId: string; userA: string; userB: string }[]>`
    SELECT m.id AS match_id, m.user_a, m.user_b
    FROM conversations c JOIN matches m ON m.id = c.match_id
    WHERE c.id = ${conversationId} AND m.active = TRUE
      AND (m.user_a = ${userId} OR m.user_b = ${userId})
  `;
  return row;
}

function weekStartIso() {
  const now = new Date();
  const day = now.getUTCDay();
  const diff = (day + 6) % 7;
  now.setUTCDate(now.getUTCDate() - diff);
  return now.toISOString().slice(0, 10);
}

export const intentionalRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/dashboard', async (request) => {
    const userId = request.authUser!.id;
    const [row] = await sql<{
      answers: number; reflections: number; voiceIntroUrl: string | null;
      verified: boolean; trustLevel: number; reports: number; swipesToday: number;
    }[]>`
      SELECT
        (SELECT COUNT(*)::int FROM compatibility_answers WHERE user_id = ${userId}) AS answers,
        (SELECT COUNT(*)::int FROM weekly_reflections WHERE user_id = ${userId}) AS reflections,
        p.voice_intro_url,
        u.verified,
        u.trust_level,
        (SELECT COUNT(*)::int FROM reports WHERE reported_id = ${userId} AND status IN ('open','reviewing')) AS reports,
        (SELECT COUNT(*)::int FROM swipes WHERE actor_id = ${userId} AND created_at >= date_trunc('day', NOW())) AS swipes_today
      FROM users u JOIN profiles p ON p.user_id = u.id WHERE u.id = ${userId}
    `;
    return {
      compatibilityComplete: (row?.answers ?? 0) >= QUESTIONS.length,
      reflectionCount: row?.reflections ?? 0,
      voiceIntroUrl: row?.voiceIntroUrl ?? null,
      introductionsRemaining: Math.max(0, 3 - (row?.swipesToday ?? 0)),
      trustShield: {
        emailVerified: Boolean(row?.verified),
        voiceIntro: Boolean(row?.voiceIntroUrl),
        respectfulStanding: (row?.reports ?? 0) === 0,
        trustLevel: row?.trustLevel ?? 0,
      },
    };
  });

  app.get('/compatibility', async (request) => {
    const rows = await sql<{ questionKey: string; answerValue: number; importance: number }[]>`
      SELECT question_key, answer_value, importance
      FROM compatibility_answers WHERE user_id = ${request.authUser!.id}
    `;
    return { questions: QUESTIONS, answers: rows };
  });

  app.put('/compatibility', async (request, reply) => {
    const parsed = z.object({ answers: z.array(z.object({
      questionKey: z.string().min(1).max(60),
      answerValue: z.number().int().min(1).max(5),
      importance: z.number().int().min(1).max(5),
    })).min(1).max(QUESTIONS.length) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_COMPATIBILITY_ANSWERS' });
    const allowed = new Set(QUESTIONS.map((question) => question.key));
    if (parsed.data.answers.some((answer) => !allowed.has(answer.questionKey as never))) {
      return reply.code(400).send({ error: 'UNKNOWN_COMPATIBILITY_QUESTION' });
    }
    await sql.begin(async (tx) => {
      for (const answer of parsed.data.answers) {
        await tx`
          INSERT INTO compatibility_answers (user_id, question_key, answer_value, importance)
          VALUES (${request.authUser!.id}, ${answer.questionKey}, ${answer.answerValue}, ${answer.importance})
          ON CONFLICT (user_id, question_key) DO UPDATE SET
            answer_value = EXCLUDED.answer_value,
            importance = EXCLUDED.importance,
            updated_at = NOW()
        `;
      }
    });
    return { saved: true };
  });

  app.get('/prompts', async () => ({ prompts: PROMPTS }));

  app.get('/reflections', async (request) => {
    const reflections = await sql`
      SELECT id, reflection_week, answer, created_at
      FROM weekly_reflections WHERE user_id = ${request.authUser!.id}
      ORDER BY reflection_week DESC LIMIT 12
    `;
    return { reflections, currentWeek: weekStartIso() };
  });

  app.post('/reflections', async (request, reply) => {
    const parsed = z.object({ answer: z.string().trim().min(3).max(1000) }).safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: 'INVALID_REFLECTION' });
    const [reflection] = await sql`
      INSERT INTO weekly_reflections (user_id, reflection_week, answer)
      VALUES (${request.authUser!.id}, ${weekStartIso()}, ${parsed.data.answer})
      ON CONFLICT (user_id, reflection_week) DO UPDATE SET answer = EXCLUDED.answer
      RETURNING id, reflection_week, answer, created_at
    `;
    return reply.code(201).send({ reflection });
  });

  app.get('/journey/:conversationId', async (request, reply) => {
    const params = z.object({ conversationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: 'INVALID_CONVERSATION' });
    const member = await getMembership(params.data.conversationId, request.authUser!.id);
    if (!member) return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' });
    const [journey] = await sql`
      INSERT INTO connection_journeys (match_id, shared_prompt)
      VALUES (${member.matchId}, ${PROMPTS[Math.floor(Math.random() * PROMPTS.length)]!})
      ON CONFLICT (match_id) DO UPDATE SET match_id = EXCLUDED.match_id
      RETURNING stage, shared_prompt, graceful_closed_at, graceful_reason, updated_at
    `;
    const safeDates = await sql`
      SELECT id, venue_name, venue_address, starts_at, check_in_at, status, created_at
      FROM safe_dates WHERE match_id = ${member.matchId} ORDER BY starts_at DESC LIMIT 5
    `;
    return { journey, safeDates };
  });

  app.patch('/journey/:conversationId', async (request, reply) => {
    const params = z.object({ conversationId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ stage: z.enum(['spark','glow','flame','ready_to_meet','date_planned']) }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_JOURNEY' });
    const member = await getMembership(params.data.conversationId, request.authUser!.id);
    if (!member) return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' });
    const [journey] = await sql`
      INSERT INTO connection_journeys (match_id, stage) VALUES (${member.matchId}, ${body.data.stage})
      ON CONFLICT (match_id) DO UPDATE SET stage = EXCLUDED.stage, updated_at = NOW()
      RETURNING stage, shared_prompt, updated_at
    `;
    return { journey };
  });

  app.post('/journey/:conversationId/goodbye', async (request, reply) => {
    const params = z.object({ conversationId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ reason: z.enum(['not_a_match','stepping_away','different_goals','other']), message: z.string().trim().min(3).max(300) }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_GOODBYE' });
    const userId = request.authUser!.id;
    const member = await getMembership(params.data.conversationId, userId);
    if (!member) return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' });
    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO messages (conversation_id, sender_id, content, moderation)
        VALUES (${params.data.conversationId}, ${userId}, ${body.data.message}, ${tx.json({ systemKind: 'graceful_goodbye' })})
      `;
      await tx`
        INSERT INTO connection_journeys (match_id, graceful_closed_at, graceful_closed_by, graceful_reason)
        VALUES (${member.matchId}, NOW(), ${userId}, ${body.data.reason})
        ON CONFLICT (match_id) DO UPDATE SET graceful_closed_at = NOW(), graceful_closed_by = ${userId}, graceful_reason = ${body.data.reason}, updated_at = NOW()
      `;
      await tx`UPDATE matches SET active = FALSE WHERE id = ${member.matchId}`;
    });
    return { closed: true };
  });

  app.post('/safe-dates/:conversationId', async (request, reply) => {
    const params = z.object({ conversationId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({
      venueName: z.string().trim().min(2).max(120),
      venueAddress: z.string().trim().max(250).default(''),
      startsAt: z.string().datetime(),
      trustedContactName: z.string().trim().max(100).default(''),
      trustedContactPhone: z.string().trim().max(40).default(''),
    }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_SAFE_DATE' });
    const member = await getMembership(params.data.conversationId, request.authUser!.id);
    if (!member) return reply.code(404).send({ error: 'CONVERSATION_NOT_FOUND' });
    const [safeDate] = await sql`
      INSERT INTO safe_dates (match_id, created_by, venue_name, venue_address, starts_at, trusted_contact_name, trusted_contact_phone)
      VALUES (${member.matchId}, ${request.authUser!.id}, ${body.data.venueName}, ${body.data.venueAddress}, ${body.data.startsAt}, ${body.data.trustedContactName}, ${body.data.trustedContactPhone})
      RETURNING id, venue_name, venue_address, starts_at, status, created_at
    `;
    await sql`
      INSERT INTO connection_journeys (match_id, stage) VALUES (${member.matchId}, 'date_planned')
      ON CONFLICT (match_id) DO UPDATE SET stage = 'date_planned', updated_at = NOW()
    `;
    return reply.code(201).send({ safeDate });
  });

  app.patch('/safe-dates/:safeDateId/check-in', async (request, reply) => {
    const params = z.object({ safeDateId: z.string().uuid() }).safeParse(request.params);
    const body = z.object({ status: z.enum(['safe','needs_help','cancelled']) }).safeParse(request.body);
    if (!params.success || !body.success) return reply.code(400).send({ error: 'INVALID_CHECK_IN' });
    const [safeDate] = await sql`
      UPDATE safe_dates SET status = ${body.data.status}, check_in_at = NOW()
      WHERE id = ${params.data.safeDateId} AND created_by = ${request.authUser!.id}
      RETURNING id, status, check_in_at
    `;
    if (!safeDate) return reply.code(404).send({ error: 'SAFE_DATE_NOT_FOUND' });
    return { safeDate };
  });

  app.post('/voice-intro', async (request, reply) => {
    const upload = await request.file();
    if (!upload || upload.fieldname !== 'audio') return reply.code(400).send({ error: 'AUDIO_REQUIRED' });
    const buffer = await upload.toBuffer();
    if (!buffer.length || buffer.length > 8 * 1024 * 1024) return reply.code(413).send({ error: 'AUDIO_TOO_LARGE' });
    const extension = upload.mimetype.includes('webm') ? 'webm' : upload.mimetype.includes('wav') ? 'wav' : 'm4a';
    const relativePath = join('voice', request.authUser!.id, `${randomUUID()}.${extension}`).replaceAll('\\', '/');
    const finalPath = join(config.UPLOAD_DIR, relativePath);
    await mkdir(dirname(finalPath), { recursive: true });
    await writeFile(finalPath, buffer, { mode: 0o600 });
    const voiceUrl = `/uploads/${relativePath}`;
    const [old] = await sql<{ voiceIntroUrl: string | null }[]>`SELECT voice_intro_url FROM profiles WHERE user_id = ${request.authUser!.id}`;
    await sql`UPDATE profiles SET voice_intro_url = ${voiceUrl}, voice_intro_duration_seconds = 20 WHERE user_id = ${request.authUser!.id}`;
    if (old?.voiceIntroUrl?.startsWith('/uploads/')) {
      const oldPath = join(config.UPLOAD_DIR, old.voiceIntroUrl.slice('/uploads/'.length));
      await rm(oldPath, { force: true }).catch(() => undefined);
    }
    return reply.code(201).send({ voiceIntroUrl: voiceUrl });
  });
};
