import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../lib/supabase'

interface LoginScreenProps {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Tennis ball animation
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resize = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const balls = Array.from({ length: 3 }, (_, i) => ({
      x: [canvas.width * 0.1, canvas.width * 0.9, canvas.width * 0.5][i],
      y: [canvas.height + 20, canvas.height * 0.4, -30][i],
      r: [26, 19, 13][i],
      rot: 0,
      rotSpeed: [(Math.random() - 0.5) * 0.06, -(Math.random()) * 0.05, (Math.random()) * 0.07][i],
      vx: [1.8, -1.4, 0.3][i],
      vy: [-1.6, 1.2, 1.1][i],
    }))

    let frame = 0
    let animId: number

    function drawBall(x: number, y: number, r: number, rot: number) {
      if (!ctx) return
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(rot)
      ctx.beginPath()
      ctx.arc(0, 0, r, 0, Math.PI * 2)
      ctx.fillStyle = '#c4e012'
      ctx.fill()
      ctx.strokeStyle = 'rgba(0,0,0,0.08)'
      ctx.lineWidth = 1
      ctx.stroke()
      // Seam lines
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
        b.x += b.vx
        b.y += b.vy
        b.rot += b.rotSpeed

        // Wrap around
        if (b.x > canvas.width + b.r) b.x = -b.r
        if (b.x < -b.r) b.x = canvas.width + b.r
        if (b.y > canvas.height + b.r) b.y = -b.r
        if (b.y < -b.r) b.y = canvas.height + b.r

        drawBall(b.x, b.y, b.r, b.rot)
      })

      animId = requestAnimationFrame(animate)
    }

    animate()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  async function handleGoogleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleAppleLogin() {
    setLoading(true)
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'apple',
      options: { redirectTo: window.location.origin },
    })
    if (error) setError(error.message)
    setLoading(false)
  }

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: `${firstName} ${lastName}`.trim() },
        },
      })
      if (error) setError(error.message)
      else onLogin()
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
      else onLogin()
    }

    setLoading(false)
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>
      {/* Animated canvas background */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px 24px' }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
        />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <div style={{ fontSize: 72, marginBottom: 8 }}>🎾</div>
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#201c1d', marginBottom: 4 }}>
            Montclair Tennis Ladder
          </div>
          <div style={{ fontSize: 12, color: '#aaa79f', fontWeight: 300 }}>
            Competitive ladder play · Montclair, NJ
          </div>
        </div>
      </div>

      {/* Auth forms */}
      <div style={{ background: '#fff', padding: '24px 28px 36px', borderTop: '1.5px solid #e6e4e0' }}>
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '13px', marginBottom: 10, border: '1.5px solid #e6e4e0', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 500, color: '#201c1d' }}
        >
          <span>🔍</span> Continue with Google
        </button>

        <button
          onClick={handleAppleLogin}
          disabled={loading}
          style={{ width: '100%', padding: '13px', marginBottom: 10, border: '1.5px solid #e6e4e0', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 500, color: '#201c1d' }}
        >
          <span>🍎</span> Continue with Apple
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: '#e6e4e0' }} />
          <div style={{ fontSize: 11, color: '#aaa79f' }}>or {isSignUp ? 'sign up' : 'sign in'} with email</div>
          <div style={{ flex: 1, height: 1, background: '#e6e4e0' }} />
        </div>

        <form onSubmit={handleEmailAuth}>
          {isSignUp && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <input
                className="form-input"
                placeholder="First name"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                required
                style={{ flex: 1 }}
              />
              <input
                className="form-input"
                placeholder="Last name"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                required
                style={{ flex: 1 }}
              />
            </div>
          )}
          <input
            className="form-input"
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            style={{ marginBottom: 10 }}
          />
          <input
            className="form-input"
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ marginBottom: 12 }}
          />

          {error && (
            <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 10, textAlign: 'center' }}>
              {error}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Loading…' : isSignUp ? 'Create Account →' : 'Sign In →'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#aaa79f' }}>
          {isSignUp ? 'Already a member? ' : "Don't have an account? "}
          <span
            style={{ color: '#201c1d', fontWeight: 500, cursor: 'pointer' }}
            onClick={() => { setIsSignUp(!isSignUp); setError('') }}
          >
            {isSignUp ? 'Sign in' : 'Create account'}
          </span>
        </div>
      </div>
    </div>
  )
}
