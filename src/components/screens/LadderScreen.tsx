import { useState } from 'react'
import { useLadder } from '../../hooks/useLadder'
import { useAuth } from '../../hooks/useAuth'
import { User } from '../../types'
import { ChallengeSheet } from '../modals/ChallengeSheet'
import { PlayerProfileScreen } from './PlayerProfileScreen'

export function LadderScreen() {
  const { players, loading } = useLadder()
  const { user } = useAuth()
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
  const [challengeTarget, setChallengeTarget] = useState<User | null>(null)

  const ladderName = user?.profile?.ladder?.name ?? 'Advanced'

  if (selectedPlayer) {
    return (
      <PlayerProfileScreen
        player={selectedPlayer}
        onBack={() => setSelectedPlayer(null)}
        onChallenge={(p) => { setSelectedPlayer(null); setChallengeTarget(p) }}
      />
    )
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#f6f5f3' }}>
      <div style={{ background: '#201c1d', padding: '14px 20px 16px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 44, marginBottom: 6 }}>🎾</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '1.5px', color: '#fff' }}>
          {ladderName} Ladder
        </div>
      </div>

      <div className="scroll">
        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa79f', fontSize: 13 }}>
            Loading players…
          </div>
        ) : players.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#aaa79f', fontSize: 13 }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🎾</div>
            <div>No players yet. Invite your neighbors!</div>
          </div>
        ) : (
          players.map((player) => {
            const isMe = player.id === user?.id
            const isEligible = (player as any).isEligible

            return (
              <div
                key={player.id}
                onClick={() => !isMe && setSelectedPlayer(player)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '0 20px',
                  height: 58,
                  borderBottom: '1px solid #e6e4e0',
                  gap: 12,
                  cursor: isMe ? 'default' : 'pointer',
                  background: isMe ? '#c4e012' : isEligible ? '#f8fce8' : '#fff',
                  borderLeft: isEligible && !isMe ? '3px solid #c4e012' : undefined,
                  paddingLeft: isEligible && !isMe ? 17 : 20,
                }}
              >
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: isMe ? '#201c1d' : '#aaa79f', width: 24, textAlign: 'right', flexShrink: 0 }}>
                  {player.rank}
                </div>

                <img
                  src={player.photo_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(player.full_name)}&background=201c1d&color=c4e012&size=72`}
                  alt={player.full_name}
                  style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: isMe ? '2px solid #201c1d' : 'none' }}
                />

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#201c1d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {player.full_name}
                  </div>
                  <div style={{ fontSize: 11, color: '#aaa79f', marginTop: 1 }}>
                    {player.wins}W · {player.losses}L
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  {isEligible && !isMe && (
                    <button
                      onClick={e => { e.stopPropagation(); setChallengeTarget(player) }}
                      style={{ fontSize: 10, letterSpacing: '1.5px', textTransform: 'uppercase', padding: '7px 12px', border: '1.5px solid #201c1d', background: 'transparent', color: '#201c1d', borderRadius: 4, cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}
                    >
                      Challenge
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
        <div style={{ height: 12 }} />
      </div>

      {challengeTarget && (
        <ChallengeSheet
          target={challengeTarget}
          onClose={() => setChallengeTarget(null)}
          onSent={() => setChallengeTarget(null)}
        />
      )}
    </div>
  )
}
