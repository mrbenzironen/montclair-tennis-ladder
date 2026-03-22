// supabase/functions/auto-confirm/index.ts
// Legacy: previously auto-confirmed matches after 2 hours. Winner reports now finalize immediately.
// Deployed crons can stay; this is a no-op.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async () => {
  return new Response(JSON.stringify({ confirmed: 0, note: 'deprecated' }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
