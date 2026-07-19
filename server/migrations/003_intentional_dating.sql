ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS voice_intro_url TEXT,
  ADD COLUMN IF NOT EXISTS voice_intro_duration_seconds SMALLINT,
  ADD COLUMN IF NOT EXISTS relationship_intention TEXT NOT NULL DEFAULT 'long_term'
    CHECK (relationship_intention IN ('marriage_minded','long_term','building_commitment','discovering','friendship_first'));

CREATE TABLE IF NOT EXISTS compatibility_answers (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_key TEXT NOT NULL,
  answer_value SMALLINT NOT NULL CHECK (answer_value BETWEEN 1 AND 5),
  importance SMALLINT NOT NULL DEFAULT 3 CHECK (importance BETWEEN 1 AND 5),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, question_key)
);

CREATE TABLE IF NOT EXISTS connection_journeys (
  match_id UUID PRIMARY KEY REFERENCES matches(id) ON DELETE CASCADE,
  stage TEXT NOT NULL DEFAULT 'spark' CHECK (stage IN ('spark','glow','flame','ready_to_meet','date_planned')),
  shared_prompt TEXT,
  graceful_closed_at TIMESTAMPTZ,
  graceful_closed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  graceful_reason TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS weekly_reflections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reflection_week DATE NOT NULL,
  answer TEXT NOT NULL CHECK (char_length(answer) BETWEEN 3 AND 1000),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, reflection_week)
);

CREATE TABLE IF NOT EXISTS safe_dates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  venue_name TEXT NOT NULL,
  venue_address TEXT NOT NULL DEFAULT '',
  starts_at TIMESTAMPTZ NOT NULL,
  trusted_contact_name TEXT NOT NULL DEFAULT '',
  trusted_contact_phone TEXT NOT NULL DEFAULT '',
  check_in_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned','safe','needs_help','cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_compatibility_answers_user ON compatibility_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_reflections_user_week ON weekly_reflections(user_id, reflection_week DESC);
CREATE INDEX IF NOT EXISTS idx_safe_dates_match ON safe_dates(match_id, starts_at DESC);

INSERT INTO connection_journeys (match_id)
SELECT id FROM matches
ON CONFLICT (match_id) DO NOTHING;
