import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { authenticate } from "../services/auth.js";

export const safetyRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  app.post("/block", async (request, reply) => {
    const parsed = z.object({ userId: z.string().uuid() }).safeParse(request.body);
    if (!parsed.success || parsed.data.userId === request.authUser!.id) return reply.code(400).send({ error: "INVALID_USER" });
    await sql`INSERT INTO blocks (blocker_id, blocked_id) VALUES (${request.authUser!.id}, ${parsed.data.userId}) ON CONFLICT DO NOTHING`;
    return reply.code(201).send({ blocked: true });
  });

  app.post("/report", async (request, reply) => {
    const parsed = z.object({
      userId: z.string().uuid(), conversationId: z.string().uuid().optional(),
      category: z.enum(["harassment", "hate", "sexual", "scam", "impersonation", "underage", "other"]),
      details: z.string().max(1000).default("")
    }).safeParse(request.body);
    if (!parsed.success || parsed.data.userId === request.authUser!.id) return reply.code(400).send({ error: "INVALID_REPORT" });
    const [report] = await sql`
      INSERT INTO reports (reporter_id, reported_id, conversation_id, category, details)
      VALUES (${request.authUser!.id}, ${parsed.data.userId}, ${parsed.data.conversationId ?? null}, ${parsed.data.category}, ${parsed.data.details})
      RETURNING id, status, created_at
    `;
    return reply.code(201).send({ report });
  });
};
