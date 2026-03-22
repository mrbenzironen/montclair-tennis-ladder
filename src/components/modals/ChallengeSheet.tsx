import { useState } from 'react'
import { User } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { sendChallenge } from '../../lib/challenges'
import { normalizeUsPhoneE164 } from '../../lib/phone'
import { openSmsComposer } from '../../lib/sms'

interface Props {
  target: User
  onClose: () => void
  /** Called after the challenge is saved and SMS composer is opened (or skipped). */
  onSent: () => void
}

export function ChallengeSheet({ target, onClose, onSent }: Props) {
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSend() {
    if (!user?.profile) return
    setLoading(true)
    setError('')
    try {
      await sendChallenge(
        user.id,
        target.id,
        user.profile.ladder_id!,
        false
      )
      const first = target.full_name.split(' ')[0]
      const msg = `${user.profile.full_name} challenged you on the Montclair Tennis Ladder — open the app to respond: https://montclair.tennis`
      const phone = normalizeUsPhoneE164(target.phone || '')
      openSmsComposer(msg, phone)
      onSent()
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', padding: '16px 20px 4px' }}>
          Challenge {target.full_name.split(' ')[0]}?
        </div>
        <div style={{ fontSize: 13, color: '#7a7672', fontWeight: 300, lineHeight: 1.5, padding: '0 20px 16px' }}>
          They have 48 hours to accept or decline.
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

        {/* Rules */}
        <div style={{ margin: '0 20px 16px' }}>
          {[
            { icon: '📅', title: '14 days to play', sub: 'Arrange within 14 days of acceptance.' },
            { icon: '🎾', title: '9-game pro set', sub: 'You bring balls. Venue is their choice.' },
            { icon: '📱', title: 'Text them (optional)', sub: 'After you send, your SMS app opens with a message you can send to nudge them.' },
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

        {error && (
          <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: '#fde8e8', borderRadius: 6, fontSize: 12, color: '#c0392b' }}>
            {error}
          </div>
        )}

        <div style={{ padding: '0 20px' }}>
          <button className="btn-primary" onClick={handleSend} disabled={loading} style={{ background: '#c4e012', color: '#201c1d' }}>
            {loading ? 'Sending…' : `Send Challenge →`}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
