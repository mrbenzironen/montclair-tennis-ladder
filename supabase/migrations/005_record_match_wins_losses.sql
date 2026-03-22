-- Record wins/losses (and matches_played + wildcards) when a match is finalized.
-- Replaces calling increment_matches_played twice without updating wins/losses.

CREATE OR REPLACE FUNCTION record_match_for_users(winner_id uuid, loser_id uuid)
RETURNS void AS $$
DECLARE
  new_winner_mp integer;
  new_loser_mp integer;
BEGIN
  UPDATE users
  SET
    matches_played = matches_played + 1,
    wins = wins + 1,
    last_active_at = now(),
    is_hidden = false
  WHERE id = winner_id
  RETURNING matches_played INTO new_winner_mp;

  IF new_winner_mp % 5 = 0 THEN
    UPDATE users SET wildcards = wildcards + 1 WHERE id = winner_id;
  END IF;

  UPDATE users
  SET
    matches_played = matches_played + 1,
    losses = losses + 1,
    last_active_at = now(),
    is_hidden = false
  WHERE id = loser_id
  RETURNING matches_played INTO new_loser_mp;

  IF new_loser_mp % 5 = 0 THEN
    UPDATE users SET wildcards = wildcards + 1 WHERE id = loser_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Reconcile wins/losses (and matches_played) from match history
UPDATE users SET wins = 0, losses = 0;

UPDATE users u SET wins = agg.c
FROM (
  SELECT winner_id AS id, COUNT(*)::int AS c
  FROM matches
  WHERE confirmed_at IS NOT NULL
  GROUP BY winner_id
) agg
WHERE u.id = agg.id;

UPDATE users u SET losses = agg.c
FROM (
  SELECT loser_id AS id, COUNT(*)::int AS c
  FROM matches
  WHERE confirmed_at IS NOT NULL
  GROUP BY loser_id
) agg
WHERE u.id = agg.id;

-- matches_played may include forfeit-only bumps (no match row); do not force it to wins+losses here.
