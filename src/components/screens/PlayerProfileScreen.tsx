import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User, Match } from '../../types'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  player: User
  /** When false, hide challenge CTA (rank rules or player already has an active incoming challenge). */
  canChallenge?: boolean
  onBack: () => void
  onChallenge: (player: User) => void
}

export function PlayerProfileScreen({ player, canChallenge = true, onBack, onChallenge }: Props) {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [matchesLoading, setMatchesLoading] = useState(true)
  const [showFab, setShowFab] = useState(false)

  useEffect(() => {
    let cancelled = false
    setMatchesLoading(true)
    setMatches([])

    void (async () => {
      const { data, error } = await supabase
        .from('matches')
        .select('*, winner:users!winner_id(*), loser:users!loser_id(*)')
        .or(`winner_id.eq.${player.id},loser_id.eq.${player.id}`)
        .order('created_at', { ascending: false })
        .limit(50)

      if (cancelled) return
      if (error) {
        setMatches([])
      } else {
        setMatches((data ?? []) as Match[])
      }
      setMatchesLoading(false)
    })()

    return () => { cancelled = true }
  }, [player.id])

  const streak = player.wins > 0 ? `W${Math.min(player.wins, 5)}` : player.losses > 0 ? `L${Math.min(player.losses, 3)}` : '—'

  return (
    <div className="screen-root" style={{ background: '#f6f5f3', position: 'relative' }}>
      {/* Back bar */}
      <div style={{ background: '#201c1d', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 12px', flexShrink: 0 }}>
        <button type="button" onClick={onBack} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
          ←
        </button>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)' }}>
          {user?.profile?.ladder?.name} Ladder
        </div>
      </div>

      {/* Hero */}
      <div style={{ background: '#201c1d', padding: '0 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-end', paddingBottom: 16 }}>
          <img
            src={player.photo_url || ''}
            alt={player.full_name}
            style={{ width: 88, height: 88, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid rgba(255,255,255,0.15)' }}
            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=c4e012&color=201c1d&size=180` }}
          />
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, textTransform: 'uppercase', color: '#fff', lineHeight: 1, marginBottom: 5 }}>
              {player.full_name}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 700, color: '#c4e012', letterSpacing: 1, textTransform: 'uppercase' }}>
              #{player.rank} · {user?.profile?.ladder?.name}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="hero-stats">
          <div className="hero-stat">
            <div className="hero-stat-val">{player.wins}</div>
            <div className="hero-stat-label">Wins</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val red">{player.losses}</div>
            <div className="hero-stat-label">Losses</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val green">{streak}</div>
            <div className="hero-stat-label">Streak</div>
          </div>
          <div className="hero-stat">
            <div className="hero-stat-val">{player.matches_played}</div>
            <div className="hero-stat-label">Played</div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="scroll" style={{ paddingBottom: 100 }} onClick={() => setShowFab(true)}>
        {/* Since bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, background: '#fff', margin: 14, borderRadius: 12, boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <span style={{ fontSize: 18 }}>📅</span>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#201c1d' }}>
              On the ladder since {new Date(player.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <div style={{ fontSize: 11, color: '#aaa79f', marginTop: 2 }}>
              {player.matches_played} matches played this season
            </div>
          </div>
        </div>

        {/* Match history — tap rows without triggering challenge FAB */}
        <div onClick={e => e.stopPropagation()}>
          <div className="section-label">Match history</div>
          <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, padding: '0 16px 10px', lineHeight: 1.45 }}>
            Who {player.full_name.split(' ')[0]} played and the score (their games listed first). Most recent first.
          </div>
          {matchesLoading ? (
            <div style={{ padding: '24px 20px', textAlign: 'center', color: '#aaa79f', fontSize: 13 }}>Loading matches…</div>
          ) : matches.length === 0 ? (
            <div className="card" style={{ padding: '20px 16px', textAlign: 'center', color: '#aaa79f', fontSize: 13 }}>
              No completed matches yet this season.
            </div>
          ) : (
            <div className="card">
              {matches.map((m, i) => {
                const isWin = m.winner_id === player.id
                const opp = isWin ? m.loser : m.winner
                const scoreStr = m.winner_score != null
                  ? isWin
                    ? `${m.winner_score}–${m.loser_score}`
                    : `${m.loser_score}–${m.winner_score}`
                  : 'Score pending'
                return (
                  <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < matches.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 4, background: isWin ? '#e8f7a8' : '#f8d7da', color: isWin ? '#4a6000' : '#721c24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                      {isWin ? 'W' : 'L'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#201c1d' }}>
                        vs {(opp as User | undefined)?.full_name ?? 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa79f', marginTop: 2 }}>
                        {new Date(m.created_at).toLocaleDateString()}
                        {' · '}
                        <span style={{ fontWeight: 500, color: '#201c1d' }}>Score {scoreStr}</span>
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: isWin ? '#4a6000' : '#aaa79f', flexShrink: 0 }}>
                      {isWin && m.rank_change > 0 ? `+${m.rank_change} ↑` : '—'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {!showFab && canChallenge && (
          <div style={{ textAlign: 'center', padding: '20px 16px 0', fontSize: 12, color: '#cbc8c2' }}>
            👆 Tap anywhere to challenge {player.full_name.split(' ')[0]}
          </div>
        )}
        {!showFab && !canChallenge && (
          <div style={{ textAlign: 'center', padding: '20px 16px 0', fontSize: 12, color: '#cbc8c2', lineHeight: 1.45 }}>
            This player can’t be challenged right now (ladder range or they already have an active challenge to respond to or play).
          </div>
        )}
        <div style={{ height: 24 }} />
      </div>

      {/* FAB */}
      {showFab && canChallenge && (
        <div style={{ position: 'absolute', bottom: 90, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 50 }}>
          <button
            type="button"
            onClick={e => {
              e.preventDefault()
              onChallenge(player)
            }}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#201c1d', color: '#c4e012', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 100, border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
          >
            ⚡ Challenge {player.full_name.split(' ')[0]}
          </button>
        </div>
      )}
    </div>
  )
}
