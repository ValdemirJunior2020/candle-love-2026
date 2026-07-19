import { changeBalance } from './tokens.js';

export type ProfilePhotoRow = {
  id: string;
  photoUrl: string;
  mimeType: string;
  position: number;
  createdAt: Date | string;
};

export async function getProfilePhotos(db: any, userId: string): Promise<ProfilePhotoRow[]> {
  return db<ProfilePhotoRow[]>`
    SELECT id, photo_url, mime_type, position, created_at
    FROM profile_photos
    WHERE user_id = ${userId}
    ORDER BY position ASC, created_at ASC
  `;
}

export async function recalculateProfileCompletion(
  db: any,
  userId: string,
): Promise<{ profileComplete: boolean; bonus: number }> {
  const [profile] = await db<{
    profileComplete: boolean;
    bio: string;
    city: string;
    interests: string[];
    promptAnswer: string;
    photoCount: number;
  }[]>`
    SELECT
      p.profile_complete,
      p.bio,
      p.city,
      p.interests,
      p.prompt_answer,
      (SELECT COUNT(*)::int FROM profile_photos pp WHERE pp.user_id = p.user_id) AS photo_count
    FROM profiles p
    WHERE p.user_id = ${userId}
    FOR UPDATE
  `;

  if (!profile) {
    throw new Error('PROFILE_NOT_FOUND');
  }

  const complete =
    profile.bio.trim().length >= 20 &&
    profile.city.trim().length >= 2 &&
    profile.interests.length >= 3 &&
    profile.promptAnswer.trim().length >= 10 &&
    profile.photoCount >= 2;

  await db`
    UPDATE profiles
    SET profile_complete = ${complete}, last_active_at = NOW()
    WHERE user_id = ${userId}
  `;

  let bonus = 0;
  if (complete && !profile.profileComplete) {
    const idempotencyKey = `profile_complete_${userId}`;
    const [existingBonus] = await db<{ id: string }[]>`
      SELECT id FROM wallet_ledger WHERE idempotency_key = ${idempotencyKey}
    `;

    if (!existingBonus) {
      await changeBalance(
        db,
        userId,
        10,
        'profile_completion',
        userId,
        idempotencyKey,
      );
      bonus = 10;
    }
  }

  return { profileComplete: complete, bonus };
}
