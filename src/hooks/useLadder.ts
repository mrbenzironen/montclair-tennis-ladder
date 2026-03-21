import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import { useAuth } from './useAuth'

export function useLadder() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<User[]>([])
  const [challengedBusyIds, setChallengedBusyIds] = useState<Set<string>>(() => new Set())
  const [loading, setLoading] = useState(false)

  const ladderId = user?.profile?.ladder_id

  async function fetchStandings() {
    if (!ladderId) {
      setPlayers([])
      setChallengedBusyIds(new Set())
      return
    }

    setLoading(true)
    try {
      const [usersRes, busyRes] = await Promise.all([
        supabase
          .from('users')
          .select('*')
          .eq('ladder_id', ladderId)
          .eq('is_hidden', false)
          .eq('on_leave', false)
          .order('rank', { ascending: true }),
        supabase
          .from('challenges')
          .select('challenged_id')
          .eq('ladder_id', ladderId)
          .in('status', ['pending', 'accepted']),
      ])

      const { data, error } = usersRes
      if (busyRes.error) {
        console.error('Ladder busy-challenges fetch:', busyRes.error)
      }
      const challengedBusy = busyRes.error
        ? new Set<string>()
        : new Set(
            (busyRes.data ?? []).map((r: { challenged_id: string }) => r.challenged_id)
          )

      if (error) {
        console.error('Ladder fetch error:', error)
        setPlayers([])
        setChallengedBusyIds(new Set())
      } else {
        setPlayers((data ?? []) as User[])
        setChallengedBusyIds(challengedBusy)
      }
    } catch (e) {
      console.error('fetchStandings error:', e)
      setPlayers([])
      setChallengedBusyIds(new Set())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStandings()
  }, [ladderId])

  useEffect(() => {
    if (!ladderId) return
    const channel = supabase
      .channel(`ladder-standings-${ladderId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, () => {
        void fetchStandings()
      })
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [ladderId])

  const myRank = user?.profile?.rank ?? 999
  const myId = user?.id

  const playersWithState = players.map(p => {
    const isMe = p.id === myId
    const inRange = p.rank !== null && myRank - p.rank > 0 && myRank - p.rank <= 10
    const isEligible = !isMe && inRange && !challengedBusyIds.has(p.id)
    return { ...p, isMe, isEligible }
  })

  return { players: playersWithState, loading, refetch: fetchStandings }
}
