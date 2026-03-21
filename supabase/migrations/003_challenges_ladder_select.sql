-- Ladder members need to read challenges on their ladder to know which players
-- already have a pending/accepted incoming challenge (challenge eligibility UX).
DROP POLICY IF EXISTS "Read own challenges" ON challenges;

CREATE POLICY "Read ladder challenges" ON challenges FOR SELECT
  USING (
    challenger_id = auth.uid()
    OR challenged_id = auth.uid()
    OR ladder_id = (SELECT u.ladder_id FROM users u WHERE u.id = auth.uid())
  );
