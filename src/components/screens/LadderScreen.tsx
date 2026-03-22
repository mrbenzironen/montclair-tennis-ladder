import { useState, useEffect } from 'react'
import { MONTCLAIR_LADDER_LOGO_URL } from '../../lib/branding'
import { useLadder } from '../../hooks/useLadder'
import { useAuth } from '../../hooks/useAuth'
import { User } from '../../types'
import { ChallengeSheet } from '../modals/ChallengeSheet'
import { InviteFriendSheet } from '../modals/InviteFriendSheet'
import { PlayerProfileScreen } from './PlayerProfileScreen'

interface LadderScreenProps {
  /** When this increments (e.g. user taps Ladder tab again), close player profile and sheets. */
  ladderPopToRoot?: number
}

export function LadderScreen({ ladderPopToRoot = 0 }: LadderScreenProps) {
  const { players, loading, refetch, myActiveChallenge } = useLadder()
  const { user } = useAuth()
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
  const [challengeTarget, setChallengeTarget] = useState<User | null>(null)
  const [inviteFriendOpen, setInviteFriendOpen] = useState(false)
  const [inviteSentToast, setInviteSentToast] = useState(false)

  useEffect(() => {
    setSelectedPlayer(null)
    setChallengeTarget(null)
    setInviteFriendOpen(false)
  }, [ladderPopToRoot])

  if (selectedPlayer) {
    const row = selectedPlayer as User & { isEligible?: boolean }
    return (
      <PlayerProfileScreen
        player={selectedPlayer}
        canChallenge={row.isEligible === true}
        onBack={() => setSelectedPlayer(null)}
        onChallenge={(p) => { setSelectedPlayer(null); setChallengeTarget(p) }}
      />
    )
  }

  return (
    <div className="screen-root" style={{ background: '#f6f5f3' }}>
      <div
        style={{
          background: '#201c1d',
          padding: '16px 20px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          flexShrink: 0,
        }}
      >
        <img
          src={MONTCLAIR_LADDER_LOGO_URL}
          alt="Montclair Tennis Ladder"
          style={{
            height: 56,
            width: 'auto',
            maxWidth: 'min(220px, 72vw)',
            objectFit: 'contain',
            display: 'block',
          }}
        />
      </div>

      <div className="scroll" style={{ paddingBottom: 80 }}>
        <div style={{ padding: '16px 20px 12px', background: '#fafaf8', borderBottom: '1px solid #e6e4e0' }}>
          <button
            type="button"
            onClick={() => setInviteFriendOpen(true)}
            style={{
              width: '100%',
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 12,
              fontWeight: 800,
              letterSpacing: '1.5px',
              textTransform: 'uppercase',
              padding: '14px 20px',
              border: '1.5px solid #201c1d',
              background: '#fff',
              color: '#201c1d',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            Invite a friend
          </button>
          {inviteSentToast && (
            <div style={{ marginTop: 10, textAlign: 'center', fontSize: 12, color: '#4a6000', fontWeight: 500 }}>
              Invite sent.
            </div>
          )}
        </div>

        {myActiveChallenge && !loading && (
          <div
            style={{
              margin: '0 20px 12px',
              padding: '12px 14px',
              background: '#fff8e6',
              borderRadius: 8,
              border: '1px solid rgba(224, 145, 79, 0.45)',
              fontSize: 12,
              color: '#5c4518',
              lineHeight: 1.45,
            }}
          >
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', color: '#b35a18', marginBottom: 4 }}>
              {myActiveChallenge.challenger_id === user?.id ? 'Challenge pending' : 'Challenge needs you'}
            </div>
            {myActiveChallenge.challenger_id === user?.id ? (
              <div>
                Waiting for{' '}
                <strong style={{ color: '#201c1d' }}>
                  {(myActiveChallenge.challenged as { full_name?: string } | undefined)?.full_name?.split(' ')[0] ?? 'your opponent'}
                </strong>
                . You can’t challenge anyone else until this is withdrawn or the match is finished. Use the Challenges tab to withdraw.
              </div>
            ) : (
              <div>
                Open the <strong style={{ color: '#201c1d' }}>Challenges</strong> tab to accept or decline. You can’t send a new challenge until this one is resolved.
              </div>
            )}
          </div>
        )}

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
                  <div style={{ fontSize: 11, marginTop: 2, color: '#7a7672', display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
                      <abbr title="Wins" style={{ textDecoration: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 10, color: '#4a6000', letterSpacing: 0.5 }}>W</abbr>
                      <span style={{ fontWeight: 600, color: '#201c1d' }}>{player.wins}</span>
                    </span>
                    <span style={{ color: '#d4d2ce', fontWeight: 300 }}>·</span>
                    <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 3 }}>
                      <abbr title="Losses" style={{ textDecoration: 'none', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 800, fontSize: 10, color: '#a53a3a', letterSpacing: 0.5 }}>L</abbr>
                      <span style={{ fontWeight: 600, color: '#201c1d' }}>{player.losses}</span>
                    </span>
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
          onSent={() => {
            setChallengeTarget(null)
            void refetch()
          }}
        />
      )}

      {inviteFriendOpen && (
        <InviteFriendSheet
          onClose={() => setInviteFriendOpen(false)}
          onSent={() => {
            setInviteFriendOpen(false)
            setInviteSentToast(true)
            window.setTimeout(() => setInviteSentToast(false), 4000)
          }}
        />
      )}
    </div>
  )
}
