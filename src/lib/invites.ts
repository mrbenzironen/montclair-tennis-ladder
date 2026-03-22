import { supabase } from './supabase'

export async function sendFriendInvite(phone: string): Promise<void> {
  const { data, error } = await supabase.functions.invoke<{ ok?: boolean; error?: string }>(
    'send-invite',
    { body: { phone } }
  )
  if (error) throw new Error(error.message)
  if (data && typeof data === 'object' && data.error) throw new Error(data.error)
}
