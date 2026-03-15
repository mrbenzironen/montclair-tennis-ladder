// supabase/functions/challenge-deadline/index.ts
// Runs every hour — auto-forfeits challenges past their response deadline

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async () => {
  const now = new Date().toISOString()
  let forfeited = 0
  let expired = 0

  // Auto-forfeit: pending challenges past deadline_respond → forfeit win for challenger
  const { data: pendingExpired } = await supabase
    .from('challenges')
    .select('id, challenger_id, challenged_id, consecutive_forfeits:challenged_id(consecutive_forfeits)')
    .eq('status', 'pending')
    .lt('deadline_respond', now)

  for (const c of pendingExpired ?? []) {
    await supabase.from('challenges').update({ status: 'expired' }).eq('id', c.id)
    // Track consecutive forfeits
    const { data: u } = await supabase.from('users').select('consecutive_forfeits, rank').eq('id', c.challenged_id).single()
    if (u) {
      const newForfeits = (u.consecutive_forfeits ?? 0) + 1
      const rankPenalty = newForfeits >= 2 ? 10 : 0
      await supabase.from('users').update({
        consecutive_forfeits: newForfeits,
        rank: rankPenalty > 0 ? (u.rank ?? 1) + rankPenalty : u.rank,
      }).eq('id', c.challenged_id)
    }
    // Award win to challenger
    await supabase.rpc('increment_matches_played', { user_id: c.challenger_id })
    forfeited++
  }

  // Expire accepted challenges past deadline_play (no penalty)
  const { data: playExpired } = await supabase
    .from('challenges')
    .select('id, challenger_id, challenged_id')
    .eq('status', 'accepted')
    .not('deadline_play', 'is', null)
    .lt('deadline_play', now)

  for (const c of playExpired ?? []) {
    await supabase.from('challenges').update({ status: 'expired' }).eq('id', c.id)
    // Reset consecutive forfeits on both players (expired accepted = no penalty)
    await supabase.from('users').update({ consecutive_forfeits: 0 }).in('id', [c.challenger_id, c.challenged_id])
    expired++
  }

  return new Response(JSON.stringify({ forfeited, expired }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
