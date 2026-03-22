export type LadderType = 'advanced'

export interface Ladder {
  id: string
  name: string
  ntrp_range: string
  created_at: string
}

export interface User {
  id: string
  full_name: string
  email: string
  phone: string
  ntrp: string | null
  ladder_id: string | null
  photo_url: string | null
  rank: number | null
  wins: number
  losses: number
  wildcards: number
  matches_played: number
  consecutive_forfeits: number
  is_admin: boolean
  is_hidden: boolean
  on_leave: boolean
  leave_start: string | null
  leave_return: string | null
  last_active_at: string | null
  created_at: string
  // joined from ladders table
  ladder?: Ladder
}

export type ChallengeStatus =
  | 'pending'
  | 'accepted'
  | 'declined'
  | 'expired'
  | 'completed'
  | 'withdrawn'

export interface Challenge {
  id: string
  challenger_id: string
  challenged_id: string
  ladder_id: string
  status: ChallengeStatus
  is_wildcard: boolean
  deadline_respond: string
  deadline_play: string | null
  match_id: string | null
  created_at: string
  // joined
  challenger?: User
  challenged?: User
}

export interface Match {
  id: string
  challenge_id: string
  winner_id: string
  loser_id: string
  winner_score: number | null
  loser_score: number | null
  reported_by: string
  reported_at: string
  confirmed_at: string | null
  auto_confirmed: boolean
  rank_change: number
  created_at: string
  // joined
  winner?: User
  loser?: User
}

export interface Invite {
  id: string
  inviter_id: string
  phone: string
  token: string
  status: 'pending' | 'joined' | 'expired'
  expires_at: string
  joined_at: string | null
  created_at: string
}

export interface Broadcast {
  id: string
  sender_id: string
  audience: 'all' | 'advanced'
  channel: 'sms' | 'inapp' | 'both'
  body: string
  recipient_count: number
  sent_at: string
}

// Auth context type
export interface AuthUser {
  id: string
  email: string
  profile: User | null
}

// App navigation tabs
export type TabName = 'ladder' | 'challenges' | 'rules' | 'profile' | 'admin'
