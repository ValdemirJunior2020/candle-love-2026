import { randomUUID } from 'node:crypto';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { config } from '../config.js';
import { sql } from '../db.js';
import { authenticate, clearSession } from '../services/auth.js';
import { moderateMessage, moderationMessage } from '../services/moderation.js';
import { verifyPassword } from '../services/password.js';
import {
  getProfilePhotos,
  recalculateProfileCompletion,
} from '../services/profile-photos.js';

const updateSchema = z.object({
  bio: z.string().trim().max(500),
  city: z.string().trim().max(100),
  interests: z.array(z.string().trim().min(1).max(40)).max(10),
  promptAnswer: z.string().trim().max(300),
  intentions: z.enum(['relationship', 'friendship', 'unsure']),
});

const orderSchema = z.object({
  photoIds: z.array(z.string().uuid()).min(1).max(6),
});

type ImageType = {
  extension: 'jpg' | 'png' | 'webp';
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
};

function detectImageType(buffer: Buffer): ImageType | null {
  if (
    buffer.length >= 3 &&
    buffer[0] === 0xff &&
    buffer[1] === 0xd8 &&
    buffer[2] === 0xff
  ) {
    return { extension: 'jpg', mimeType: 'image/jpeg' };
  }

  if (
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { extension: 'png', mimeType: 'image/png' };
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP'
  ) {
    return { extension: 'webp', mimeType: 'image/webp' };
  }

  return null;
}

function localFilePath(photoUrl: string): string | null {
  const prefix = '/uploads/';
  if (!photoUrl.startsWith(prefix)) return null;

  const relativePath = photoUrl.slice(prefix.length);
  const candidate = resolve(config.UPLOAD_DIR, relativePath);
  const uploadRoot = resolve(config.UPLOAD_DIR);

  if (!candidate.startsWith(`${uploadRoot}/`) && candidate !== uploadRoot) {
    return null;
  }

  return candidate;
}

async function removePhotoFile(photoUrl: string): Promise<void> {
  const path = localFilePath(photoUrl);
  if (!path) return;
  await rm(path, { force: true }).catch(() => undefined);
}

