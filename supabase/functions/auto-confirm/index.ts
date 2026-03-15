// supabase/functions/auto-confirm/index.ts
// Runs every 30 minutes via Supabase cron
// Confirms matches where reported_at + 2 hours has passed

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async () => {
  const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()

  // Find unconfirmed matches older than 2 hours
  const { data: matches } = await supabase
    .from('matches')
    .select('id, challenge_id, winner_id, loser_id')
    .is('confirmed_at', null)
    .lt('reported_at', twoHoursAgo)

  let confirmed = 0
  for (const m of matches ?? []) {
    // Confirm the match
    await supabase
      .from('matches')
      .update({ confirmed_at: new Date().toISOString(), auto_confirmed: true })
      .eq('id', m.id)

    // Update challenge status
    await supabase
      .from('challenges')
      .update({ status: 'completed' })
      .eq('id', m.challenge_id)

    // Increment matches_played for both players
    await supabase.rpc('increment_matches_played', { user_id: m.winner_id })
    await supabase.rpc('increment_matches_played', { user_id: m.loser_id })

    // Send confirmation SMS
    await supabase.functions.invoke('send-sms', {
      body: { type: 'match_confirmed', matchId: m.id },
    })

    confirmed++
  }

  return new Response(JSON.stringify({ confirmed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
