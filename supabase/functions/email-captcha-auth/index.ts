// supabase/functions/email-captcha-auth/index.ts
// Deploy: supabase functions deploy email-captcha-auth
// Secrets: RECAPTCHA_SECRET_KEY (Google reCAPTCHA v2 secret)
// Auto: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//
// Completes email auth without sending mail: verifies CAPTCHA, then returns a one-time
// token_hash from admin.generateLink; the client calls supabase.auth.verifyOtp with it.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

async function verifyRecaptchaV2(token: string, secret: string): Promise<boolean> {
  const body = new URLSearchParams()
  body.set('secret', secret)
  body.set('response', token)
  const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })
  const json = (await res.json()) as { success?: boolean }
  return json.success === true
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function findUserIdByEmail(
  admin: ReturnType<typeof createClient>,
  emailNorm: string
): Promise<string | null> {
  for (let page = 1; page <= 25; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
    if (error) throw error
    const users = data?.users ?? []
    const hit = users.find(u => (u.email ?? '').toLowerCase() === emailNorm)
    if (hit?.id) return hit.id
    if (users.length < 100) break
  }
  return null
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const jsonHeaders = { ...corsHeaders, 'Content-Type': 'application/json' }

  try {
    const recaptchaSecret = Deno.env.get('RECAPTCHA_SECRET_KEY')
    if (!recaptchaSecret) {
      return new Response(
        JSON.stringify({
          error:
            'Server misconfiguration: set RECAPTCHA_SECRET_KEY for email-captcha-auth (Google reCAPTCHA v2 secret).',
        }),
        { status: 503, headers: jsonHeaders }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({ error: 'Server misconfiguration: missing Supabase URL or service role key.' }), {
        status: 500,
        headers: jsonHeaders,
      })
    }

    const body = (await req.json()) as {
      email?: string
      captchaToken?: string
      mode?: string
      firstName?: string
      lastName?: string
      phone?: string
    }

    const emailRaw = typeof body.email === 'string' ? body.email : ''
    const captchaToken = typeof body.captchaToken === 'string' ? body.captchaToken : ''
    const mode = body.mode === 'signin' ? 'signin' : 'signup'

    if (!emailRaw || !captchaToken) {
      return new Response(JSON.stringify({ error: 'Email and CAPTCHA are required.' }), { status: 400, headers: jsonHeaders })
    }

    const okCaptcha = await verifyRecaptchaV2(captchaToken, recaptchaSecret)
    if (!okCaptcha) {
      return new Response(JSON.stringify({ error: 'CAPTCHA verification failed. Try again.' }), { status: 400, headers: jsonHeaders })
    }

    const emailNorm = normalizeEmail(emailRaw)
    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    let createdUserId: string | null = null

    try {
      if (mode === 'signup') {
        const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
        const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
        const phone = typeof body.phone === 'string' ? body.phone.trim() : ''
        if (!firstName || !lastName) {
          return new Response(JSON.stringify({ error: 'First and last name are required.' }), { status: 400, headers: jsonHeaders })
        }
        const phoneDigits = phone.replace(/\D/g, '')
        if (phoneDigits.length < 10) {
          return new Response(JSON.stringify({ error: 'Enter a valid cell phone number (at least 10 digits).' }), {
            status: 400,
            headers: jsonHeaders,
          })
        }

        const existingId = await findUserIdByEmail(admin, emailNorm)
        if (existingId) {
          return new Response(JSON.stringify({ error: 'An account with this email already exists. Use Sign in.' }), {
            status: 409,
            headers: jsonHeaders,
          })
        }

        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: emailNorm,
          email_confirm: true,
          user_metadata: {
            full_name: `${firstName} ${lastName}`.trim(),
            phone,
            requires_selfie: true,
          },
        })

        if (createErr) {
          const msg = createErr.message ?? ''
          if (/already|registered|exists|duplicate/i.test(msg) || (createErr as { status?: number }).status === 422) {
            return new Response(JSON.stringify({ error: 'An account with this email already exists. Use Sign in.' }), {
              status: 409,
              headers: jsonHeaders,
            })
          }
          throw createErr
        }

        const uid = created?.user?.id
        if (uid) createdUserId = uid
      } else {
        const uid = await findUserIdByEmail(admin, emailNorm)
        if (!uid) {
          return new Response(JSON.stringify({ error: 'No account for this email. Create an account first.' }), {
            status: 404,
            headers: jsonHeaders,
          })
        }
      }

      const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: emailNorm,
      })

      if (linkErr) throw linkErr

      const tokenHash =
        linkData?.properties?.hashed_token ??
        (linkData as { hashed_token?: string })?.hashed_token

      if (!tokenHash || typeof tokenHash !== 'string') {
        return new Response(JSON.stringify({ error: 'Could not issue a sign-in token. Check Auth settings.' }), {
          status: 500,
          headers: jsonHeaders,
        })
      }

      return new Response(JSON.stringify({ token_hash: tokenHash, email: emailNorm }), { status: 200, headers: jsonHeaders })
    } catch (e) {
      if (createdUserId) {
        try {
          await admin.auth.admin.deleteUser(createdUserId)
        } catch {
          // best-effort rollback
        }
      }
      throw e
    }
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: jsonHeaders })
  }
})
