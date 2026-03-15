// supabase/functions/inactivity-check/index.ts
// Runs daily at midnight — hides inactive players, removes those gone 63+ days

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

function daysAgo(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  return d.toISOString()
}

serve(async () => {
  let hidden = 0
  let removed = 0

  // Hide players inactive 21+ days
  const { data: toHide } = await supabase
    .from('users')
    .select('id')
    .eq('is_hidden', false)
    .eq('on_leave', false)
    .lt('last_active_at', daysAgo(21))
    .not('last_active_at', 'is', null)

  for (const u of toHide ?? []) {
    await supabase.from('users').update({ is_hidden: true }).eq('id', u.id)
    hidden++
  }

  // Remove players inactive 63+ days
  const { data: toRemove } = await supabase
    .from('users')
    .select('id')
    .lt('last_active_at', daysAgo(63))
    .not('last_active_at', 'is', null)

  for (const u of toRemove ?? []) {
    // Cancel any open challenges first
    await supabase.from('challenges').update({ status: 'expired' })
      .or(`challenger_id.eq.${u.id},challenged_id.eq.${u.id}`)
      .in('status', ['pending', 'accepted'])
    // Remove the user
    await supabase.from('users').delete().eq('id', u.id)
    removed++
  }

  return new Response(JSON.stringify({ hidden, removed }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
