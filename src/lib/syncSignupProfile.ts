import type { User as AuthUser } from '@supabase/supabase-js'
import { supabase } from './supabase'

type UsersRow = {
  id: string
  ladder_id: string | null
  phone: string
  full_name: string
}

/**
 * After magic-link signup, copy phone/name from auth metadata into `users` and assign Advanced ladder if needed.
 */
export async function syncProfileFromAuthMetadata(
  authUser: AuthUser,
  row: UsersRow | null
): Promise<boolean> {
  if (!row) return false

  const meta = authUser.user_metadata || {}
  const phoneFromMeta = typeof meta.phone === 'string' ? meta.phone.trim() : ''
  const fullNameFromMeta = typeof meta.full_name === 'string' ? meta.full_name.trim() : ''

  const updates: Record<string, unknown> = {}

  if (phoneFromMeta && (!row.phone || row.phone.trim() === '')) {
    updates.phone = phoneFromMeta
  }

  if (fullNameFromMeta && (!row.full_name || row.full_name === authUser.email)) {
    updates.full_name = fullNameFromMeta
  }

  if (!row.ladder_id) {
    const { data: ladderData } = await supabase.from('ladders').select('id').eq('name', 'Advanced').single()
    if (ladderData) {
      const { data: maxRankData } = await supabase
        .from('users')
        .select('rank')
        .eq('ladder_id', ladderData.id)
        .order('rank', { ascending: false })
        .limit(1)

      const newRank = maxRankData && maxRankData.length > 0 ? (maxRankData[0].rank ?? 0) + 1 : 1
      updates.ladder_id = ladderData.id
      updates.rank = newRank
      updates.last_active_at = new Date().toISOString()
    }
  }

  if (Object.keys(updates).length === 0) return false

  const { error } = await supabase.from('users').update(updates).eq('id', authUser.id)
  if (error) {
    console.error('syncProfileFromAuthMetadata', error)
    return false
  }
  return true
}
