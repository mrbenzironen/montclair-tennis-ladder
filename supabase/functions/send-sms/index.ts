// supabase/functions/send-sms/index.ts
// Deploy with: supabase functions deploy send-sms

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

async function sendSMS(to: string, body: string) {
  const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ From: TWILIO_PHONE, To: to, Body: body }),
    }
  )
  if (!response.ok) {
    const err = await response.text()
    console.error('Twilio error:', err)
  }
}

serve(async (req) => {
  const { type, challengeId, matchId, body, channel, audience } = await req.json()

  try {
    // ── Broadcast ─────────────────────────────────────────────
    if (type === 'broadcast') {
      let query = supabase.from('users').select('phone, ladder:ladders(name)').eq('is_hidden', false)
      if (audience !== 'all') {
        const { data: ladder } = await supabase.from('ladders').select('id').eq('name', 'Advanced').single()
        if (ladder) query = query.eq('ladder_id', ladder.id)
      }
      const { data: users } = await query
      if (channel === 'sms' || channel === 'both') {
        for (const u of users ?? []) {
          if (u.phone) await sendSMS(u.phone, `Montclair Tennis Ladder: ${body}`)
        }
      }
      return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
    }

    // ── Challenge notifications ────────────────────────────────
    if (type === 'challenge_received' || type === 'wildcard_challenge') {
      const { data: c } = await supabase
        .from('challenges')
        .select('*, challenger:users!challenger_id(full_name), challenged:users!challenged_id(phone, full_name)')
        .eq('id', challengeId)
        .single()
      if (!c) throw new Error('Challenge not found')
      const phone = (c.challenged as any)?.phone
      const name = (c.challenger as any)?.full_name
      if (phone) {
        const emoji = type === 'wildcard_challenge' ? '⚡' : '🎾'
        const msg = type === 'wildcard_challenge'
          ? `${emoji} ${name} used a Wildcard to challenge you on the Montclair Tennis Ladder! 48 hours to respond: https://montclair.tennis`
          : `${emoji} ${name} challenged you on the Montclair Tennis Ladder! 48 hours to respond: https://montclair.tennis`
        await sendSMS(phone, msg)
      }
    }

    if (type === 'challenge_accepted' || type === 'challenge_declined') {
      const { data: c } = await supabase
        .from('challenges')
        .select('*, challenger:users!challenger_id(phone, full_name), challenged:users!challenged_id(full_name, phone)')
        .eq('id', challengeId)
        .single()
      if (!c) throw new Error('Challenge not found')
      const challengerPhone = (c.challenger as any)?.phone
      const challengedName = (c.challenged as any)?.full_name
      const challengedPhone = (c.challenged as any)?.phone
      if (type === 'challenge_accepted' && challengerPhone) {
        const msg = `✅ ${challengedName} accepted your challenge! Arrange your match within 14 days. Their number: ${challengedPhone}. https://montclair.tennis`
        await sendSMS(challengerPhone, msg)
      }
      if (type === 'challenge_declined' && challengerPhone) {
        const msg = `❌ ${challengedName} declined your challenge. Open the app to challenge someone else: https://montclair.tennis`
        await sendSMS(challengerPhone, msg)
      }
    }

    // ── Score notifications ────────────────────────────────────
    if (type === 'match_confirmed') {
      const { data: m } = await supabase
        .from('matches')
        .select('*, winner:users!winner_id(phone, full_name, rank), loser:users!loser_id(phone, full_name, rank)')
        .eq('id', matchId)
        .single()
      if (!m) throw new Error('Match not found')
      const winnerPhone = (m.winner as any)?.phone
      const loserPhone = (m.loser as any)?.phone
      const winnerName = (m.winner as any)?.full_name
      const loserName = (m.loser as any)?.full_name
      const score = m.winner_score != null ? ` ${m.winner_score}–${m.loser_score}` : ''
      if (winnerPhone) {
        await sendSMS(winnerPhone, `🏆 Match confirmed — you beat ${loserName}${score}! Your new rank: #${(m.winner as any)?.rank}. https://montclair.tennis`)
      }
      if (loserPhone) {
        await sendSMS(loserPhone, `🎾 Match confirmed — ${winnerName} beat you${score}. Your rank: #${(m.loser as any)?.rank}. https://montclair.tennis`)
      }
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } })
  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { 'Content-Type': 'application/json' } })
  }
})
