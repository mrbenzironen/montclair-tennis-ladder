import { useState, useRef, useEffect } from 'react'
import { Challenge, User } from '../../types'
import { useAuth } from '../../hooks/useAuth'
import { reportScore, confirmScore } from '../../lib/challenges'

interface Props {
  challenge: Challenge
  onClose: () => void
  onComplete: () => void
}

export function ReportScoreSheet({ challenge, onClose, onComplete }: Props) {
  const { user } = useAuth()
  const [iWon, setIWon] = useState<boolean | null>(null)
  const [myScore, setMyScore] = useState('')
  const [oppScore, setOppScore] = useState('')
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const isChallenger = challenge.challenger_id === user?.id
  const opponent = isChallenger ? challenge.challenged : challenge.challenger

  function launchConfetti() {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    const balls = Array.from({ length: 38 }, () => ({
      x: Math.random() * canvas.width,
      y: -20 - Math.random() * 200,
      r: 6 + Math.random() * 10,
      rot: Math.random() * Math.PI * 2,
      rotSpeed: (Math.random() - 0.5) * 0.15,
      vx: (Math.random() - 0.5) * 3.5,
      vy: 2.5 + Math.random() * 3.5,
      opacity: 0.85 + Math.random() * 0.15,
      wobble: Math.random() * Math.PI * 2,
      wobbleSpeed: 0.05 + Math.random() * 0.05,
    }))

    let frame = 0
    const maxFrames = 220

    function drawBall(x: number, y: number, r: number, rot: number, opacity: number) {
      if (!ctx) return
      ctx.save()
      ctx.globalAlpha = opacity
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fillStyle = '#c4e012'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.strokeStyle = 'rgba(255,255,255,0.6)'
      ctx.lineWidth = r * 0.18
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.55, 0.3, Math.PI - 0.3)
      ctx.stroke()
      ctx.beginPath()
      ctx.arc(0, 0, r * 0.55, Math.PI + 0.3, Math.PI * 2 - 0.3)
      ctx.stroke()
      ctx.restore()
    }

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      frame++
      balls.forEach(b => {
        b.wobble += b.wobbleSpeed
        b.x += b.vx + Math.sin(b.wobble) * 0.8
        b.y += b.vy
        b.rot += b.rotSpeed
        b.vy += 0.08
        const fade = frame > maxFrames * 0.7 ? 1 - (frame - maxFrames * 0.7) / (maxFrames * 0.3) : 1
        drawBall(b.x, b.y, b.r, b.rot, b.opacity * fade)
      })
      if (frame < maxFrames) requestAnimationFrame(animate)
      else ctx.clearRect(0, 0, canvas.width, canvas.height)
    }
    animate()
  }

  async function handleSubmit() {
    if (iWon === null || !user?.profile) return
    setLoading(true)
    try {
      const winnerId = iWon ? user.id : (opponent?.id ?? '')
      const loserId = iWon ? (opponent?.id ?? '') : user.id
      const wScore = iWon ? (parseInt(myScore) || null) : (parseInt(oppScore) || null)
      const lScore = iWon ? (parseInt(oppScore) || null) : (parseInt(myScore) || null)
      await reportScore(challenge.id, winnerId, loserId, wScore, lScore, user.id)
      if (iWon) {
        setConfirmed(true)
        setTimeout(launchConfetti, 100)
      } else {
        onComplete()
      }
    } catch (e: any) {
      alert(e.message)
    }
    setLoading(false)
  }

  if (confirmed) {
    return (
      <div className="sheet-overlay">
        <div className="sheet" style={{ position: 'relative', overflow: 'hidden' }}>
          <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 10 }} />
          <div className="sheet-handle" />
          <div style={{ textAlign: 'center', padding: '24px 20px 20px', position: 'relative', zIndex: 11 }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🏆</div>
            <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 28, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', letterSpacing: -0.5, marginBottom: 4 }}>
              Result Reported!
            </div>
            <div style={{ fontSize: 13, color: '#7a7672', fontWeight: 300, lineHeight: 1.5 }}>
              {opponent?.full_name} has 2 hours to confirm.<br />It auto-confirms if they don't respond.
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10, margin: '0 20px 20px' }}>
            <div style={{ flex: 1, background: '#f0f8d0', borderRadius: 8, padding: 14, textAlign: 'center' }}>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 26, fontWeight: 800, color: '#4a6000', lineHeight: 1 }}>
                Pending
              </div>
              <div style={{ fontSize: 10, color: '#7a9000', marginTop: 3, textTransform: 'uppercase', letterSpacing: 1, fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700 }}>
                Awaiting Confirm
              </div>
            </div>
          </div>
          <div style={{ padding: '0 20px' }}>
            <button className="btn-primary" onClick={onComplete}>Back to Challenges →</button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="sheet-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="sheet">
        <div className="sheet-handle" />

        {/* Match header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 20px 0' }}>
          <div style={{ textAlign: 'center', width: 100 }}>
            <img src={user?.profile?.photo_url || ''} alt="You" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 6px', display: 'block', border: iWon === true ? '2px solid #c4e012' : '2px solid #e6e4e0' }}
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=Me&background=201c1d&color=c4e012&size=104` }} />
            <div style={{ fontSize: 12, fontWeight: 500, color: '#201c1d' }}>You</div>
            <div style={{ fontSize: 10, color: iWon === true ? '#4a6000' : '#aaa79f', fontFamily: "'Barlow Condensed', sans-serif", fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginTop: 2 }}>
              {iWon === true ? 'Winner' : 'Reporter'}
            </div>
          </div>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#f6f5f3', border: '1px solid #e6e4e0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 800, color: '#aaa79f', flexShrink: 0 }}>VS</div>
          <div style={{ textAlign: 'center', width: 100 }}>
            <img src={opponent?.photo_url || ''} alt={opponent?.full_name} style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', margin: '0 auto 6px', display: 'block', border: '2px solid #e6e4e0' }}
              onError={e => { (e.target as HTMLImageElement).src = `https://ui-avatars.com/api/?name=${encodeURIComponent(opponent?.full_name ?? 'Opp')}&background=f6f5f3&color=201c1d&size=104` }} />
            <div style={{ fontSize: 12, fontWeight: 500, color: '#201c1d' }}>{opponent?.full_name?.split(' ')[0]}</div>
          </div>
        </div>

        {/* Who won */}
        <div style={{ padding: '20px 20px 0' }}>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 10 }}>Who won?</div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
            <div onClick={() => setIWon(true)} style={{ flex: 1, padding: '14px 8px', borderRadius: 8, border: `2px solid ${iWon === true ? '#c4e012' : '#e6e4e0'}`, background: iWon === true ? '#f8fce8' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>🏆</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: iWon === true ? '#4a6000' : '#201c1d' }}>I Won</div>
            </div>
            <div onClick={() => setIWon(false)} style={{ flex: 1, padding: '14px 8px', borderRadius: 8, border: `2px solid ${iWon === false ? '#e07070' : '#e6e4e0'}`, background: iWon === false ? '#fdf0f0' : '#fff', cursor: 'pointer', textAlign: 'center' }}>
              <div style={{ fontSize: 22, marginBottom: 4 }}>😔</div>
              <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: iWon === false ? '#c0392b' : '#aaa79f' }}>I Lost</div>
            </div>
          </div>

          {/* Optional score */}
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 8 }}>
            Score <span style={{ fontWeight: 300, textTransform: 'none', letterSpacing: 0, fontFamily: "'Barlow', sans-serif", fontSize: 10, color: '#cbc8c2' }}>— optional</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#f6f5f3', borderRadius: 8, padding: '12px 16px', marginBottom: 6 }}>
            <span style={{ fontSize: 12, color: '#7a7672', flex: 1 }}>You</span>
            <input type="number" min={0} max={9} value={myScore} onChange={e => setMyScore(e.target.value)}
              style={{ width: 52, height: 40, border: '1.5px solid #201c1d', borderRadius: 6, background: '#fff', textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#201c1d', outline: 'none' }} />
            <span style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 18, fontWeight: 800, color: '#cbc8c2' }}>–</span>
            <input type="number" min={0} max={9} value={oppScore} onChange={e => setOppScore(e.target.value)}
              style={{ width: 52, height: 40, border: '1.5px solid #e6e4e0', borderRadius: 6, background: '#fff', textAlign: 'center', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, color: '#201c1d', outline: 'none' }} />
            <span style={{ fontSize: 12, color: '#7a7672', flex: 1, textAlign: 'right' }}>{opponent?.full_name?.split(' ')[0]}</span>
          </div>
          <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, textAlign: 'center', marginBottom: 14 }}>
            9-game pro set · tap to edit
          </div>

          {/* Auto-confirm note */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginBottom: 16, padding: '10px 14px', background: '#f0f8d0', borderRadius: 6, borderLeft: '3px solid #c4e012' }}>
            <span style={{ fontSize: 14, flexShrink: 0 }}>⏱️</span>
            <div style={{ fontSize: 11, color: '#4a6000', lineHeight: 1.5, fontWeight: 300 }}>
              {opponent?.full_name?.split(' ')[0]} will be notified by text to confirm. If they don't respond within <strong>2 hours</strong>, the result confirms automatically.
            </div>
          </div>

          <button className="btn-primary" onClick={handleSubmit} disabled={iWon === null || loading}>
            {loading ? 'Submitting…' : 'Submit Result →'}
          </button>
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  )
}
