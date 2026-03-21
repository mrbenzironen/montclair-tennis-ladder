import { useState, type FormEvent } from 'react'
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
  const [ladder, setLadder] = useState<'Intermediate' | 'Advanced'>('Intermediate')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { full_name: `${firstName} ${lastName}`.trim() } },
        })

        if (error) {
          setError(error.message)
          return
        }

        // Assign ladder immediately after signup
        if (data.user) {
          const { data: ladderData } = await supabase
            .from('ladders')
            .select('id')
            .eq('name', ladder)
            .single()

          if (ladderData) {
            // Get current max rank in that ladder
            const { data: maxRankData } = await supabase
              .from('users')
              .select('rank')
              .eq('ladder_id', ladderData.id)
              .order('rank', { ascending: false })
              .limit(1)

            const newRank = maxRankData && maxRankData.length > 0 ? (maxRankData[0].rank ?? 0) + 1 : 1

            await supabase
              .from('users')
              .update({
                ladder_id: ladderData.id,
                rank: newRank,
                last_active_at: new Date().toISOString(),
              })
              .eq('id', data.user.id)
          }
        }

        onLogin()
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) setError(error.message)
        else onLogin()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: '#fff' }}>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 32px 24px' }}>
        <img src={LOGO_URL} alt="Tennis Ladder" style={{ height: 110, width: 'auto', objectFit: 'contain', marginBottom: 16 }} />
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 24, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 2, color: '#201c1d', marginBottom: 6 }}>
          Tennis Ladder
        </div>
        <div style={{ fontSize: 13, color: '#aaa79f', fontWeight: 300 }}>
          Competitive ladder play · Montclair, NJ
        </div>
      </div>

      <div style={{ background: '#fff', padding: '24px 28px 36px', borderTop: '1.5px solid #e6e4e0' }}>

        <div style={{ display: 'flex', marginBottom: 20, background: '#f6f5f3', borderRadius: 8, padding: 4 }}>
          <button
            onClick={() => { setIsSignUp(true); setError('') }}
            style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', background: isSignUp ? '#201c1d' : 'transparent', color: isSignUp ? '#c4e012' : '#aaa79f' }}
          >
            Create Account
          </button>
          <button
            onClick={() => { setIsSignUp(false); setError('') }}
            style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', background: !isSignUp ? '#201c1d' : 'transparent', color: !isSignUp ? '#c4e012' : '#aaa79f' }}
          >
            Sign In
          </button>
        </div>

        <form onSubmit={handleEmailAuth}>
          {isSignUp && (
            <>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>First Name</label>
                  <input className="form-input" placeholder="First" value={firstName} onChange={e => setFirstName(e.target.value)} required />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>Last Name</label>
                  <input className="form-input" placeholder="Last" value={lastName} onChange={e => setLastName(e.target.value)} required />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 8 }}>Which ladder?</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {(['Intermediate', 'Advanced'] as const).map(l => (
                    <div
                      key={l}
                      onClick={() => setLadder(l)}
                      style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: `2px solid ${ladder === l ? '#201c1d' : '#e6e4e0'}`, background: ladder === l ? '#201c1d' : '#fff', cursor: 'pointer', textAlign: 'center' }}
                    >
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: ladder === l ? '#c4e012' : '#201c1d', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 10, color: ladder === l ? 'rgba(255,255,255,0.5)' : '#aaa79f' }}>{l === 'Intermediate' ? '3.5–4.5 NTRP' : '4.5+ NTRP'}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
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
            {loading ? 'Setting up your account…' : isSignUp ? 'Create My Account →' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}
