import { useState } from 'react'
import { useChallenges } from '../../hooks/useChallenges'
import { useAuth } from '../../hooks/useAuth'
import { Challenge, Match } from '../../types'
import { ReportScoreSheet } from '../modals/ReportScoreSheet'
import { respondToChallenge, withdrawChallenge } from '../../lib/challenges'

export function ChallengesScreen() {
  const { user } = useAuth()
  const { incoming, sent, accepted, matches, loading, refetch } = useChallenges()
  const [reportChallenge, setReportChallenge] = useState<Challenge | null>(null)

  function timeLeft(deadline: string) {
    const diff = new Date(deadline).getTime() - Date.now()
    if (diff <= 0) return 'Expired'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h > 24) return `${Math.floor(h / 24)}d left`
    return `${h}h ${m}m left`
  }

  async function handleAccept(c: Challenge) {
    await respondToChallenge(c.id, 'accepted', user!.id)
    refetch()
  }

  async function handleDecline(c: Challenge) {
    await respondToChallenge(c.id, 'declined', user!.id)
    refetch()
  }

  async function handleWithdraw(c: Challenge) {
    await withdrawChallenge(c.id, user!.id)
    refetch()
  }

  const allActive = [...incoming, ...sent, ...accepted]

  return (
    <div className="screen-root" style={{ background: '#f6f5f3' }}>
      {/* Header */}
      <div style={{ background: '#201c1d', padding: '14px 20px 16px', textAlign: 'center', flexShrink: 0 }}>
        <div style={{ fontSize: 36, marginBottom: 6 }}>⚡</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>
          Challenges
        </div>
      </div>

      <div className="scroll" style={{ paddingBottom: 80 }}>
        {loading ? (
          <div className="loading-screen"><div className="spinner" /></div>
        ) : (
          <>
            {/* Active challenges */}
            {allActive.length > 0 && (
              <>
                <div className="section-label">Active</div>
                {incoming.map(c => {
                  const opp = c.challenger
                  const tl = timeLeft(c.deadline_respond)
                  const isWarn = new Date(c.deadline_respond).getTime() - Date.now() < 7200000
                  return (
                    <div key={c.id} style={{ margin: '0 14px 10px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: '4px solid #e0914f' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px 10px' }}>
                        <img src={opp?.photo_url || ''} alt={opp?.full_name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(opp?.full_name ?? 'Player')}&background=f6f5f3&color=201c1d&size=88` }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: '#aaa79f', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Incoming Challenge</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', lineHeight: 1, marginBottom: 2 }}>{opp?.full_name}</div>
                          <div style={{ fontSize: 11, color: '#aaa79f' }}>Rank #{opp?.rank}</div>
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: '#fff3e0', color: '#7a3a10' }}>
                          {c.is_wildcard ? '⚡ Wildcard' : 'Respond'}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 10px', borderTop: '1px solid #f0ede8' }}>
                        <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300 }}>Time to respond</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, color: isWarn ? '#e0914f' : '#201c1d' }}>{tl}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px' }}>
                        <button onClick={() => handleAccept(c)} style={{ flex: 2, padding: 11, background: '#201c1d', color: '#c4e012', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '1.5px', textTransform: 'uppercase', border: 'none', borderRadius: 4, cursor: 'pointer' }}>✓ Accept</button>
                        <button onClick={() => handleDecline(c)} style={{ flex: 1, padding: 11, background: 'transparent', color: '#aaa79f', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', border: '1.5px solid #e6e4e0', borderRadius: 4, cursor: 'pointer' }}>Decline</button>
                      </div>
                    </div>
                  )
                })}

                {sent.map(c => {
                  const opp = c.challenged
                  const tl = timeLeft(c.deadline_respond)
                  return (
                    <div key={c.id} style={{ margin: '0 14px 10px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: '4px solid #c4e012' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px 10px' }}>
                        <img src={opp?.photo_url || ''} alt={opp?.full_name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(opp?.full_name ?? 'Player')}&background=f6f5f3&color=201c1d&size=88` }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: '#aaa79f', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Challenge Sent</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', lineHeight: 1, marginBottom: 2 }}>{opp?.full_name}</div>
                          <div style={{ fontSize: 11, color: '#aaa79f' }}>Rank #{opp?.rank}</div>
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: '#f0f8d0', color: '#4a6000' }}>Pending</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 10px', borderTop: '1px solid #f0ede8' }}>
                        <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300 }}>{opp?.full_name?.split(' ')[0]} must respond by</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, color: '#201c1d' }}>{tl}</div>
                      </div>
                      <div style={{ padding: '0 14px 14px' }}>
                        <button onClick={() => handleWithdraw(c)} style={{ width: '100%', padding: 11, background: 'transparent', color: '#aaa79f', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', border: '1.5px solid #e6e4e0', borderRadius: 4, cursor: 'pointer' }}>Withdraw</button>
                      </div>
                    </div>
                  )
                })}

                {accepted.map(c => {
                  const isChallenger = c.challenger_id === user?.id
                  const opp = isChallenger ? c.challenged : c.challenger
                  const tl = c.deadline_play ? timeLeft(c.deadline_play) : '14 days'
                  return (
                    <div key={c.id} style={{ margin: '0 14px 10px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.07)', borderLeft: '4px solid #201c1d' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 14px 10px' }}>
                        <img src={opp?.photo_url || ''} alt={opp?.full_name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
                          onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(opp?.full_name ?? 'Player')}&background=f6f5f3&color=201c1d&size=88` }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 10, color: '#aaa79f', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Match Accepted</div>
                          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', lineHeight: 1, marginBottom: 2 }}>{opp?.full_name}</div>
                          <div style={{ fontSize: 11, color: '#aaa79f' }}>Rank #{opp?.rank}</div>
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '4px 9px', borderRadius: 3, background: '#e8f0ff', color: '#1a2a6a' }}>Accepted</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 14px 10px', borderTop: '1px solid #f0ede8' }}>
                        <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300 }}>Must be played by</div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, color: '#201c1d' }}>{tl}</div>
                      </div>
                      {opp?.phone && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 14px 10px', padding: '10px 14px', background: '#f0f8d0', borderRadius: 8, border: '1px solid #c4e012', fontSize: 12, color: '#4a6000' }}>
                          <span style={{ fontSize: 13 }}>📱</span>
                          <span style={{ flex: 1 }}>{opp.full_name.split(' ')[0]}: <strong>{opp.phone}</strong></span>
                          <a href={`sms:${opp.phone}`} style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', padding: '6px 10px', background: '#201c1d', color: '#c4e012', borderRadius: 4, textDecoration: 'none' }}>Text</a>
                        </div>
                      )}
                      <div style={{ display: 'flex', gap: 8, padding: '0 14px 14px' }}>
                        <button onClick={() => setReportChallenge(c)} style={{ flex: 1, padding: 11, background: '#c4e012', color: '#201c1d', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: '1px', textTransform: 'uppercase', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Report Score</button>
                        <button onClick={() => handleWithdraw(c)} style={{ flex: 1, padding: 11, background: 'transparent', color: '#aaa79f', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', border: '1.5px solid #e6e4e0', borderRadius: 4, cursor: 'pointer' }}>Withdraw</button>
                      </div>
                    </div>
                  )
                })}
              </>
            )}

            {allActive.length === 0 && (
              <div style={{ padding: '40px 20px', textAlign: 'center', color: '#aaa79f', fontSize: 13 }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
                <div>No active challenges.</div>
                <div style={{ marginTop: 6, fontSize: 11 }}>Go to the Ladder tab and challenge someone!</div>
              </div>
            )}

            {/* Match history */}
            {matches.length > 0 && (
              <>
                <div className="section-label">Match History</div>
                <div className="card">
                  {matches.map((m, i) => {
                    const isWin = m.winner_id === user?.id
                    const opp = isWin ? m.loser : m.winner
                    const scoreStr = m.winner_score != null
                      ? isWin ? `${m.winner_score}–${m.loser_score}` : `${m.loser_score}–${m.winner_score}`
                      : '—'
                    return (
                      <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderBottom: i < matches.length - 1 ? '1px solid #f0ede8' : 'none' }}>
                        <div style={{ width: 28, height: 28, borderRadius: 4, background: isWin ? '#e8f7a8' : '#f8d7da', color: isWin ? '#4a6000' : '#721c24', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, flexShrink: 0 }}>
                          {isWin ? 'W' : 'L'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: '#201c1d', display: 'flex', alignItems: 'center', gap: 7 }}>
                            {(opp as any)?.full_name ?? 'Unknown'}
                          </div>
                          <div style={{ fontSize: 11, color: '#aaa79f', marginTop: 1 }}>
                            {new Date(m.created_at).toLocaleDateString()} · {scoreStr}
                          </div>
                        </div>
                        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 700, color: isWin ? '#4a6000' : '#aaa79f' }}>
                          {isWin && m.rank_change > 0 ? `+${m.rank_change} ↑` : '—'}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
            <div style={{ height: 20 }} />
          </>
        )}
      </div>

      {reportChallenge && (
        <ReportScoreSheet
          challenge={reportChallenge}
          onClose={() => setReportChallenge(null)}
          onComplete={() => { setReportChallenge(null); refetch() }}
        />
      )}
    </div>
  )
}
