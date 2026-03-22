import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { User } from '../../types'
import { useAuth } from '../../hooks/useAuth'

export function AdminScreen() {
  const { user } = useAuth()
  const [players, setPlayers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPlayer, setSelectedPlayer] = useState<User | null>(null)
  const [msgBody, setMsgBody] = useState('The season officially starts April 1st. All players are now visible on the ladder. Good luck! 🎾')
  const [msgChannel, setMsgChannel] = useState<'sms' | 'inapp' | 'both'>('sms')
  const [msgAudience, setMsgAudience] = useState<'all' | 'advanced'>('all')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'suspend' | 'remove' | null>(null)
  const [toast, setToast] = useState('')

  useEffect(() => {
    loadPlayers()
  }, [])

  async function loadPlayers() {
    const { data } = await supabase.from('users').select('*').order('rank')
    setPlayers((data ?? []) as User[])
    setLoading(false)
  }

  function showToast(msg: string) {
    setToast(msg)
    setTimeout(() => setToast(''), 2500)
  }

  async function sendBroadcast() {
    setSending(true)
    await supabase.functions.invoke('send-sms', {
      body: { type: 'broadcast', body: msgBody, channel: msgChannel, audience: msgAudience },
    })
    setSending(false)
    setSent(true)
    showToast(`✓ Sent to ${players.length} players`)
    setTimeout(() => setSent(false), 2500)
  }

  async function suspendPlayer() {
    if (!selectedPlayer) return
    await supabase.from('users').update({ is_hidden: true }).eq('id', selectedPlayer.id)
    setConfirmAction(null)
    setSelectedPlayer(null)
    showToast(`⏸ ${selectedPlayer.full_name} suspended`)
    loadPlayers()
  }

  async function removePlayer() {
    if (!selectedPlayer) return
    await supabase.from('users').delete().eq('id', selectedPlayer.id)
    setConfirmAction(null)
    setSelectedPlayer(null)
    showToast(`🚫 ${selectedPlayer.full_name} removed`)
    loadPlayers()
  }

  const activeCount = players.filter(p => !p.is_hidden && !p.on_leave).length
  const leaveCount = players.filter(p => p.on_leave).length
  const hiddenCount = players.filter(p => p.is_hidden).length

  return (
    <div className="screen-root" style={{ background: '#f6f5f3' }}>
      {/* Header */}
      <div style={{ background: '#201c1d', padding: '0', flexShrink: 0 }}>
        <div style={{ padding: '14px 20px 0', textAlign: 'center' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: '#fff' }}>Admin Panel</div>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'rgba(196,224,18,0.15)', border: '1px solid rgba(196,224,18,0.3)', borderRadius: 20, padding: '4px 12px', marginTop: 6 }}>
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#c4e012' }}>⚙️ Benzi</span>
          </div>
        </div>
        <div style={{ display: 'flex', borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 12 }}>
          {[
            { val: activeCount, lbl: 'Active' },
            { val: leaveCount, lbl: 'On Leave' },
            { val: hiddenCount, lbl: 'Hidden' },
            { val: players.length, lbl: 'Total' },
          ].map((s, i) => (
            <div key={s.lbl} style={{ flex: 1, padding: '12px 8px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, color: i === 0 ? '#c4e012' : i === 2 ? '#e0914f' : '#fff', lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', letterSpacing: 1.5, textTransform: 'uppercase', marginTop: 3, fontWeight: 600 }}>{s.lbl}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="scroll" style={{ paddingBottom: 80 }}>
        {/* Broadcast */}
        <div className="section-label">📢 Broadcast Message</div>
        <div style={{ margin: '0 14px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', padding: 14 }}>
          {/* Channel */}
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 8 }}>Send via</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['sms', 'inapp', 'both'] as const).map(ch => (
              <div key={ch} onClick={() => setMsgChannel(ch)} style={{ flex: 1, padding: '10px 8px', borderRadius: 6, border: `1.5px solid ${msgChannel === ch ? '#201c1d' : '#e6e4e0'}`, background: msgChannel === ch ? '#201c1d' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 18, marginBottom: 3 }}>{ch === 'sms' ? '📱' : ch === 'inapp' ? '🔔' : '📡'}</div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: msgChannel === ch ? '#c4e012' : '#7a7672' }}>
                  {ch === 'sms' ? 'SMS' : ch === 'inapp' ? 'In-App' : 'Both'}
                </div>
              </div>
            ))}
          </div>

          {/* Audience */}
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 8 }}>Send to</div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
            {(['all', 'advanced'] as const).map(aud => (
              <div key={aud} onClick={() => setMsgAudience(aud)} style={{ flex: 1, padding: 9, borderRadius: 6, border: `1.5px solid ${msgAudience === aud ? '#c4e012' : '#e6e4e0'}`, background: msgAudience === aud ? '#f0f8d0' : '#fff', cursor: 'pointer', textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', color: msgAudience === aud ? '#4a6000' : '#7a7672' }}>
                {aud === 'all' ? 'All Players' : 'Advanced only'}
              </div>
            ))}
          </div>

          {/* Message */}
          <div className="form-field">
            <label>Message</label>
            <textarea className="form-input" rows={3} value={msgBody} onChange={e => setMsgBody(e.target.value)} />
          </div>

          {/* Preview */}
          <div style={{ background: '#f6f5f3', borderRadius: 8, padding: '12px 14px', marginBottom: 12, borderLeft: '3px solid #201c1d' }}>
            <div style={{ fontSize: 10, color: '#aaa79f', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>📱 SMS Preview</div>
            <div style={{ fontSize: 13, color: '#7a7672', lineHeight: 1.5, fontWeight: 300 }}>
              <strong style={{ color: '#201c1d' }}>Montclair Tennis Ladder:</strong> {msgBody || '…'}
            </div>
          </div>

          <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, marginBottom: 12 }}>
            Sending to <strong style={{ color: '#201c1d' }}>{activeCount} active players</strong>
          </div>

          <button className="btn-primary" onClick={sendBroadcast} disabled={sending || !msgBody} style={sent ? { background: '#4a6000', color: '#fff' } : {}}>
            {sent ? '✓ Sent!' : sending ? 'Sending…' : `Send to ${msgAudience === 'all' ? 'All' : 'Advanced'} Players →`}
          </button>
        </div>

        {/* Players */}
        <div className="section-label">👥 Player Management</div>
        <div style={{ margin: '0 14px', background: '#fff', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {loading ? (
            <div className="loading-screen"><div className="spinner" /></div>
          ) : players.map((p, i) => {
            const statusLabel = p.is_hidden ? 'Hidden' : p.on_leave ? 'On Leave' : 'Active'
            const statusBg = p.is_hidden ? '#fde8e8' : p.on_leave ? '#fff3e0' : '#f0f8d0'
            const statusColor = p.is_hidden ? '#c0392b' : p.on_leave ? '#7a3a10' : '#4a6000'
            return (
              <div key={p.id} onClick={() => setSelectedPlayer(p)} style={{ display: 'flex', alignItems: 'center', padding: '12px 14px', borderBottom: i < players.length - 1 ? '1px solid #f0ede8' : 'none', cursor: 'pointer', gap: 12 }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 16, fontWeight: 800, color: '#aaa79f', width: 22, textAlign: 'right', flexShrink: 0 }}>{p.rank}</div>
                <img src={p.photo_url || ''} alt={p.full_name} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, opacity: p.is_hidden ? 0.5 : 1 }}
                  onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(p.full_name)}&background=f6f5f3&color=201c1d&size=72` }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, color: p.is_hidden ? '#aaa79f' : '#201c1d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.full_name}</div>
                  <div style={{ fontSize: 11, color: '#aaa79f', marginTop: 1 }}>{p.wins}W · {p.losses}L</div>
                </div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 9, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', padding: '3px 8px', borderRadius: 3, background: statusBg, color: statusColor, flexShrink: 0 }}>{statusLabel}</div>
                <div style={{ fontSize: 18, color: '#cbc8c2' }}>⋯</div>
              </div>
            )
          })}
        </div>
        <div style={{ height: 20 }} />
      </div>

      {/* Player action sheet */}
      {selectedPlayer && !confirmAction && (
        <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && setSelectedPlayer(null)}>
          <div className="sheet">
            <div className="sheet-handle" />
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '16px 20px 14px', borderBottom: '1px solid #f0ede8' }}>
              <img src={selectedPlayer.photo_url || ''} alt={selectedPlayer.full_name} style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }}
                onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedPlayer.full_name)}&background=f6f5f3&color=201c1d&size=96` }} />
              <div>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d' }}>{selectedPlayer.full_name}</div>
                <div style={{ fontSize: 12, color: '#aaa79f', fontWeight: 300, marginTop: 2 }}>#{selectedPlayer.rank} · {selectedPlayer.wins}W · {selectedPlayer.losses}L</div>
              </div>
            </div>
            {[
              { icon: '💬', bg: '#e8f0ff', label: 'Send Direct Message', sub: 'Send an SMS directly to this player', action: () => { showToast('Message sent'); setSelectedPlayer(null) } },
              { icon: '⚠️', bg: '#fff3e0', label: 'Issue Warning', sub: 'Flag repeated forfeit or rule violation', action: () => { showToast('Warning issued'); setSelectedPlayer(null) } },
              { icon: '⏸️', bg: '#fff3e0', label: 'Suspend Player', sub: 'Temporarily hide from ladder', action: () => setConfirmAction('suspend') },
            ].map(row => (
              <div key={row.label} onClick={row.action} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f0ede8', cursor: 'pointer' }}>
                <div style={{ width: 38, height: 38, borderRadius: 8, background: row.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{row.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: '#201c1d' }}>{row.label}</div>
                  <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, marginTop: 2 }}>{row.sub}</div>
                </div>
                <div style={{ fontSize: 18, color: '#cbc8c2' }}>›</div>
              </div>
            ))}
            <div onClick={() => setConfirmAction('remove')} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 20px', borderBottom: '1px solid #f0ede8', cursor: 'pointer' }}>
              <div style={{ width: 38, height: 38, borderRadius: 8, background: '#fde8e8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🚫</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 500, color: '#c0392b' }}>Remove from Ladder</div>
                <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, marginTop: 2 }}>Permanently removes player this season</div>
              </div>
              <div style={{ fontSize: 18, color: '#f0d0d0' }}>›</div>
            </div>
            <div style={{ padding: '14px 20px 0' }}>
              <button className="btn-secondary" onClick={() => setSelectedPlayer(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm dialogs */}
      {confirmAction && selectedPlayer && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(32,28,29,0.85)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 320 }}>
            <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 12 }}>{confirmAction === 'suspend' ? '⏸️' : '🚫'}</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', textAlign: 'center', marginBottom: 6 }}>
              {confirmAction === 'suspend' ? 'Suspend' : 'Remove'} {selectedPlayer.full_name.split(' ')[0]}?
            </div>
            <div style={{ fontSize: 13, color: '#7a7672', textAlign: 'center', lineHeight: 1.5, marginBottom: 20, fontWeight: 300 }}>
              {confirmAction === 'suspend'
                ? "They'll be hidden from standings and blocked from challenges until you lift the suspension."
                : 'This permanently removes them from the ladder for this season. Their match history is preserved.'}
            </div>
            <button className="btn-danger" onClick={confirmAction === 'suspend' ? suspendPlayer : removePlayer}>
              {confirmAction === 'suspend' ? 'Suspend Player' : 'Remove Player'}
            </button>
            <button className="btn-secondary" onClick={() => setConfirmAction(null)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