export const profileRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', authenticate);

  app.get('/photos', async (request) => {
    const photos = await getProfilePhotos(sql, request.authUser!.id);
    return {
      photos,
      rules: { minimum: 2, recommended: 4, maximum: 6 },
    };
  });

  app.post(
    '/photos',
    { config: { rateLimit: { max: 12, timeWindow: '1 hour' } } },
    async (request, reply) => {
      const userId = request.authUser!.id;
      const upload = await request.file();

      if (!upload || upload.fieldname !== 'photo') {
        return reply.code(400).send({ error: 'PHOTO_REQUIRED' });
      }

      let buffer: Buffer;
      try {
        buffer = await upload.toBuffer();
      } catch (error) {
        request.log.warn({ err: error }, 'Profile photo exceeded upload limits');
        return reply.code(413).send({ error: 'PHOTO_TOO_LARGE' });
      }

      if (upload.file.truncated) {
        return reply.code(413).send({ error: 'PHOTO_TOO_LARGE' });
      }

      if (buffer.length === 0) {
        return reply.code(400).send({ error: 'PHOTO_REQUIRED' });
      }

      const detected = detectImageType(buffer);
      if (!detected) {
        return reply.code(415).send({ error: 'UNSUPPORTED_PHOTO_TYPE' });
      }

      const fileName = `${randomUUID()}.${detected.extension}`;
      const relativePath = join('profile', userId, fileName).replaceAll('\\', '/');
      const photoUrl = `/uploads/${relativePath}`;
      const finalPath = join(config.UPLOAD_DIR, relativePath);
      const temporaryPath = `${finalPath}.uploading`;

      await mkdir(dirname(finalPath), { recursive: true });
      await writeFile(temporaryPath, buffer, { mode: 0o600 });

      let fileMoved = false;

      try {
        const result = await sql.begin(async (tx) => {
          await tx`
            SELECT user_id
            FROM profiles
            WHERE user_id = ${userId}
            FOR UPDATE
          `;

          const [countRow] = await tx<{ count: number }[]>`
            SELECT COUNT(*)::int AS count
            FROM profile_photos
            WHERE user_id = ${userId}
          `;
          const count = countRow?.count ?? 0;

          if (count >= 6) {
            throw new Error('MAXIMUM_SIX_PHOTOS');
          }

          const [photo] = await tx<{
            id: string;
            photoUrl: string;
            mimeType: string;
            position: number;
            createdAt: Date;
          }[]>`
            INSERT INTO profile_photos (
              user_id,
              photo_url,
              mime_type,
              position
            )
            VALUES (
              ${userId},
              ${photoUrl},
              ${detected.mimeType},
              ${count + 1}
            )
            RETURNING id, photo_url, mime_type, position, created_at
          `;

          if (count === 0) {
            await tx`
              UPDATE profiles
              SET photo_url = ${photoUrl}
              WHERE user_id = ${userId}
            `;
          }

          const completion = await recalculateProfileCompletion(tx, userId);

          await rename(temporaryPath, finalPath);
          fileMoved = true;

          return { photo, completion };
        });

        return reply.code(201).send({
          photo: result.photo,
          profileComplete: result.completion.profileComplete,
          bonus: result.completion.bonus,
        });
      } catch (error) {
        await rm(temporaryPath, { force: true }).catch(() => undefined);
        if (fileMoved) {
          await rm(finalPath, { force: true }).catch(() => undefined);
        }

        if (String(error).includes('MAXIMUM_SIX_PHOTOS')) {
          return reply.code(409).send({ error: 'MAXIMUM_SIX_PHOTOS' });
        }

        throw error;
      }
    },
  );

  app.patch('/photos/order', async (request, reply) => {
    const parsed = orderSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'INVALID_PHOTO_ORDER', details: parsed.error.flatten() });
    }

    const userId = request.authUser!.id;
    const uniqueIds = new Set(parsed.data.photoIds);
    if (uniqueIds.size !== parsed.data.photoIds.length) {
      return reply.code(400).send({ error: 'INVALID_PHOTO_ORDER' });
    }

    const result = await sql.begin(async (tx) => {
      const existing = await tx<{ id: string }[]>`
        SELECT id
        FROM profile_photos
        WHERE user_id = ${userId}
        ORDER BY position
        FOR UPDATE
      `;

      const existingIds = new Set(existing.map((photo) => photo.id));
      const sameSet =
        existing.length === parsed.data.photoIds.length &&
        parsed.data.photoIds.every((id) => existingIds.has(id));

      if (!sameSet) {
        return null;
      }

      await tx.unsafe('SET CONSTRAINTS uq_profile_photos_position DEFERRED');

      for (const [index, photoId] of parsed.data.photoIds.entries()) {
        await tx`
          UPDATE profile_photos
          SET position = ${index + 1}
          WHERE id = ${photoId} AND user_id = ${userId}
        `;
      }

      const photos = await getProfilePhotos(tx, userId);
      await tx`
        UPDATE profiles
        SET photo_url = ${photos[0]?.photoUrl ?? null}, last_active_at = NOW()
        WHERE user_id = ${userId}
      `;

      return photos;
    });

    if (!result) {
      return reply.code(400).send({ error: 'INVALID_PHOTO_ORDER' });
    }

    return { photos: result };
  });

  app.delete('/photos/:photoId', async (request, reply) => {
    const parsed = z
      .object({ photoId: z.string().uuid() })
      .safeParse(request.params);

    if (!parsed.success) {
      return reply.code(400).send({ error: 'INVALID_PHOTO_ID' });
    }

    const userId = request.authUser!.id;

    const result = await sql.begin(async (tx) => {
      await tx`
        SELECT user_id
        FROM profiles
        WHERE user_id = ${userId}
        FOR UPDATE
      `;

      const photos = await getProfilePhotos(tx, userId);
      const target = photos.find((photo) => photo.id === parsed.data.photoId);

      if (!target) return { status: 'not_found' as const };
      if (photos.length <= 2) return { status: 'minimum' as const };

      await tx`DELETE FROM profile_photos WHERE id = ${target.id} AND user_id = ${userId}`;

      const remaining = photos.filter((photo) => photo.id !== target.id);
      await tx.unsafe('SET CONSTRAINTS uq_profile_photos_position DEFERRED');

      for (const [index, photo] of remaining.entries()) {
        await tx`
          UPDATE profile_photos
          SET position = ${index + 1}
          WHERE id = ${photo.id} AND user_id = ${userId}
        `;
      }

      await tx`
        UPDATE profiles
        SET photo_url = ${remaining[0]?.photoUrl ?? null}, last_active_at = NOW()
        WHERE user_id = ${userId}
      `;

      const completion = await recalculateProfileCompletion(tx, userId);
      return {
        status: 'deleted' as const,
        photoUrl: target.photoUrl,
        photos: await getProfilePhotos(tx, userId),
        profileComplete: completion.profileComplete,
      };
    });

    if (result.status === 'not_found') {
      return reply.code(404).send({ error: 'PHOTO_NOT_FOUND' });
    }

    if (result.status === 'minimum') {
      return reply.code(409).send({ error: 'MINIMUM_TWO_PHOTOS' });
    }

    await removePhotoFile(result.photoUrl);
    return {
      photos: result.photos,
      profileComplete: result.profileComplete,
    };
  });

  app.patch('/', async (request, reply) => {
    const parsed = updateSchema.safeParse(request.body);
    if (!parsed.success) {
      return reply
        .code(400)
        .send({ error: 'INVALID_PROFILE', details: parsed.error.flatten() });
    }

    const userId = request.authUser!.id;
    const [user] = await sql<{ trustLevel: number }[]>`
      SELECT trust_level
      FROM users
      WHERE id = ${userId} AND status = 'active'
    `;

    if (!user) {
      return reply.code(404).send({ error: 'USER_NOT_FOUND' });
    }

    for (const value of [parsed.data.bio, parsed.data.promptAnswer]) {
      const result = moderateMessage(value, user.trustLevel);
      if (!result.allowed) {
        return reply.code(422).send({
          error: 'PROFILE_TEXT_BLOCKED',
          reason: result.reason,
          message: moderationMessage[result.reason!],
        });
      }
    }

    const result = await sql.begin(async (tx) => {
      const [profile] = await tx`
        UPDATE profiles
        SET
          bio = ${parsed.data.bio},
          city = ${parsed.data.city},
          interests = ${parsed.data.interests},
          prompt_answer = ${parsed.data.promptAnswer},
          intentions = ${parsed.data.intentions},
          last_active_at = NOW()
        WHERE user_id = ${userId}
        RETURNING bio, city, interests, prompt_answer, intentions
      `;

      const completion = await recalculateProfileCompletion(tx, userId);
      await tx`UPDATE users SET updated_at = NOW() WHERE id = ${userId}`;

      return {
        profile: {
          ...profile,
          profileComplete: completion.profileComplete,
        },
        bonus: completion.bonus,
        photos: await getProfilePhotos(tx, userId),
      };
    });

    return result;
  });

  app.delete('/account', async (request, reply) => {
    const parsed = z
      .object({ password: z.string().min(1) })
      .safeParse(request.body);

    if (!parsed.success) {
      return reply.code(400).send({ error: 'PASSWORD_REQUIRED' });
    }

    const userId = request.authUser!.id;
    const [user] = await sql<{ passwordHash: string }[]>`
      SELECT password_hash FROM users WHERE id = ${userId}
    `;

    if (!user || !(await verifyPassword(parsed.data.password, user.passwordHash))) {
      return reply.code(401).send({ error: 'INVALID_PASSWORD' });
    }

    const photos = await getProfilePhotos(sql, userId);

    await sql.begin(async (tx) => {
      await tx`
        UPDATE users
        SET
          status = 'deleted',
          email = ${`deleted+${userId}@invalid.local`},
          display_name = 'Deleted User',
          password_hash = 'deleted',
          updated_at = NOW()
        WHERE id = ${userId}
      `;
      await tx`DELETE FROM profile_photos WHERE user_id = ${userId}`;
      await tx`
        UPDATE profiles
        SET
          bio = '',
          city = '',
          photo_url = NULL,
          interests = '{}',
          prompt_answer = '',
          profile_complete = FALSE
        WHERE user_id = ${userId}
      `;
      await tx`
        UPDATE refresh_sessions
        SET revoked_at = NOW()
        WHERE user_id = ${userId} AND revoked_at IS NULL
      `;
    });

    await Promise.all(photos.map((photo) => removePhotoFile(photo.photoUrl)));
    clearSession(reply);
    return reply.code(204).send();
  });
};
