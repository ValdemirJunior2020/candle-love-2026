CREATE TABLE IF NOT EXISTS profile_photos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  user_id UUID NOT NULL
    REFERENCES users(id)
    ON DELETE CASCADE,

  photo_url TEXT NOT NULL,

  mime_type TEXT NOT NULL
    DEFAULT 'image/jpeg',

  position SMALLINT NOT NULL
    CHECK (position BETWEEN 1 AND 6),

  created_at TIMESTAMPTZ NOT NULL
    DEFAULT NOW(),

  CONSTRAINT uq_profile_photos_position
    UNIQUE (user_id, position)
    DEFERRABLE INITIALLY IMMEDIATE,

  CONSTRAINT uq_profile_photos_url
    UNIQUE (photo_url)
);

CREATE INDEX IF NOT EXISTS idx_profile_photos_user_position
  ON profile_photos(user_id, position);

INSERT INTO profile_photos (
  user_id,
  photo_url,
  mime_type,
  position
)
SELECT
  p.user_id,
  p.photo_url,
  'image/jpeg',
  1
FROM profiles AS p
WHERE p.photo_url IS NOT NULL
  AND trim(p.photo_url) <> ''
  AND NOT EXISTS (
    SELECT 1
    FROM profile_photos AS pp
    WHERE pp.user_id = p.user_id
  )
ON CONFLICT (photo_url) DO NOTHING;