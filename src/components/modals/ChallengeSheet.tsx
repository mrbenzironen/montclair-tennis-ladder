import { useState, useEffect } from 'react'
import { User } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { sendChallenge } from '../../lib/challenges'
import { getChallengesDeepLinkUrl } from '../../lib/appUrl'
import { supabase } from '../../lib/supabase'
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
  /** After challenge is saved: show explainer before opening sms: (browser “open another app” prompt). */
  const [smsDraft, setSmsDraft] = useState<{ body: string; phone: string } | null>(null)
  /** Fresh phone from DB so SMS To field isn’t empty due to stale list rows. */
  const [theirPhone, setTheirPhone] = useState(target.phone ?? '')

  useEffect(() => {
    setTheirPhone(target.phone ?? '')
    let cancelled = false
    void (async () => {
      const { data } = await supabase.from('users').select('phone').eq('id', target.id).maybeSingle()
      if (!cancelled && data?.phone != null) setTheirPhone(data.phone)
    })()
    return () => {
      cancelled = true
    }
  }, [target.id, target.phone])

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
      const theirFirst = target.full_name.split(' ')[0]
      const myFirst = user.profile.full_name.split(' ')[0]
      const link = getChallengesDeepLinkUrl()
      const msg = `Hi ${theirFirst}, it's ${myFirst}. I've challenged you on the Montclair Tennis Ladder — open this link to accept or decline in the app: ${link}`
      const { data: phoneRow } = await supabase.from('users').select('phone').eq('id', target.id).maybeSingle()
      const phoneForSms = (phoneRow?.phone ?? theirPhone ?? '').trim()
      setSmsDraft({ body: msg, phone: phoneForSms })
    } catch (e: any) {
      setError(e.message)
    }
    setLoading(false)
  }

  function handleOpenMessages() {
    if (smsDraft) openSmsComposer(smsDraft.body, smsDraft.phone)
    setSmsDraft(null)
    onSent()
  }

  function handleSkipSms() {
    setSmsDraft(null)
    onSent()
  }

  if (smsDraft) {
    const theirFirst = target.full_name.split(' ')[0]
    return (
      <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && handleSkipSms()}>
        <div className="sheet">
          <div className="sheet-handle" />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', padding: '16px 20px 8px' }}>
            Text {theirFirst} about your challenge?
          </div>
          <div style={{ fontSize: 13, color: '#7a7672', fontWeight: 300, lineHeight: 1.55, padding: '0 20px 16px' }}>
            Next we’ll open your <strong style={{ color: '#201c1d', fontWeight: 600 }}>Messages</strong> (or SMS) app with a draft text so they know you challenged them on the ladder, with a link to respond.
          </div>
          <div style={{ margin: '0 20px 16px', padding: '12px 14px', background: '#f0f8d0', borderRadius: 8, border: '1px solid #c4e012', fontSize: 12, color: '#4a6000', lineHeight: 1.5 }}>
            <strong style={{ display: 'block', marginBottom: 6, color: '#201c1d' }}>If your browser asks to open another app</strong>
            That prompt is your phone checking that the website may open <strong>Messages</strong>. Choose <strong>Allow</strong> (or Open) — we’re only doing that so you can send this text to {theirFirst}.
          </div>
          {normalizeUsPhoneE164(smsDraft.phone) === null && (
            <div style={{ margin: '0 20px 16px', padding: '10px 14px', background: '#fff8e6', borderRadius: 6, fontSize: 12, color: '#7a3a10', lineHeight: 1.45 }}>
              We still don’t have a valid cell number for {theirFirst}. Messages may open with only the draft text — ask them to add a phone in Profile.
            </div>
          )}
          <div style={{ padding: '0 20px' }}>
            <button type="button" className="btn-primary" onClick={handleOpenMessages} style={{ background: '#c4e012', color: '#201c1d' }}>
              Open Messages →
            </button>
            <button type="button" className="btn-secondary" onClick={handleSkipSms}>
              Skip for now
            </button>
          </div>
        </div>
      </div>
    )
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
            {
              icon: '📱',
              title: 'Text them',
              sub: 'After you send the challenge, you can open Messages with a draft text to notify them. Your browser may ask to allow opening Messages — that’s expected.',
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
            We don’t have a valid phone number for this player, so Messages may open without their name in the To field. Ask them to add a phone number in Profile.
          </div>
        )}

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
