import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { authenticate } from "../services/auth.js";
import { changeBalance } from "../services/tokens.js";

const swipeSchema = z.object({ targetUserId: z.string().uuid(), decision: z.enum(["pass", "spark", "super_spark"]) });

export const discoveryRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  app.get("/", async (request) => {
    const userId = request.authUser!.id;
    const profiles = await sql`
      SELECT u.id, u.display_name, EXTRACT(YEAR FROM age(u.birth_date))::int AS age,
             u.verified, u.trust_level, p.bio, p.city, p.photo_url, p.interests, p.prompt_answer, p.relationship_intention, p.voice_intro_url,
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
      FROM users u JOIN profiles p ON p.user_id = u.id
      WHERE u.id <> ${userId} AND u.status = 'active' AND p.profile_complete = TRUE
        AND NOT EXISTS (SELECT 1 FROM swipes s WHERE s.actor_id = ${userId} AND s.target_id = u.id)
        AND NOT EXISTS (SELECT 1 FROM blocks b WHERE (b.blocker_id = ${userId} AND b.blocked_id = u.id) OR (b.blocker_id = u.id AND b.blocked_id = ${userId}))
      ORDER BY u.verified DESC, p.last_active_at DESC
      LIMIT 3
    `;
    const enriched = profiles.map((profile: any) => {
      const sharedInterests = Array.isArray(profile.interests) ? profile.interests.slice(0, 3) : [];
      const reasons = [
        profile.relationshipIntention === 'marriage_minded'
          ? 'You are both looking for commitment'
          : 'Your relationship goals are visible and intentional',
        sharedInterests.length
          ? `Shared interests: ${sharedInterests.join(', ')}`
          : 'You both completed an intentional profile',
        profile.voiceIntroUrl ? 'A 20-second Voice Candle is available' : 'Their profile prompt gives you a conversation starter',
      ];
      return { ...profile, compatibilityReasons: reasons, compatibilityScore: profile.verified ? 86 : 78 };
    });
    return { profiles: enriched };
  });

  app.post("/swipe", async (request, reply) => {
    const parsed = swipeSchema.safeParse(request.body);
    if (!parsed.success) return reply.code(400).send({ error: "INVALID_INPUT" });
    const userId = request.authUser!.id;
    if (userId === parsed.data.targetUserId) return reply.code(400).send({ error: "INVALID_TARGET" });
    const [daily] = await sql<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM swipes
      WHERE actor_id = ${userId} AND created_at >= date_trunc('day', NOW())
    `;
    if ((daily?.count ?? 0) >= 3) return reply.code(429).send({ error: "DAILY_INTRODUCTION_LIMIT" });

    try {
      const result = await sql.begin(async (tx) => {
        if (parsed.data.decision === "super_spark") {
          await changeBalance(tx, userId, -5, "super_spark", parsed.data.targetUserId);
        }
        await tx`
          INSERT INTO swipes (actor_id, target_id, decision)
          VALUES (${userId}, ${parsed.data.targetUserId}, ${parsed.data.decision})
          ON CONFLICT (actor_id, target_id) DO UPDATE SET decision = EXCLUDED.decision, created_at = NOW()
        `;

        if (parsed.data.decision === "pass") return { matched: false };
        const [mutual] = await tx<{ id: string }[]>`
          SELECT id FROM swipes WHERE actor_id = ${parsed.data.targetUserId} AND target_id = ${userId}
          AND decision IN ('spark', 'super_spark')
        `;
        if (!mutual) return { matched: false };

        const pair = [userId, parsed.data.targetUserId].sort();
        const a = pair[0]!;
        const b = pair[1]!;
        const [match] = await tx<{ id: string }[]>`
          INSERT INTO matches (user_a, user_b) VALUES (${a}, ${b})
          ON CONFLICT (user_a, user_b) DO UPDATE SET active = TRUE
          RETURNING id
        `;
        if (!match) throw new Error("MATCH_FAILED");
        await tx`
          INSERT INTO connection_journeys (match_id)
          VALUES (${match.id})
          ON CONFLICT (match_id) DO NOTHING
        `;
        const [conversation] = await tx<{ id: string }[]>`
          INSERT INTO conversations (match_id) VALUES (${match.id})
          ON CONFLICT (match_id) DO UPDATE SET match_id = EXCLUDED.match_id
          RETURNING id
        `;
        return { matched: true, matchId: match.id, conversationId: conversation?.id };
      });
      return result;
    } catch (error) {
      if (String(error).includes("INSUFFICIENT_SPARKS")) return reply.code(402).send({ error: "INSUFFICIENT_SPARKS" });
      throw error;
    }
  });

  app.get("/matches", async (request) => {
    const userId = request.authUser!.id;
    const matches = await sql`
      SELECT m.id, c.id AS conversation_id, c.unlocked_at, c.free_message_limit,
             u.id AS user_id, u.display_name, u.verified, p.photo_url, p.bio, p.voice_intro_url, p.relationship_intention,
             COALESCE(j.stage, 'spark') AS journey_stage,
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
             ) AS photos,
             (SELECT COUNT(*)::int FROM messages msg WHERE msg.conversation_id = c.id) AS message_count
      FROM matches m
      JOIN conversations c ON c.match_id = m.id
      JOIN users u ON u.id = CASE WHEN m.user_a = ${userId} THEN m.user_b ELSE m.user_a END
      JOIN profiles p ON p.user_id = u.id
      LEFT JOIN connection_journeys j ON j.match_id = m.id
      WHERE m.active = TRUE AND (m.user_a = ${userId} OR m.user_b = ${userId})
      ORDER BY m.created_at DESC
    `;
    return { matches };
  });
};
