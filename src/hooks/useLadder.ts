import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { User } from '../types'
import { useAuth } from './useAuth'

/** Current user’s single active challenge (pending or accepted), if any. */
export type MyActiveChallenge = {
  id: string
  challenger_id: string
  challenged_id: string
  status: string
  challenger?: { full_name: string }
  challenged?: { full_name: string }
}

export function useLadder() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<User[]>([])
  const [challengedBusyIds, setChallengedBusyIds] = useState<Set<string>>(() => new Set())
  const [myActiveChallenge, setMyActiveChallenge] = useState<MyActiveChallenge | null>(null)
  const [loading, setLoading] = useState(false)

  const ladderId = user?.profile?.ladder_id
  const userId = user?.id

  async function fetchStandings() {
    if (!ladderId) {
      setPlayers([])
      setChallengedBusyIds(new Set())
      setMyActiveChallenge(null)
      return
    }

    setLoading(true)
    try {
      const [usersRes, busyRes, mineRes] = await Promise.all([
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
        userId
          ? supabase
              .from('challenges')
              .select(
                'id, challenger_id, challenged_id, status, challenger:users!challenger_id(full_name), challenged:users!challenged_id(full_name)'
              )
              .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
              .in('status', ['pending', 'accepted'])
              .limit(1)
              .maybeSingle()
          : Promise.resolve({ data: null, error: null as null }),
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
        setMyActiveChallenge(null)
      } else {
        setPlayers((data ?? []) as User[])
        setChallengedBusyIds(challengedBusy)
        if (mineRes && 'error' in mineRes && mineRes.error) {
          console.error('My active challenge fetch:', mineRes.error)
          setMyActiveChallenge(null)
        } else {
          const mine = mineRes && 'data' in mineRes ? mineRes.data : null
          setMyActiveChallenge((mine ?? null) as MyActiveChallenge | null)
        }
      }
    } catch (e) {
      console.error('fetchStandings error:', e)
      setPlayers([])
      setChallengedBusyIds(new Set())
      setMyActiveChallenge(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchStandings()
  }, [ladderId, userId])

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

  const hasActiveChallenge = myActiveChallenge !== null

  const playersWithState = players.map(p => {
    const isMe = p.id === myId
    const inRange = p.rank !== null && myRank - p.rank > 0 && myRank - p.rank <= 10
    const isEligible =
      !isMe && inRange && !challengedBusyIds.has(p.id) && !hasActiveChallenge
    return { ...p, isMe, isEligible }
  })

  return { players: playersWithState, loading, refetch: fetchStandings, myActiveChallenge }
}
