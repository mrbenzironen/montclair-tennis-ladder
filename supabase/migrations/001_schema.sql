-- ============================================================
-- Montclair Tennis Ladder — Database Schema
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── Ladders ──────────────────────────────────────────────────
CREATE TABLE ladders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  ntrp_range text NOT NULL,
  created_at timestamptz DEFAULT now()
);

INSERT INTO ladders (name, ntrp_range) VALUES
  ('Intermediate', '3.5–4.5'),
  ('Advanced', '4.5+');

-- ── Users ────────────────────────────────────────────────────
CREATE TABLE users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  email text,
  phone text NOT NULL DEFAULT '',
  ntrp text,
  ladder_id uuid REFERENCES ladders(id),
  photo_url text,
  rank integer,
  wins integer NOT NULL DEFAULT 0,
  losses integer NOT NULL DEFAULT 0,
  wildcards integer NOT NULL DEFAULT 0,
  matches_played integer NOT NULL DEFAULT 0,
  consecutive_forfeits integer NOT NULL DEFAULT 0,
  is_admin boolean NOT NULL DEFAULT false,
  is_hidden boolean NOT NULL DEFAULT false,
  on_leave boolean NOT NULL DEFAULT false,
  leave_start date,
  leave_return date,
  last_active_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ── Challenges ───────────────────────────────────────────────
CREATE TABLE challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  challenged_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ladder_id uuid NOT NULL REFERENCES ladders(id),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','accepted','declined','expired','completed','withdrawn')),
  is_wildcard boolean NOT NULL DEFAULT false,
  deadline_respond timestamptz NOT NULL,
  deadline_play timestamptz,
  match_id uuid,
  created_at timestamptz DEFAULT now()
);

-- ── Matches ──────────────────────────────────────────────────
CREATE TABLE matches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES challenges(id),
  winner_id uuid NOT NULL REFERENCES users(id),
  loser_id uuid NOT NULL REFERENCES users(id),
  winner_score integer,
  loser_score integer,
  reported_by uuid NOT NULL REFERENCES users(id),
  reported_at timestamptz NOT NULL DEFAULT now(),
  confirmed_at timestamptz,
  auto_confirmed boolean NOT NULL DEFAULT false,
  rank_change integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- ── Invites ──────────────────────────────────────────────────
CREATE TABLE invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  phone text NOT NULL,
  token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(12), 'hex'),
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','joined','expired')),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
  joined_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- ── Broadcasts ───────────────────────────────────────────────
CREATE TABLE broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES users(id),
  audience text NOT NULL CHECK (audience IN ('all','intermediate','advanced')),
  channel text NOT NULL CHECK (channel IN ('sms','inapp','both')),
  body text NOT NULL,
  recipient_count integer NOT NULL DEFAULT 0,
  sent_at timestamptz DEFAULT now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE ladders ENABLE ROW LEVEL SECURITY;

-- Ladders: everyone can read
CREATE POLICY "Anyone can read ladders" ON ladders FOR SELECT USING (true);

-- Users: read own row + same ladder; update own row
CREATE POLICY "Users can read same ladder" ON users FOR SELECT
  USING (
    auth.uid() = id
    OR ladder_id = (SELECT ladder_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Users can update own row" ON users FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own row" ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Admins can delete users" ON users FOR DELETE
  USING (
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
    OR auth.uid() = id
  );

-- Challenges: read if involved; insert as challenger; update status as challenged
CREATE POLICY "Read own challenges" ON challenges FOR SELECT
  USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

CREATE POLICY "Insert own challenges" ON challenges FOR INSERT
  WITH CHECK (challenger_id = auth.uid());

CREATE POLICY "Update challenge status" ON challenges FOR UPDATE
  USING (challenged_id = auth.uid() OR challenger_id = auth.uid());

-- Matches: read if involved or same ladder
CREATE POLICY "Read own matches" ON matches FOR SELECT
  USING (
    winner_id = auth.uid()
    OR loser_id = auth.uid()
    OR (
      SELECT ladder_id FROM users WHERE id = winner_id
    ) = (SELECT ladder_id FROM users WHERE id = auth.uid())
  );

CREATE POLICY "Insert own matches" ON matches FOR INSERT
  WITH CHECK (reported_by = auth.uid());

CREATE POLICY "Update own matches" ON matches FOR UPDATE
  USING (winner_id = auth.uid() OR loser_id = auth.uid());

-- Invites: read and insert own
CREATE POLICY "Read own invites" ON invites FOR SELECT
  USING (inviter_id = auth.uid());

CREATE POLICY "Insert own invites" ON invites FOR INSERT
  WITH CHECK (inviter_id = auth.uid());

-- Broadcasts: read all; insert only admins
CREATE POLICY "Anyone can read broadcasts" ON broadcasts FOR SELECT USING (true);

CREATE POLICY "Only admins can send broadcasts" ON broadcasts FOR INSERT
  WITH CHECK (
    (SELECT is_admin FROM users WHERE id = auth.uid()) = true
  );

-- ============================================================
-- Helper Functions
-- ============================================================

-- Increment matches_played and check for wildcard threshold
CREATE OR REPLACE FUNCTION increment_matches_played(user_id uuid)
RETURNS void AS $$
DECLARE
  new_count integer;
BEGIN
  UPDATE users
  SET
    matches_played = matches_played + 1,
    last_active_at = now(),
    is_hidden = false
  WHERE id = user_id
  RETURNING matches_played INTO new_count;

  -- Award wildcard every 5 matches
  IF new_count % 5 = 0 THEN
    UPDATE users SET wildcards = wildcards + 1 WHERE id = user_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Shift ranks down between two values (for ranking updates)
CREATE OR REPLACE FUNCTION shift_ranks_down(
  from_rank integer,
  to_rank integer,
  ladder_id_param uuid
)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET rank = rank + 1
  WHERE
    ladder_id = ladder_id_param
    AND rank >= from_rank
    AND rank <= to_rank;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-create user profile on sign-up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- Indexes for performance
-- ============================================================

CREATE INDEX idx_users_ladder_id ON users(ladder_id);
CREATE INDEX idx_users_rank ON users(rank);
CREATE INDEX idx_challenges_challenger ON challenges(challenger_id);
CREATE INDEX idx_challenges_challenged ON challenges(challenged_id);
CREATE INDEX idx_challenges_status ON challenges(status);
CREATE INDEX idx_matches_winner ON matches(winner_id);
CREATE INDEX idx_matches_loser ON matches(loser_id);
CREATE INDEX idx_matches_challenge ON matches(challenge_id);
