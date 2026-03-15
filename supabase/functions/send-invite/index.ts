// supabase/functions/send-invite/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://montclair.tennis'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  const { inviterId, phone } = await req.json()

  // Get inviter info
  const { data: inviter } = await supabase
    .from('users')
    .select('full_name')
    .eq('id', inviterId)
    .single()

  if (!inviter) {
    return new Response(JSON.stringify({ error: 'Inviter not found' }), { status: 404 })
  }

  // Create invite record
  const { data: invite } = await supabase
    .from('invites')
    .insert({ inviter_id: inviterId, phone })
    .select()
    .single()

  if (!invite) {
    return new Response(JSON.stringify({ error: 'Failed to create invite' }), { status: 500 })
  }

  // Send SMS
  const inviteUrl = `${APP_URL}/join?ref=${invite.token}`
  const msg = `🎾 ${inviter.full_name} invited you to join the Montclair Tennis Ladder! Free to join — everyone starts at the bottom and climbs through challenges. Join here: ${inviteUrl}`

  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_PHONE, To: phone, Body: msg }),
    }
  )

  return new Response(JSON.stringify({ ok: true, token: invite.token }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
