// supabase/functions/send-invite/index.ts
// Deploy: supabase functions deploy send-invite
// Secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER; optional APP_URL
// Auto: SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

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
    const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID')
    const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN')
    const twilioFrom = Deno.env.get('TWILIO_PHONE_NUMBER')
    if (!twilioSid || !twilioToken || !twilioFrom) {
      return new Response(
        JSON.stringify({
          error:
            'SMS is not configured (missing Twilio secrets on send-invite). Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER in the Supabase dashboard, then redeploy this function.',
        }),
        { status: 503, headers: jsonHeaders }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server misconfiguration: missing Supabase URL or keys for this function.' }),
        { status: 500, headers: jsonHeaders }
      )
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

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: jsonHeaders })
    }

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authErr } = await supabaseAuth.auth.getUser()
    if (authErr || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized — sign in again, then try the invite.' }),
        { status: 401, headers: jsonHeaders }
      )
    }

    const bodyInviterId = typeof body?.inviterId === 'string' ? body.inviterId : null
    if (bodyInviterId && bodyInviterId !== user.id) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403, headers: jsonHeaders })
    }

    const inviterUserId = user.id

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: inviter, error: inviterErr } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', inviterUserId)
      .single()

    if (inviterErr || !inviter) {
      return new Response(JSON.stringify({ error: 'Profile not found' }), { status: 404, headers: jsonHeaders })
    }

    const { data: invite, error: insErr } = await supabase
      .from('invites')
      .insert({ inviter_id: inviterUserId, phone })
      .select()
      .single()

    if (insErr || !invite) {
      console.error('invite insert:', insErr)
      return new Response(JSON.stringify({ error: 'Could not create invite' }), { status: 500, headers: jsonHeaders })
    }

    const inviteUrl = `${APP_URL}/join?ref=${invite.token}`
    const msg = `${inviter.full_name} has invited you to join the Montclair Tennis Ladder. Join here: ${inviteUrl}`

    const credentials = btoa(`${twilioSid}:${twilioToken}`)
    const twilioRes = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({ From: twilioFrom, To: phone, Body: msg }),
      }
    )

    if (!twilioRes.ok) {
      const errText = await twilioRes.text()
      console.error('Twilio error:', errText)
      return new Response(
        JSON.stringify({
          error:
            'Failed to send text message (Twilio rejected the request). Check the phone number and Twilio configuration.',
        }),
        { status: 502, headers: jsonHeaders }
      )
    }

    return new Response(JSON.stringify({ ok: true, token: invite.token }), { headers: jsonHeaders })
  } catch (e) {
    console.error(e)
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: jsonHeaders })
  }
})
