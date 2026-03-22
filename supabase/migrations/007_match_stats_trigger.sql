-- Record wins/losses when a match row is inserted (server-side; no client RPC permission needed).
CREATE OR REPLACE FUNCTION public.trg_matches_record_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.record_match_for_users(NEW.winner_id, NEW.loser_id);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_matches_record_stats ON public.matches;
CREATE TRIGGER trg_matches_record_stats
AFTER INSERT ON public.matches
FOR EACH ROW
EXECUTE FUNCTION public.trg_matches_record_stats();

-- Rank updates from the app use this RPC; ensure clients can invoke it.
GRANT EXECUTE ON FUNCTION public.shift_ranks_down(integer, integer, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.shift_ranks_down(integer, integer, uuid) TO service_role;
