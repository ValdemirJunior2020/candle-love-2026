import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";
import { sql } from "../db.js";
import { emitConversationMessage } from "../realtime.js";
import { authenticate } from "../services/auth.js";
import { moderateMessage, moderationMessage } from "../services/moderation.js";
import { changeBalance } from "../services/tokens.js";

const messageSchema = z.object({ content: z.string().max(1500).default(""), giftId: z.string().uuid().optional() });

async function membership(conversationId: string, userId: string) {
  const [row] = await sql<{
    id: string; matchId: string; userA: string; userB: string; unlockedAt: Date | null;
    freeMessageLimit: number; messageCount: number; trustLevel: number;
  }[]>`
    SELECT c.id, c.match_id, m.user_a, m.user_b, c.unlocked_at, c.free_message_limit,
           (SELECT COUNT(*)::int FROM messages WHERE conversation_id = c.id) AS message_count,
           u.trust_level
    FROM conversations c JOIN matches m ON m.id = c.match_id JOIN users u ON u.id = ${userId}
    WHERE c.id = ${conversationId} AND m.active = TRUE AND (m.user_a = ${userId} OR m.user_b = ${userId})
  `;
  return row;
}

export const chatRoutes: FastifyPluginAsync = async (app) => {
  app.addHook("preHandler", authenticate);

  app.get("/:conversationId/messages", async (request, reply) => {
    const params = z.object({ conversationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "INVALID_CONVERSATION" });
    if (!(await membership(params.data.conversationId, request.authUser!.id))) return reply.code(404).send({ error: "CONVERSATION_NOT_FOUND" });
    const messages = await sql`
      SELECT msg.id, msg.content, msg.created_at, msg.sender_id, msg.gift_id,
             g.name AS gift_name, g.image_path AS gift_image
      FROM messages msg LEFT JOIN gifts g ON g.id = msg.gift_id
      WHERE msg.conversation_id = ${params.data.conversationId}
      ORDER BY msg.created_at ASC LIMIT 200
    `;
    return { messages };
  });

  app.post("/:conversationId/messages", async (request, reply) => {
    const params = z.object({ conversationId: z.string().uuid() }).safeParse(request.params);
    const body = messageSchema.safeParse(request.body);
    if (!params.success || !body.success || (!body.data.content.trim() && !body.data.giftId)) return reply.code(400).send({ error: "INVALID_MESSAGE" });
    const userId = request.authUser!.id;
    const member = await membership(params.data.conversationId, userId);
    if (!member) return reply.code(404).send({ error: "CONVERSATION_NOT_FOUND" });

    const otherId = member.userA === userId ? member.userB : member.userA;
    const [blocked] = await sql`SELECT 1 FROM blocks WHERE (blocker_id = ${userId} AND blocked_id = ${otherId}) OR (blocker_id = ${otherId} AND blocked_id = ${userId})`;
    if (blocked) return reply.code(403).send({ error: "CONVERSATION_BLOCKED" });

    const moderation = moderateMessage(body.data.content, member.trustLevel);
    if (!moderation.allowed) return reply.code(422).send({ error: "MESSAGE_BLOCKED", reason: moderation.reason, message: moderationMessage[moderation.reason!] });
    if (!member.unlockedAt && member.messageCount >= member.freeMessageLimit) {
      return reply.code(402).send({ error: "CHAT_LOCKED", unlockCost: 15 });
    }

    try {
      const message = await sql.begin(async (tx) => {
        let gift: { id: string; cost: number; name: string; imagePath: string } | undefined;
        if (body.data.giftId) {
          [gift] = await tx<typeof gift[]>`SELECT id, cost, name, image_path FROM gifts WHERE id = ${body.data.giftId} AND active = TRUE`;
          if (!gift) throw new Error("GIFT_NOT_FOUND");
          await changeBalance(tx, userId, -gift.cost, "gift_sent", gift.id);
        }
        const [created] = await tx`
          INSERT INTO messages (conversation_id, sender_id, content, gift_id, moderation)
          VALUES (${params.data.conversationId}, ${userId}, ${moderation.sanitized}, ${gift?.id ?? null}, ${tx.json({ flags: moderation.flags })})
          RETURNING id, conversation_id, sender_id, content, gift_id, created_at
        `;
        return { ...created, giftName: gift?.name, giftImage: gift?.imagePath };
      });
      emitConversationMessage(params.data.conversationId, message);
      return reply.code(201).send({ message });
    } catch (error) {
      if (String(error).includes("INSUFFICIENT_SPARKS")) return reply.code(402).send({ error: "INSUFFICIENT_SPARKS" });
      if (String(error).includes("GIFT_NOT_FOUND")) return reply.code(404).send({ error: "GIFT_NOT_FOUND" });
      throw error;
    }
  });

  app.post("/:conversationId/unlock", async (request, reply) => {
    const params = z.object({ conversationId: z.string().uuid() }).safeParse(request.params);
    if (!params.success) return reply.code(400).send({ error: "INVALID_CONVERSATION" });
    const userId = request.authUser!.id;
    if (!(await membership(params.data.conversationId, userId))) return reply.code(404).send({ error: "CONVERSATION_NOT_FOUND" });
    try {
      const result = await sql.begin(async (tx) => {
        const [conversation] = await tx<{ unlockedAt: Date | null }[]>`SELECT unlocked_at FROM conversations WHERE id = ${params.data.conversationId} FOR UPDATE`;
        if (conversation?.unlockedAt) return { alreadyUnlocked: true };
        const balance = await changeBalance(tx, userId, -15, "chat_unlock", params.data.conversationId);
        await tx`UPDATE conversations SET unlocked_at = NOW(), unlocked_by = ${userId} WHERE id = ${params.data.conversationId}`;
        return { unlocked: true, balance };
      });
      return result;
    } catch (error) {
      if (String(error).includes("INSUFFICIENT_SPARKS")) return reply.code(402).send({ error: "INSUFFICIENT_SPARKS", unlockCost: 15 });
      throw error;
    }
  });
};
