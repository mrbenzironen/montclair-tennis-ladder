import { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { supabase } from '../../lib/supabase'
import { InviteFriendSheet } from '../modals/InviteFriendSheet'

type AccountScreen = 'photo' | 'phone' | 'email' | 'contact' | 'leave' | null

export function ProfileScreen() {
  const { user, refreshProfile, signOut } = useAuth()
  const [accountScreen, setAccountScreen] = useState<AccountScreen>(null)
  const [leaveOn, setLeaveOn] = useState(user?.profile?.on_leave ?? false)
  const [inviteFriendOpen, setInviteFriendOpen] = useState(false)
  const [inviteToast, setInviteToast] = useState(false)

  const profile = user?.profile
  if (!profile) return <div className="loading-screen"><div className="spinner" /></div>

  const streak = profile.wins > 0 ? `W${Math.min(profile.wins, 5)}` : profile.losses > 0 ? `L${Math.min(profile.losses, 3)}` : '—'

  async function toggleLeave() {
    const newVal = !leaveOn
    setLeaveOn(newVal)
    await supabase.from('users').update({ on_leave: newVal, leave_start: newVal ? new Date().toISOString() : null }).eq('id', user!.id)
    refreshProfile()
  }

  if (accountScreen) {
    return <AccountSubScreen screen={accountScreen} onBack={() => setAccountScreen(null)} />
  }

  return (
    <div className="screen-root" style={{ background: '#f6f5f3' }}>
      {/* Hero */}
      <div style={{ background: '#201c1d', padding: '20px 20px 0', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16 }}>
          <img
            src={profile.photo_url || ''}
            alt={profile.full_name}
            style={{ width: 80, height: 80, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, border: '3px solid #c4e012' }}
            onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.full_name)}&background=c4e012&color=201c1d&size=160` }}
          />
          <div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, textTransform: 'uppercase', color: '#fff', lineHeight: 1, marginBottom: 4 }}>
              {profile.full_name}
            </div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#c4e012', marginBottom: 6 }}>
              ⚡ {profile.ladder?.name ?? ''} Ladder
            </div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.35)', fontWeight: 300 }}>
              NTRP {profile.ntrp} · Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
          </div>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><div className="hero-stat-val green">#{profile.rank}</div><div className="hero-stat-label">Rank</div></div>
          <div className="hero-stat"><div className="hero-stat-val">{profile.wins}</div><div className="hero-stat-label">Wins</div></div>
          <div className="hero-stat"><div className="hero-stat-val red">{profile.losses}</div><div className="hero-stat-label">Losses</div></div>
          <div className="hero-stat"><div className="hero-stat-val green">{streak}</div><div className="hero-stat-label">Streak</div></div>
        </div>
      </div>

      <div className="scroll" style={{ paddingBottom: 80 }}>
        {/* Wildcards */}
        <div style={{ margin: '14px 14px 0' }}>
          <div style={{ background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0ede8' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#201c1d' }}>⚡ Wildcards</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 14 }}>
              <div style={{ width: 48, height: 48, borderRadius: 10, background: '#201c1d', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, color: '#c4e012', lineHeight: 1 }}>{profile.wildcards}</div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500, color: '#201c1d', marginBottom: 3 }}>{profile.wildcards} wildcard{profile.wildcards !== 1 ? 's' : ''} available</div>
                <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, lineHeight: 1.4 }}>Challenge up to 20 spots above. Next wildcard after {5 - (profile.matches_played % 5)} more match{5 - (profile.matches_played % 5) !== 1 ? 'es' : ''}.</div>
              </div>
              {profile.wildcards > 0 && (
                <button style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 12px', border: '1.5px solid #201c1d', background: 'transparent', color: '#201c1d', borderRadius: 4, cursor: 'pointer' }}>Use</button>
              )}
            </div>
          </div>
        </div>

        {/* Temp Leave */}
        <div style={{ margin: '12px 14px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', borderBottom: '1px solid #f0ede8' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#201c1d' }}>✈️ Temp Leave</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#201c1d', marginBottom: 2 }}>Pause my spot on the ladder</div>
              <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, lineHeight: 1.4 }}>Hidden from standings. 5 spots dropped per full week away.</div>
            </div>
            <button className={`toggle ${leaveOn ? 'on' : ''}`} onClick={toggleLeave}>
              <div className="toggle-thumb" />
            </button>
          </div>
          {leaveOn && (
            <div style={{ margin: '0 14px 14px', padding: '10px 14px', background: '#fff3e0', borderRadius: 8, fontSize: 12, color: '#7a3a10', lineHeight: 1.5 }}>
              ✈️ You're currently on temp leave. You're hidden from the ladder.
            </div>
          )}
        </div>

        {/* Tournament qualification */}
        <div style={{ margin: '12px 14px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0ede8' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#201c1d' }}>🏅 Tournament</div>
          </div>
          <div style={{ padding: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#201c1d' }}>Qualifying matches</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 800, color: profile.matches_played >= 5 ? '#4a6000' : '#201c1d' }}>
                {Math.min(profile.matches_played, 5)} / 5
              </div>
            </div>
            <div style={{ height: 6, background: '#e6e4e0', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.min((profile.matches_played / 5) * 100, 100)}%`, background: profile.matches_played >= 5 ? '#c4e012' : '#201c1d', borderRadius: 3, transition: 'width 0.3s' }} />
            </div>
            <div style={{ fontSize: 11, color: '#aaa79f', marginTop: 6, fontWeight: 300 }}>
              {profile.matches_played >= 5 ? '✓ You qualify for the October tournament!' : `${5 - profile.matches_played} more match${5 - profile.matches_played !== 1 ? 'es' : ''} needed to qualify.`}
            </div>
          </div>
        </div>

        {/* Invite */}
        <div style={{ margin: '12px 14px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0f8d0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>👋</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: '#201c1d', marginBottom: 2 }}>Invite a friend</div>
              <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, lineHeight: 1.4 }}>Share a sign-up link with your phone’s share sheet or copy the message.</div>
            </div>
            <button
              type="button"
              onClick={() => setInviteFriendOpen(true)}
              style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '8px 12px', border: '1.5px solid #201c1d', background: 'transparent', color: '#201c1d', borderRadius: 4, cursor: 'pointer', flexShrink: 0 }}
            >
              Invite
            </button>
          </div>
          {inviteToast && (
            <div style={{ padding: '0 14px 12px', fontSize: 12, color: '#4a6000', fontWeight: 500 }}>
              Invite link ready.
            </div>
          )}
        </div>

        {/* Account */}
        <div style={{ margin: '12px 14px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <div style={{ padding: '12px 14px', borderBottom: '1px solid #f0ede8' }}>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#201c1d' }}>⚙️ Account</div>
          </div>
          {[
            { icon: '📷', bg: '#f0f8d0', label: 'Update profile photo', screen: 'photo' as AccountScreen },
            { icon: '📱', bg: '#e8f0ff', label: 'Cell phone', sub: profile.phone, screen: 'phone' as AccountScreen },
            { icon: '✉️', bg: '#fff3e0', label: 'Email', sub: user?.email, screen: 'email' as AccountScreen },
            { icon: '💬', bg: '#fde8e8', label: 'Contact Benzi', screen: 'contact' as AccountScreen },
          ].map(row => (
            <div key={row.label} onClick={() => setAccountScreen(row.screen)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', borderBottom: '1px solid #f0ede8', cursor: 'pointer' }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: row.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>{row.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, color: '#201c1d' }}>{row.label}</div>
                {row.sub && <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, marginTop: 1 }}>{row.sub}</div>}
              </div>
              <div style={{ fontSize: 18, color: '#cbc8c2' }}>›</div>
            </div>
          ))}
          <div onClick={() => setAccountScreen('leave')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 14px', cursor: 'pointer' }}>
            <div style={{ width: 34, height: 34, borderRadius: 8, background: '#f0ede8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 17, flexShrink: 0 }}>🚪</div>
            <div style={{ flex: 1, fontSize: 14, color: '#c0392b' }}>Leave the ladder</div>
            <div style={{ fontSize: 18, color: '#f0d0d0' }}>›</div>
          </div>
        </div>

        {/* Sign out */}
        <div style={{ margin: '12px 14px 0' }}>
          <button onClick={signOut} style={{ width: '100%', padding: 13, background: 'transparent', color: '#aaa79f', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 12, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', border: '1.5px solid #e6e4e0', borderRadius: 6, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
        <div style={{ height: 20 }} />
      </div>

      {inviteFriendOpen && (
        <InviteFriendSheet
          onClose={() => setInviteFriendOpen(false)}
          onSent={() => {
            setInviteToast(true)
            window.setTimeout(() => setInviteToast(false), 4000)
          }}
        />
      )}
    </div>
  )
}

// ── Account sub-screens ────────────────────────────────────────
function AccountSubScreen({ screen, onBack }: { screen: AccountScreen; onBack: () => void }) {
  const { user, refreshProfile } = useAuth()
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)
  const [phone, setPhone] = useState(user?.profile?.phone ?? '')
  const [email, setEmail] = useState(user?.email ?? '')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [message, setMessage] = useState('')
  const [leaveConfirm, setLeaveConfirm] = useState('')

  const titles: Record<NonNullable<AccountScreen>, string> = {
    photo: 'Profile Photo', phone: 'Cell Phone', email: 'Email',
    contact: 'Contact Benzi', leave: 'Leave the Ladder',
  }

  async function savePhone() {
    setLoading(true)
    await supabase.from('users').update({ phone }).eq('id', user!.id)
    await refreshProfile()
    setSaved(true)
    setTimeout(() => { setSaved(false); onBack() }, 1500)
    setLoading(false)
  }

  async function saveEmail() {
    setLoading(true)
    if (password) await supabase.auth.updateUser({ email, password })
    else await supabase.auth.updateUser({ email })
    await refreshProfile()
    setSaved(true)
    setTimeout(() => { setSaved(false); onBack() }, 1500)
    setLoading(false)
  }

  async function sendMessage() {
    setLoading(true)
    // In a real app this would trigger an email/SMS to Benzi
    await new Promise(r => setTimeout(r, 800))
    setSaved(true)
    setTimeout(() => { setSaved(false); onBack() }, 1500)
    setLoading(false)
  }

  async function leaveForReal() {
    if (leaveConfirm.toUpperCase() !== 'LEAVE') return
    setLoading(true)
    await supabase.from('users').delete().eq('id', user!.id)
    await supabase.auth.signOut()
    setLoading(false)
  }

  return (
    <div className="screen-root" style={{ background: '#f6f5f3' }}>
      <div style={{ background: '#201c1d', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 20px', flexShrink: 0, position: 'relative' }}>
        <button onClick={onBack} style={{ position: 'absolute', left: 12, color: 'rgba(255,255,255,0.5)', fontSize: 24, background: 'none', border: 'none', cursor: 'pointer', padding: 8 }}>←</button>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 17, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>
          {titles[screen!]}
        </div>
      </div>

      <div className="scroll" style={{ paddingBottom: 80 }}>
        {screen === 'phone' && (
          <>
            <div style={{ margin: '14px 14px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 14 }}>
              <div className="form-field">
                <label>Cell Phone</label>
                <input className="form-input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} />
              </div>
              <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, lineHeight: 1.5 }}>
                Only shared with players you're in an active challenge with. Never publicly visible on the ladder.
              </div>
            </div>
            <div style={{ margin: '12px 14px' }}>
              <button className="btn-primary" onClick={savePhone} disabled={loading} style={saved ? { background: '#4a6000', color: '#fff' } : {}}>
                {saved ? '✓ Saved!' : loading ? 'Saving…' : 'Save Number'}
              </button>
            </div>
          </>
        )}

        {screen === 'email' && (
          <>
            <div style={{ margin: '14px 14px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 14 }}>
              <div className="form-field">
                <label>Email</label>
                <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} />
              </div>
              <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, lineHeight: 1.5, marginBottom: 14 }}>Used for login. Never shared with other players.</div>
              <div className="form-field">
                <label>New Password (optional)</label>
                <input className="form-input" type="password" value={password} placeholder="Leave blank to keep current" onChange={e => setPassword(e.target.value)} />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>Confirm Password</label>
                <input className="form-input" type="password" value={confirm} placeholder="Confirm new password" onChange={e => setConfirm(e.target.value)} />
              </div>
            </div>
            <div style={{ margin: '12px 14px' }}>
              <button className="btn-primary" onClick={saveEmail} disabled={loading || (password !== '' && password !== confirm)} style={saved ? { background: '#4a6000', color: '#fff' } : {}}>
                {saved ? '✓ Saved!' : loading ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </>
        )}

        {screen === 'contact' && (
          <>
            <div style={{ padding: '16px 14px 8px', fontSize: 13, color: '#7a7672', fontWeight: 300, lineHeight: 1.6 }}>
              Reach out to Benzi for rule questions, disputes, or anything ladder-related.
            </div>
            <div style={{ margin: '0 14px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#201c1d', color: '#c4e012', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, flexShrink: 0 }}>B</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#201c1d' }}>Benzi</div>
                  <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, marginTop: 1 }}>Ladder Administrator</div>
                </div>
                <a href="sms:+19735550100" style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', padding: '7px 12px', border: '1.5px solid #e6e4e0', background: 'transparent', color: '#201c1d', borderRadius: 4, cursor: 'pointer', textDecoration: 'none' }}>📱 Text</a>
              </div>
            </div>
            <div style={{ margin: '12px 14px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 14 }}>
              <div className="form-field">
                <label>Subject</label>
                <input className="form-input" type="text" placeholder="e.g. Score dispute, rule question…" />
              </div>
              <div className="form-field" style={{ marginBottom: 0 }}>
                <label>Message</label>
                <textarea className="form-input" rows={4} placeholder="Describe your issue or question…" value={message} onChange={e => setMessage(e.target.value)} />
              </div>
            </div>
            <div style={{ margin: '12px 14px' }}>
              <button className="btn-primary" onClick={sendMessage} disabled={loading || !message} style={saved ? { background: '#4a6000', color: '#fff' } : {}}>
                {saved ? '✓ Sent!' : loading ? 'Sending…' : 'Send Message'}
              </button>
            </div>
          </>
        )}

        {screen === 'photo' && (
          <>
            <div style={{ margin: '14px 14px 0', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '24px 20px 16px' }}>
                <div style={{ width: 110, height: 110, borderRadius: '50%', border: '3px solid #c4e012', overflow: 'hidden', marginBottom: 16, cursor: 'pointer' }}>
                  <img src={user?.profile?.photo_url || ''} alt="Current" style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.profile?.full_name ?? 'Me')}&background=c4e012&color=201c1d&size=220` }} />
                </div>
                <div style={{ fontSize: 12, color: '#aaa79f', textAlign: 'center', lineHeight: 1.5, marginBottom: 16, fontWeight: 300 }}>
                  Your photo appears on the ladder and helps other players recognise you.
                </div>
                <button style={{ width: '100%', padding: 13, marginBottom: 10, border: '1.5px solid #e6e4e0', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 500, color: '#201c1d' }}>
                  📷 Take a New Selfie
                </button>
                <button style={{ width: '100%', padding: 13, border: '1.5px solid #e6e4e0', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 500, color: '#201c1d' }}>
                  🖼️ Choose from Library
                </button>
              </div>
            </div>
            <div style={{ margin: '12px 14px', padding: '12px 14px', background: '#f0f8d0', borderRadius: 8, borderLeft: '3px solid #c4e012', fontSize: 12, color: '#4a6000', lineHeight: 1.5 }}>
              📸 <strong>Tips:</strong> Face forward · Good lighting · No hats or sunglasses
            </div>
          </>
        )}

        {screen === 'leave' && (
          <>
            <div style={{ padding: '16px 14px 8px', fontSize: 13, color: '#7a7672', fontWeight: 300, lineHeight: 1.6 }}>
              Leaving is permanent for this season. You'll start from the bottom if you re-register next season.
            </div>
            <div style={{ margin: '0 14px', background: '#fff8f8', borderRadius: 12, overflow: 'hidden', border: '1.5px solid #f0d0d0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 14, borderBottom: '1px solid #f0d0d0' }}>
                <span style={{ fontSize: 18 }}>⚠️</span>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 14, fontWeight: 800, textTransform: 'uppercase', color: '#c0392b' }}>This cannot be undone</div>
              </div>
              <div style={{ padding: 14 }}>
                <div style={{ fontSize: 13, color: '#7a7672', lineHeight: 1.6, fontWeight: 300, marginBottom: 12 }}>If you leave the ladder mid-season:</div>
                {['Your ranking and match history are removed', 'Any active challenges are cancelled', 'You cannot re-join until next season', 'Wildcards and tournament qualification are lost'].map(c => (
                  <div key={c} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, fontSize: 12, color: '#7a3a10', marginBottom: 6 }}>❌ <span>{c}</span></div>
                ))}
                <div style={{ background: '#f0f8d0', borderRadius: 8, padding: 12, margin: '12px 0', fontSize: 12, color: '#4a6000', lineHeight: 1.5 }}>
                  💡 <strong>Taking a break?</strong> Use <strong>Temp Leave</strong> instead — keeps your spot without losing progress.
                </div>
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontSize: 12, color: '#7a7672', marginBottom: 6 }}>Type <strong>LEAVE</strong> to confirm</div>
                  <input className="form-input" type="text" placeholder="LEAVE" value={leaveConfirm} onChange={e => setLeaveConfirm(e.target.value)} style={{ border: '1.5px solid #f0d0d0' }} />
                </div>
                <button className="btn-danger" onClick={leaveForReal} disabled={leaveConfirm.toUpperCase() !== 'LEAVE' || loading}>
                  {loading ? 'Leaving…' : 'Leave the Ladder'}
                </button>
              </div>
            </div>
          </>
        )}

        <div style={{ height: 20 }} />
      </div>
    </div>
  )
}
