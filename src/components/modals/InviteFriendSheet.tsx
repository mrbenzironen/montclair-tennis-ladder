import { useState, type FormEvent } from 'react'
import { normalizeUsPhoneE164 } from '../../lib/phone'
import { sendFriendInvite } from '../../lib/invites'
import { useAuth } from '../../hooks/useAuth'

interface Props {
  onClose: () => void
  onSent: () => void
}

export function InviteFriendSheet({ onClose, onSent }: Props) {
  const { user } = useAuth()
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError('')
    if (!user?.id) {
      setError('You need to be signed in to send an invite.')
      return
    }
    const normalized = normalizeUsPhoneE164(phone)
    if (!normalized) {
      setError('Enter a valid US cell number (10 digits).')
      return
    }
    setLoading(true)
    try {
      await sendFriendInvite(phone.trim(), user.id)
      onSent()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    }
    setLoading(false)
  }

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && !loading && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />

        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', padding: '16px 20px 4px' }}>
          Invite a friend
        </div>
        <div style={{ fontSize: 13, color: '#7a7672', fontWeight: 300, lineHeight: 1.5, padding: '0 20px 16px' }}>
          We’ll text them that you invited them to join the Montclair Tennis Ladder, with a link to sign up.
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: '0 20px 16px' }}>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>
              Their cell phone
            </label>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={loading}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 14px',
                fontSize: 16,
                border: '1.5px solid #e6e4e0',
                borderRadius: 6,
                background: '#fff',
                color: '#201c1d',
              }}
            />
          </div>

          {error && (
            <div style={{ margin: '0 20px 12px', padding: '10px 14px', background: '#fde8e8', borderRadius: 6, fontSize: 12, color: '#c0392b' }}>
              {error}
            </div>
          )}

          <div style={{ padding: '0 20px' }}>
            <button type="submit" className="btn-primary" disabled={loading} style={{ background: '#c4e012', color: '#201c1d' }}>
              {loading ? 'Sending…' : 'Send invite text'}
            </button>
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
