import { supabase } from './supabase'

/** Supabase sets `context` to the `Response` when status is not OK. */
async function messageFromFunctionsError(error: unknown): Promise<string> {
  const ctx =
    error && typeof error === 'object' && 'context' in error
      ? (error as { context: unknown }).context
      : undefined
  if (ctx instanceof Response) {
    try {
      const text = await ctx.clone().text()
      if (text) {
        try {
          const j = JSON.parse(text) as { error?: string }
          if (j?.error) return j.error
        } catch {
          return text.slice(0, 280)
        }
      }
    } catch {
      /* ignore */
    }
  }
  if (error instanceof Error) return error.message
  return 'Invite failed. Try again.'
}

/**
 * @param inviterId - Logged-in user id. Included for older `send-invite` deployments that
 *   expected `inviterId` in the body; the current Edge Function uses the JWT as the source of truth.
 */
export async function sendFriendInvite(phone: string, inviterId: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'send-invite',
    { body: { phone, inviterId } }
  )
  if (error) {
    throw new Error(await messageFromFunctionsError(error))
  }
  if (data && typeof data === 'object' && data.error) throw new Error(data.error)
}
