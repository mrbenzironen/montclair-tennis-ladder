import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Challenge, Match } from '../types'
import { useAuth } from './useAuth'

export function useChallenges() {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(true)

  const userId = user?.id

  async function fetchChallenges() {
    if (!userId) {
      setChallenges([])
      setMatches([])
      setLoading(false)
      return
    }
    setLoading(true)

    // Only this user's active challenges (as challenger or challenged)
    const [{ data: chalData }, { data: matchData }] = await Promise.all([
      supabase
        .from('challenges')
        .select('*, challenger:users!challenger_id(*), challenged:users!challenged_id(*)')
        .or(`challenger_id.eq.${userId},challenged_id.eq.${userId}`)
        .in('status', ['pending', 'accepted'])
        .order('created_at', { ascending: false }),
      // Game history: only matches this user played
      supabase
        .from('matches')
        .select('*, winner:users!winner_id(*), loser:users!loser_id(*)')
        .or(`winner_id.eq.${userId},loser_id.eq.${userId}`)
        .order('created_at', { ascending: false })
        .limit(50),
    ])

    setChallenges((chalData ?? []) as Challenge[])
    setMatches((matchData ?? []) as Match[])
    setLoading(false)
  }

  useEffect(() => {
    fetchChallenges()

    const channel = supabase
      .channel('challenge-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'challenges' }, fetchChallenges)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'matches' }, fetchChallenges)
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [userId])

  const incoming = challenges.filter(
    c => c.challenged_id === userId && c.status === 'pending'
  )
  const sent = challenges.filter(
    c => c.challenger_id === userId && c.status === 'pending'
  )
  const accepted = challenges.filter(
    c =>
      c.status === 'accepted' &&
      (c.challenger_id === userId || c.challenged_id === userId)
  )

  return { challenges, incoming, sent, accepted, matches, loading, refetch: fetchChallenges }
}
