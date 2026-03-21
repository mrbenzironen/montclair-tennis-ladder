import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import { useAuth } from './useAuth'

export function useLadder() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  const ladderId = user?.profile?.ladder_id

  async function fetchStandings() {
    if (!ladderId) {
      setPlayers([])
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('ladder_id', ladderId)
        .eq('is_hidden', false)
        .eq('on_leave', false)
        .order('rank', { ascending: true })

      if (error) {
        console.error('Ladder fetch error:', error)
        setPlayers([])
      } else {
        setPlayers(data as User[])
      }
    } catch (e) {
      console.error('fetchStandings error:', e)
      setPlayers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStandings()
  }, [ladderId])

  const myRank = user?.profile?.rank ?? 999
  const myId = user?.id

  const playersWithState = players.map(p => {
    const isMe = p.id === myId
    const isEligible = !isMe && p.rank !== null && myRank - p.rank > 0 && myRank - p.rank <= 10
    return { ...p, isMe, isEligible }
  })

  return { players: playersWithState, loading, refetch: fetchStandings }
}
