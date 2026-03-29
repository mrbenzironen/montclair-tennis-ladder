import { supabase } from './supabase'
import { getErrorMessage } from './errors'

const CHALLENGE_WINDOW_HOURS = 48
export const PLAY_WINDOW_DAYS = 7
export const NORMAL_CHALLENGE_RANGE = 5
export const WILDCARD_CHALLENGE_RANGE = 10

const NORMAL_RANGE = NORMAL_CHALLENGE_RANGE
const WILDCARD_RANGE = WILDCARD_CHALLENGE_RANGE

/**
 * Optional `send-sms` Edge Function (Twilio). Never throw — core challenge/match data
 * must succeed even when SMS is not configured or the function errors.
 */
async function tryNotifySmsEdge(body: Record<string, unknown>): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-sms', { body })
    if (error) console.warn('[challenges] send-sms skipped:', error.message)
  } catch (e) {
    console.warn('[challenges] send-sms skipped:', e)
  }
}

export async function sendChallenge(
  challengerId: string,
  challengedId: string,
  ladderId: string,
  isWildcard = false
) {
  // Validate range
  const { data: users } = await supabase
    .from('users')
    .select('id, rank, wildcards')
    .in('id', [challengerId, challengedId])

  const challenger = users?.find(u => u.id === challengerId)
  const challenged = users?.find(u => u.id === challengedId)

  if (!challenger || !challenged) throw new Error('Players not found')

  const diff = (challenger.rank ?? 999) - (challenged.rank ?? 0)
  const maxRange = isWildcard ? WILDCARD_RANGE : NORMAL_RANGE
  if (diff <= 0 || diff > maxRange) {
    throw new Error(`Can only challenge players up to ${maxRange} spots above you`)
  }

  if (isWildcard && (challenger.wildcards ?? 0) < 1) {
    throw new Error('No wildcards available')
  }

  // Challenged player is locked: one incoming pending or accepted (unplayed) challenge at a time
  const { data: targetBusy } = await supabase
    .from('challenges')
    .select('id')
    .eq('challenged_id', challengedId)
    .in('status', ['pending', 'accepted'])

  if (targetBusy && targetBusy.length > 0) {
    throw new Error(
      'That player already has an active challenge. They can be challenged again after they decline or finish the match.'
    )
  }

  // One active outgoing challenge per player (pending or accepted, unplayed).
  // A player may still send one outgoing challenge while they are being challenged by someone else.
  const { data: myOutgoingActive } = await supabase
    .from('challenges')
    .select('id')
    .eq('challenger_id', challengerId)
    .in('status', ['pending', 'accepted'])

  if (myOutgoingActive && myOutgoingActive.length > 0) {
    throw new Error(
      'You already sent an active challenge. Finish, decline, or withdraw it before sending another.'
    )
  }

  const deadline = new Date()
  deadline.setHours(deadline.getHours() + CHALLENGE_WINDOW_HOURS)

  const { data, error } = await supabase
    .from('challenges')
    .insert({
      challenger_id: challengerId,
      challenged_id: challengedId,
      ladder_id: ladderId,
      status: 'pending',
      is_wildcard: isWildcard,
      deadline_respond: deadline.toISOString(),
    })
    .select()
    .single()

  if (error) throw error

  // Deduct wildcard if used
  if (isWildcard) {
    await supabase
      .from('users')
      .update({ wildcards: (challenger.wildcards ?? 1) - 1 })
      .eq('id', challengerId)
  }

  void tryNotifySmsEdge({
    type: isWildcard ? 'wildcard_challenge' : 'challenge_received',
    challengeId: data.id,
  })

  return data
}

export async function respondToChallenge(
  challengeId: string,
  response: 'accepted' | 'declined',
  challengedId: string
) {
  const updates: Record<string, unknown> = { status: response }

  if (response === 'accepted') {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + PLAY_WINDOW_DAYS)
    updates.deadline_play = deadline.toISOString()
  }

  const { error } = await supabase
    .from('challenges')
    .update(updates)
    .eq('id', challengeId)
    .eq('challenged_id', challengedId)

  if (error) throw error

  void tryNotifySmsEdge({ type: `challenge_${response}`, challengeId })
}

export async function withdrawChallenge(challengeId: string, challengerId: string) {
  const { error } = await supabase
    .from('challenges')
    .update({ status: 'withdrawn' })
    .eq('id', challengeId)
    .eq('challenger_id', challengerId)

  if (error) throw error
}

/**
 * Winner reports the score; result is final immediately (no loser confirmation).
 * `reportedById` must equal `winnerId`.
 */
export async function reportScore(
  challengeId: string,
  winnerId: string,
  loserId: string,
  winnerScore: number | null,
  loserScore: number | null,
  reportedById: string
) {
  if (reportedById !== winnerId) {
    throw new Error('Only the match winner can report the score.')
  }

  const now = new Date().toISOString()
  const { data: match, error } = await supabase
    .from('matches')
    .insert({
      challenge_id: challengeId,
      winner_id: winnerId,
      loser_id: loserId,
      winner_score: winnerScore,
      loser_score: loserScore,
      reported_by: reportedById,
      reported_at: now,
      confirmed_at: now,
      auto_confirmed: false,
    })
    .select()
    .single()

  if (error) throw new Error(getErrorMessage(error, 'Could not save the match result.'))

  const { error: chErr } = await supabase
    .from('challenges')
    .update({ match_id: match.id })
    .eq('id', challengeId)

  if (chErr) throw new Error(getErrorMessage(chErr, 'Could not link the match to this challenge.'))

  await finalizeMatch(match.id)

  return match
}

async function finalizeMatch(matchId: string) {
  const { data: match } = await supabase
    .from('matches')
    .select('winner_id, loser_id, challenge_id')
    .eq('id', matchId)
    .single()

  if (!match) throw new Error('Match not found')

  await updateRankings(match.winner_id, match.loser_id, match.challenge_id, matchId)

  const { error: completeErr } = await supabase
    .from('challenges')
    .update({ status: 'completed' })
    .eq('id', match.challenge_id)

  if (completeErr) {
    throw new Error(getErrorMessage(completeErr, 'Could not mark the challenge as completed.'))
  }

  // Wins/losses are updated by DB trigger trg_matches_record_stats (see migration 007).

  void tryNotifySmsEdge({ type: 'match_confirmed', matchId })
}

async function updateRankings(
  winnerId: string,
  loserId: string,
  challengeId: string,
  matchId: string
) {
  const { data: challenge } = await supabase
    .from('challenges')
    .select('challenger_id, challenged_id, ladder_id')
    .eq('id', challengeId)
    .single()

  if (!challenge?.ladder_id) return

  // Only update ladder positions if challenger won (challenger moves up, challenged drops one)
  if (winnerId !== challenge.challenger_id) return

  const { data: winner } = await supabase
    .from('users')
    .select('rank')
    .eq('id', winnerId)
    .single()

  const { data: loser } = await supabase
    .from('users')
    .select('rank')
    .eq('id', loserId)
    .single()

  if (!winner?.rank || !loser?.rank) return

  const challengerOldRank = winner.rank
  const challengedRank = loser.rank

  await supabase.rpc('shift_ranks_down', {
    from_rank: challengedRank,
    to_rank: challengerOldRank - 1,
    ladder_id_param: challenge.ladder_id,
  })

  await supabase
    .from('users')
    .update({ rank: challengedRank, last_active_at: new Date().toISOString() })
    .eq('id', winnerId)

  const delta = challengerOldRank - challengedRank
  await supabase
    .from('matches')
    .update({ rank_change: delta > 0 ? delta : 0 })
    .eq('id', matchId)
}
