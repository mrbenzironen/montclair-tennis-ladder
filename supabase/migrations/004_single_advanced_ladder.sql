-- Single ladder: Advanced (4.0+ NTRP). Remove Intermediate; migrate users; fix legacy match timestamps.

-- Point everyone at Advanced
UPDATE users u
SET ladder_id = (SELECT id FROM ladders WHERE name = 'Advanced' LIMIT 1)
WHERE ladder_id IN (SELECT id FROM ladders WHERE name = 'Intermediate');

UPDATE challenges
SET ladder_id = (SELECT id FROM ladders WHERE name = 'Advanced' LIMIT 1)
WHERE ladder_id IN (SELECT id FROM ladders WHERE name = 'Intermediate');

DELETE FROM ladders WHERE name = 'Intermediate';

UPDATE ladders
SET ntrp_range = '4.0+ NTRP or better'
WHERE name = 'Advanced';

-- Legacy matches: treat as finalized for display (winner-report flow is now immediate going forward)
UPDATE matches
SET confirmed_at = COALESCE(confirmed_at, reported_at, created_at)
WHERE confirmed_at IS NULL;

-- Broadcast audience: drop intermediate option
UPDATE broadcasts SET audience = 'advanced' WHERE audience = 'intermediate';

DO $$
DECLARE
  cname text;
BEGIN
  SELECT con.conname INTO cname
  FROM pg_constraint con
  JOIN pg_class rel ON rel.oid = con.conrelid
  JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
  WHERE nsp.nspname = 'public'
    AND rel.relname = 'broadcasts'
    AND con.contype = 'c'
    AND pg_get_constraintdef(con.oid) LIKE '%audience%'
  LIMIT 1;
  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.broadcasts DROP CONSTRAINT %I', cname);
  END IF;
END $$;

ALTER TABLE public.broadcasts ADD CONSTRAINT broadcasts_audience_check
  CHECK (audience IN ('all', 'advanced'));
