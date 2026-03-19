import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const LOGO_URL = 'https://piqwdvnexfplgqmzarmm.supabase.co/storage/v1/object/public/Assets/tennis%20ladder%20logo.png'

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
        options: { data: { full_name: `${firstName} ${lastName}`.trim() } },
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
      <style>{`
        @keyframes ball1 {
          0%   { transform: translate(20px, 420px) rotate(0deg); opacity: 0; }
          6%   { opacity: 1; }
          94%  { opacity: 1; }
          100% { transform: translate(340px, -60px) rotate(720deg); opacity: 0; }
        }
        @keyframes ball2 {
          0%   { transform: translate(320px, 160px) rotate(0deg); opacity: 0; }
          6%   { opacity: 0.9; }
          94%  { opacity: 0.9; }
          100% { transform: translate(-40px, 520px) rotate(-600deg); opacity: 0; }
        }
        @keyframes ball3 {
          0%   { transform: translate(160px, -50px) rotate(0deg); opacity: 0; }
          6%   { opacity: 0.75; }
          94%  { opacity: 0.75; }
          100% { transform: translate(60px, 560px) rotate(540deg); opacity: 0; }
        }
        .tball1 { position: absolute; width: 56px; height: 56px; animation: ball1 7s ease-in-out infinite; pointer-events: none; }
        .tball2 { position: absolute; width: 40px; height: 40px; animation: ball2 9s ease-in-out infinite; pointer-events: none; }
        .tball3 { position: absolute; width: 28px; height: 28px; animation: ball3 11s ease-in-out infinite; pointer-events: none; }
      `}</style>

      <div style={{ flex: 1, position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px 24px', overflow: 'hidden' }}>
        <img className="tball1" src={LOGO_URL} alt="" />
        <img className="tball2" src={LOGO_URL} alt="" />
        <img className="tball3" src={LOGO_URL} alt="" />
        <div style={{ position: 'relative', zIndex: 1, textAlign: 'center' }}>
          <img src={LOGO_URL} alt="Montclair Tennis Ladder" style={{ height: 90, width: 'auto', objectFit: 'contain', marginBottom: 10 }} />
          <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#201c1d', marginBottom: 4 }}>
            Montclair Tennis Ladder
          </div>
          <div style={{ fontSize: 12, color: '#aaa79f', fontWeight: 300 }}>
            Competitive ladder play · Montclair, NJ
          </div>
        </div>
      </div>

      <div style={{ background: '#fff', padding: '24px 28px 36px', borderTop: '1.5px solid #e6e4e0' }}>
        <button onClick={handleGoogleLogin} disabled={loading} style={{ width: '100%', padding: '13px', marginBottom: 10, border: '1.5px solid #e6e4e0', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 500, color: '#201c1d' }}>
          🔍 Continue with Google
        </button>
        <button onClick={handleAppleLogin} disabled={loading} style={{ width: '100%', padding: '13px', marginBottom: 10, border: '1.5px solid #e6e4e0', borderRadius: 6, background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: "'Barlow', sans-serif", fontSize: 14, fontWeight: 500, color: '#201c1d' }}>
          🍎 Continue with Apple
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0 12px' }}>
          <div style={{ flex: 1, height: 1, background: '#e6e4e0' }} />
          <div style={{ fontSize: 11, color: '#aaa79f' }}>or {isSignUp ? 'sign up' : 'sign in'} with email</div>
          <div style={{ flex: 1, height: 1, background: '#e6e4e0' }} />
        </div>
        <form onSubmit={handleEmailAuth}>
          {isSignUp && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
              <input className="form-input" placeholder="First name" value={firstName} onChange={e => setFirstName(e.target.value)} required style={{ flex: 1 }} />
              <input className="form-input" placeholder="Last name" value={lastName} onChange={e => setLastName(e.target.value)} required style={{ flex: 1 }} />
            </div>
          )}
          <input className="form-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ marginBottom: 10 }} />
          <input className="form-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required style={{ marginBottom: 12 }} />
          {error && <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 10, textAlign: 'center' }}>{error}</div>}
          <button className="btn-primary" type="submit" disabled={loading}>
            {loading ? 'Loading…' : isSignUp ? 'Create Account →' : 'Sign In →'}
          </button>
        </form>
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#aaa79f' }}>
          {isSignUp ? 'Already a member? ' : "Don't have an account? "}
          <span style={{ color: '#201c1d', fontWeight: 500, cursor: 'pointer' }} onClick={() => { setIsSignUp(!isSignUp); setError('') }}>
            {isSignUp ? 'Sign in' : 'Create account'}
          </span>
        </div>
      </div>
    </div>
  )
}
