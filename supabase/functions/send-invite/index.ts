// supabase/functions/send-invite/index.ts
// Deploy: supabase functions deploy send-invite
// Requires: TWILIO_*, SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY; optional APP_URL

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID')!
const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN')!
const TWILIO_PHONE = Deno.env.get('TWILIO_PHONE_NUMBER')!
const APP_URL = Deno.env.get('APP_URL') ?? 'https://montclair.tennis'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function normalizeUsPhoneE164(raw: string): string | null {
  const d = raw.replace(/\D/g, '')
  if (d.length === 10) return `+1${d}`
  if (d.length === 11 && d.startsWith('1')) return `+${d}`
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser()
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders })
    }

    const body = await req.json().catch(() => ({}))
    const rawPhone = body?.phone
    if (!rawPhone || typeof rawPhone !== 'string') {
      return new Response(JSON.stringify({ error: 'Phone number required' }), { status: 400, headers: jsonHeaders })
    }

    const phone = normalizeUsPhoneE164(rawPhone)
    if (!phone) {
      return new Response(JSON.stringify({ error: 'Invalid US phone number' }), { status: 400, headers: jsonHeaders })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: inviter, error: inviterErr } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single()

    if (inviterErr || !inviter) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: jsonHeaders })
    }

    const { data: invite, error: insErr } = await supabase
      .from('invites')
      .insert({ inviter_id: user.id, phone })
      .select()
      .single()

    if (insErr || !invite) {
      console.error('invite insert:', insErr)
      return new Response(JSON.stringify({ error: 'Could not create invite' }), { status: 500, headers: jsonHeaders })
    }

    const inviteUrl = `${APP_URL}/join?ref=${invite.token}`
    const msg = `${inviter.full_name} has invited you to join the Montclair Tennis Ladder. Join here: ${inviteUrl}`

    const credentials = btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`)
    const twilioRes = await fetch(
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

    if (!twilioRes.ok) {
      const errText = await twilioRes.text()
      console.error('Twilio error:', errText)
      return new Response(JSON.stringify({ error: 'Failed to send text message' }), { status: 502, headers: jsonHeaders })
    }

    return new Response(JSON.stringify({ ok: true, token: invite.token }), { headers: jsonHeaders })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders })
  }
})
