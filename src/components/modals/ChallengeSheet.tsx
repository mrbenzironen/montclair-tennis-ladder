import { useState } from 'react'
import { User } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import {
  sendChallenge,
  NORMAL_CHALLENGE_RANGE,
  WILDCARD_CHALLENGE_RANGE,
} from '../../lib/challenges'
import { normalizeUsPhoneE164 } from '../../lib/phone'
import { openSmsComposer } from '../../lib/sms'

const CHALLENGE_SENT_SMS_BODY =
  'Hey! I just challenged you on the Montclair Tennis Ladder. Open the app to accept or decline: https://montclair-tennis-ladder.vercel.app'

interface Props {
  target: User
  onClose: () => void
  /** Called after the challenge is saved in the database. */
  onSent: () => void
}

export function ChallengeSheet({ target, onClose, onSent }: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const myRank = user?.profile?.rank ?? 999
  const theirRank = target.rank ?? 999
  const rankDiff = myRank - theirRank
  const willUseWildcard =
    rankDiff > NORMAL_CHALLENGE_RANGE && rankDiff <= WILDCARD_CHALLENGE_RANGE

  async function handleSend() {
    if (!user?.profile) return
    setLoading(true)
    setError('')
    try {
      await sendChallenge(
        user.id,
        target.id,
        user.profile.ladder_id!,
        willUseWildcard
      )
      onSent()
      const phone = (target.phone ?? '').trim()
      if (normalizeUsPhoneE164(phone) !== null) {
        openSmsComposer(CHALLENGE_SENT_SMS_BODY, phone)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not send challenge')
    } finally {
      setLoading(false)
    }
  }

  const theirPhone = (target.phone ?? '').trim()

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', padding: '16px 20px 4px' }}>
          Challenge {target.full_name.split(' ')[0]}?
        </div>
        <div style={{ fontSize: 13, color: '#7a7672', fontWeight: 300, lineHeight: 1.5, padding: '0 20px 16px' }}>
          They have 48 hours to accept or decline in the <strong style={{ color: '#201c1d', fontWeight: 600 }}>Challenges</strong> tab — no text or link required.
        </div>

        {/* Players */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px 16px' }}>
          <div style={{ textAlign: 'center', width: 110 }}>
            <img
              src={user?.profile?.photo_url || ''}
              alt="You"
              style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 6px', border: '2px solid #e6e4e0', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.profile?.full_name ?? 'You')}&background=201c1d&color=c4e012&size=104` }}
            />
            <div style={{ fontSize: 12, fontWeight: 500, color: '#201c1d' }}>{user?.profile?.full_name}</div>
            <div style={{ fontSize: 10, color: '#5a9e00', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Challenger</div>
          </div>

          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f6f5f3', border: '1px solid #e6e4e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 800, color: '#aaa79f', flexShrink: 0 }}>
            VS
          </div>

          <div style={{ textAlign: 'center', width: 110 }}>
            <img
              src={target.photo_url || ''}
              alt={target.full_name}
              style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 6px', border: '2px solid #e6e4e0', display: 'block' }}
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(target.full_name)}&background=f6f5f3&color=201c1d&size=104` }}
            />
            <div style={{ fontSize: 12, fontWeight: 500, color: '#201c1d' }}>{target.full_name}</div>
            <div style={{ fontSize: 10, color: '#aaa79f', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>Challenged</div>
          </div>
        </div>

        {willUseWildcard && (
          <div
            style={{
              margin: '0 20px 12px',
              padding: '10px 14px',
              background: '#fff8e6',
              borderRadius: 8,
              border: '1px solid rgba(224, 145, 79, 0.45)',
              fontSize: 12,
              color: '#5c4518',
              lineHeight: 1.45,
            }}
          >
            <strong style={{ color: '#b35a18' }}>Wildcard</strong> — They’re more than {NORMAL_CHALLENGE_RANGE} spots above you, so this challenge uses 1 of your wildcards.
          </div>
        )}

        {/* Rules */}
        <div style={{ margin: '0 20px 16px' }}>
          {[
            { icon: '📅', title: '7 days to play', sub: 'Arrange within 7 days of acceptance.' },
            { icon: '🎾', title: '9-game pro set', sub: 'You bring balls. Venue is their choice.' },
            {
              icon: '⚡',
              title: 'Challenges tab',
              sub: 'They’ll get your challenge in the app under Challenges — remind them to check there.',
            },
          ].map(r => (
            <div key={r.title} style={{ display: 'flex', gap: 10, padding: '9px 0', borderBottom: '1px solid #e6e4e0' }}>
              <div style={{ fontSize: 15, flexShrink: 0, marginTop: 1 }}>{r.icon}</div>
              <div style={{ fontSize: 13, color: '#7a7672' }}>
                <strong style={{ color: '#201c1d', display: 'block', fontSize: 13, marginBottom: 1 }}>{r.title}</strong>
                {r.sub}
              </div>
            </div>
          ))}
        </div>

        {normalizeUsPhoneE164(theirPhone) === null && (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: '#f6f5f3', borderRadius: 6, fontSize: 12, color: '#7a7672', lineHeight: 1.45 }}>
            We don’t have a valid phone on file for them (optional for ladder play). They’ll still see your challenge in the app.
          </div>
        )}

        {error && (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: '#fde8e8', borderRadius: 6, fontSize: 12, color: '#c0392b' }}>
            {error}
          </div>
        )}

        <div style={{ padding: '0 20px' }}>
          <button
            type="button"
            className="btn-primary"
            onClick={e => {
              e.preventDefault()
              void handleSend()
            }}
            disabled={loading}
            style={{ background: '#c4e012', color: '#201c1d' }}
          >
            {loading ? 'Sending…' : 'Send challenge'}
          </button>
          <button type="button" className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
