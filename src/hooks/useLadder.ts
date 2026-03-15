import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import { useAuth } from './useAuth'

export function useLadder() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const ladderId = user?.profile?.ladder_id

  async function fetchStandings() {
    if (!ladderId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('ladder_id', ladderId)
      .eq('is_hidden', false)
      .eq('on_leave', false)
      .order('rank', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setPlayers(data as User[])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchStandings()

    // Real-time subscription — refresh on any user change in this ladder
    const channel = supabase
      .channel('ladder-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'users', filter: `ladder_id=eq.${ladderId}` },
        () => fetchStandings()
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [ladderId])

  // Determine which players are eligible to challenge (within 10 spots above current user)
  const myRank = user?.profile?.rank ?? 999
  const myId = user?.id

  const playersWithState = players.map(p => {
    const isMe = p.id === myId
    const isEligible = !isMe && p.rank !== null && myRank - p.rank > 0 && myRank - p.rank <= 10
    return { ...p, isMe, isEligible }
  })

  return { players: playersWithState, loading, error, refetch: fetchStandings }
}
