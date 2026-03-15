import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User, Match } from '../../types'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  player: User
  onBack: () => void
  onChallenge: (player: User) => void
}

export function PlayerProfileScreen({ player, onBack, onChallenge }: Props) {
  const { user } = useAuth()
  const [matches, setMatches] = useState<Match[]>([])
  const [showFab, setShowFab] = useState(false)

  useEffect(() => {
    supabase
      .from('matches')
      .select('*, winner:users!winner_id(full_name, photo_url), loser:users!loser_id(full_name, photo_url)')
      .or(`winner_id.eq.${player.id},loser_id.eq.${player.id}`)
      .order('created_at', { ascending: false })
      .limit(6)
      .then(({ data }) => setMatches((data ?? []) as Match[]))
  }, [player.id])

  const streak = player.wins > 0 ? `W${Math.min(player.wins, 5)}` : player.losses > 0 ? `L${Math.min(player.losses, 3)}` : '—'

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f6f5f3' }}>
      {/* Back bar */}
      <div style={{ background: '#201c1d', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px 12px', flexShrink: 0 }}>
        <button onClick={onBack} style={{ color: 'rgba(255,255,255,0.5)', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', padding: '0 4px' }}>
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

        {/* Match history */}
        {matches.length > 0 && (
          <>
            <div className="section-label">Recent Matches</div>
            <div className="card">
              {matches.map((match, i) => {
                const isWin = match.winner_id === player.id
                const opponent = isWin ? match.loser : match.winner
                const scoreStr = match.winner_score != null
                  ? isWin
                    ? `${match.winner_score}–${match.loser_score}`
                    : `${match.loser_score}–${match.winner_score}`
                  : '—'
                return (
                  <div key={match.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < matches.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                    <div style={{ width: 28, height: 28, borderRadius: 4, background: isWin ? '#e8f7a8' : '#f8d7da', color: isWin ? '#4a6000' : '#721c24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                      {isWin ? 'W' : 'L'}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: '#201c1d', display: 'flex', alignItems: 'center', gap: 7 }}>
                        {(opponent as any)?.full_name ?? 'Unknown'}
                      </div>
                      <div style={{ fontSize: 11, color: '#aaa79f', marginTop: 1 }}>
                        {new Date(match.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, color: '#201c1d' }}>
                      {scoreStr}
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {!showFab && (
          <div style={{ textAlign: 'center', padding: '20px 16px 0', fontSize: 12, color: '#cbc8c2' }}>
            👆 Tap anywhere to challenge {player.full_name.split(' ')[0]}
          </div>
        )}
        <div style={{ height: 24 }} />
      </div>

      {/* FAB */}
      {showFab && (
        <div style={{ position: 'absolute', bottom: 90, left: 0, right: 0, display: 'flex', justifyContent: 'center', zIndex: 50 }}>
          <button
            onClick={() => onChallenge(player)}
            style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#201c1d', color: '#c4e012', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: '2px', textTransform: 'uppercase', padding: '14px 28px', borderRadius: 100, border: 'none', cursor: 'pointer', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}
          >
            ⚡ Challenge {player.full_name.split(' ')[0]}
          </button>
        </div>
      )}
    </div>
  )
}
