import { useState } from 'react'
import { supabase } from '../../lib/supabase'

const LOGO_URL = 'https://piqwdvnexfplgqmzarmm.supabase.co/storage/v1/object/public/Assets/tennis%20ladder%20logo.png'

interface LoginScreenProps {
  onLogin: () => void
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

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

      {/* Logo area */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px 24px' }}>
        <img src={LOGO_URL} alt="Tennis Ladder" style={{ height: 110, width: 'auto', objectFit: 'contain', marginBottom: 16 }} />
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#201c1d', marginBottom: 6 }}>
          Tennis Ladder
        </div>
        <div style={{ fontSize: 13, color: '#aaa79f', fontWeight: 300 }}>
          Competitive ladder play · Montclair, NJ
        </div>
      </div>

      {/* Auth form */}
      <div style={{ background: '#fff', padding: '24px 28px 36px', borderTop: '1.5px solid #e6e4e0' }}>

        {/* Tab switcher */}
        <div style={{ display: 'flex', marginBottom: 20, background: '#f6f5f3', borderRadius: 8, padding: 4 }}>
          <button
            onClick={() => { setIsSignUp(true); setError('') }}
            style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', background: isSignUp ? '#201c1d' : 'transparent', color: isSignUp ? '#c4e012' : '#aaa79f', transition: 'all 0.2s' }}
          >
            Create Account
          </button>
          <button
            onClick={() => { setIsSignUp(false); setError('') }}
            style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', background: !isSignUp ? '#201c1d' : 'transparent', color: !isSignUp ? '#c4e012' : '#aaa79f', transition: 'all 0.2s' }}
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleEmailAuth}>
          {isSignUp && (
            <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>First Name</label>
                <input className="form-input" placeholder="Benzi" value={firstName} onChange={e => setFirstName(e.target.value)} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>Last Name</label>
                <input className="form-input" placeholder="Ironen" value={lastName} onChange={e => setLastName(e.target.value)} required />
              </div>
            </div>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>Password</label>
            <input className="form-input" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 12, padding: '10px 14px', background: '#fde8e8', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={loading} style={{ background: '#c4e012', color: '#201c1d', fontSize: 15 }}>
            {loading ? 'Loading…' : isSignUp ? 'Create My Account →' : 'Sign In →'}
          </button>
        </form>

        {isSignUp && (
          <div style={{ marginTop: 16, padding: '12px 14px', background: '#f0f8d0', borderRadius: 8, fontSize: 12, color: '#4a6000', lineHeight: 1.5, textAlign: 'center' }}>
            🎾 After signing up, Benzi will add you to the ladder and set your starting rank.
          </div>
        )}
      </div>
    </div>
  )
}
