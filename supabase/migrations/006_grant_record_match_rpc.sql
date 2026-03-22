-- Allow logged-in clients to call the stats RPC (required for PostgREST rpc() from the app).
GRANT EXECUTE ON FUNCTION public.record_match_for_users(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_match_for_users(uuid, uuid) TO service_role;
