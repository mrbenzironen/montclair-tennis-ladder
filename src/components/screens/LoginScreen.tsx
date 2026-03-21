import { useState, type FormEvent, useRef, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

const LOGO_URL = 'https://piqwdvnexfplgqmzarmm.supabase.co/storage/v1/object/public/Assets/tennis%20ladder%20logo.png'

/** Set after successful signup so App can show the selfie step before JWT metadata is read (LoginScreen unmounts once auth updates). */
export const PENDING_SELFIE_KEY = 'mtl_pending_selfie'

/** True for new accounts until they upload a profile photo (stored in auth user_metadata). */
export function requiresSignupSelfie(session: Session | null): boolean {
  if (!session?.user?.id) return false
  const v = session.user.user_metadata?.requires_selfie
  return v === true || v === 'true'
}

function digitsOnly(s: string) {
  return s.replace(/\D/g, '')
}

interface LoginScreenProps {
  onLogin: () => void
}

interface SignupSelfieStepProps {
  userId: string
  onComplete: () => void
}

/**
 * Post-signup camera capture: live preview, oval guide, capture / preview / confirm.
 * Mobile Safari: playsInline + muted on video, user-facing camera, stop tracks on cleanup.
 */
export function SignupSelfieStep({ userId, onComplete }: SignupSelfieStepProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<'live' | 'preview'>('live')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [videoReady, setVideoReady] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach(t => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const startStream = useCallback(async () => {
    setError('')
    stopStream()
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera is not available in this browser. Try Safari or Chrome on your phone.')
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'user' },
          width: { ideal: 720 },
          height: { ideal: 1280 },
        },
        audio: false,
      })
      streamRef.current = stream
      const el = videoRef.current
      if (el) {
        el.setAttribute('playsinline', 'true')
        el.setAttribute('webkit-playsinline', 'true')
        el.muted = true
        el.playsInline = true
        el.srcObject = stream
        await el.play()
      }
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Camera error'
      setError(
        /denied|NotAllowed|Permission/i.test(msg)
          ? 'Camera access was blocked. Allow camera for this site in Settings, then try again.'
          : msg
      )
    }
  }, [stopStream])

  useEffect(() => {
    if (phase === 'live') {
      setVideoReady(false)
      void startStream()
    }
    return () => {
      stopStream()
    }
  }, [phase, startStream, stopStream])

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  function takePhoto() {
    const video = videoRef.current
    if (!video || video.videoWidth < 2) return
    const w = video.videoWidth
    const h = video.videoHeight
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.translate(w, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(video, 0, 0, w, h)
    stopStream()
    canvas.toBlob(
      blob => {
        if (!blob) return
        if (previewUrl) URL.revokeObjectURL(previewUrl)
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        setCaptureBlob(blob)
        setPhase('preview')
      },
      'image/jpeg',
      0.92
    )
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setCaptureBlob(null)
    setPhase('live')
  }

  async function confirmUpload() {
    if (!captureBlob) return
    setBusy(true)
    setError('')
    try {
      const path = `${userId}/profile.jpg`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, captureBlob, {
        contentType: 'image/jpeg',
        upsert: true,
      })
      if (upErr) throw new Error(upErr.message)

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = pub.publicUrl

      const { error: dbErr } = await supabase.from('users').update({ photo_url: publicUrl }).eq('id', userId)
      if (dbErr) throw new Error(dbErr.message)

      const { error: metaErr } = await supabase.auth.updateUser({
        data: { requires_selfie: false },
      })
      if (metaErr) throw new Error(metaErr.message)

      onComplete()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="screen-root" style={{ background: '#0d0c0c' }}>
      <div style={{ flexShrink: 0, padding: '16px 20px 12px', borderBottom: '1px solid #2a2826' }}>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 20, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.5, color: '#fff', marginBottom: 4 }}>
          Profile photo
        </div>
        <div style={{ fontSize: 13, color: '#8a8680', fontWeight: 300, lineHeight: 1.45 }}>
          Required to finish signup. Center your face in the guide, then take a selfie so other players can recognize you on the ladder.
        </div>
      </div>

      <div
        className="scroll"
        style={{
          display: 'flex',
          flexDirection: 'column',
          padding: '16px 20px calc(24px + env(safe-area-inset-bottom, 0px))',
        }}
      >
        {phase === 'live' && (
          <>
            <div
              style={{
                position: 'relative',
                width: '100%',
                maxWidth: 420,
                margin: '0 auto',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#000',
                flex: 1,
                minHeight: 280,
                maxHeight: 'min(62vh, 520px)',
              }}
            >
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                onLoadedMetadata={() => setVideoReady(true)}
                onCanPlay={() => setVideoReady(true)}
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: 'scaleX(-1)' }}
              />
              {/* Dimmed overlay + oval face guide (box-shadow trick works on iOS Safari) */}
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: '72%',
                    maxWidth: 280,
                    aspectRatio: '3 / 4',
                    borderRadius: '50%',
                    boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)',
                    border: '3px solid rgba(196,224,18,0.95)',
                  }}
                />
              </div>
            </div>
            <p style={{ fontSize: 12, color: '#6a6660', textAlign: 'center', marginTop: 12, marginBottom: 16 }}>
              Good lighting · Face forward · No hats or sunglasses
            </p>
            {error ? (
              <div style={{ fontSize: 13, color: '#ffb4b4', marginBottom: 12, textAlign: 'center', padding: '0 8px' }}>
                {error}
                <button
                  type="button"
                  onClick={() => void startStream()}
                  style={{
                    display: 'block',
                    margin: '12px auto 0',
                    padding: '8px 16px',
                    borderRadius: 6,
                    border: '1px solid #c4e012',
                    background: 'transparent',
                    color: '#c4e012',
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  Try again
                </button>
              </div>
            ) : null}
            <button
              type="button"
              className="btn-primary"
              disabled={!videoReady}
              onClick={takePhoto}
              style={{ background: '#c4e012', color: '#201c1d', fontSize: 16, padding: '14px 20px' }}
            >
              Take photo
            </button>
          </>
        )}

        {phase === 'preview' && previewUrl && (
          <>
            <div
              style={{
                width: '100%',
                maxWidth: 420,
                margin: '0 auto',
                borderRadius: 12,
                overflow: 'hidden',
                background: '#000',
                flex: 1,
                minHeight: 280,
                maxHeight: 'min(62vh, 520px)',
              }}
            >
              <img src={previewUrl} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            </div>
            {error ? (
              <div style={{ fontSize: 13, color: '#ffb4b4', marginTop: 12, textAlign: 'center' }}>{error}</div>
            ) : null}
            <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
              <button
                type="button"
                onClick={retake}
                disabled={busy}
                style={{
                  flex: 1,
                  padding: 14,
                  borderRadius: 8,
                  border: '1.5px solid #3d3a38',
                  background: 'transparent',
                  color: '#e6e4e0',
                  fontFamily: "'Barlow Condensed', sans-serif",
                  fontSize: 14,
                  fontWeight: 800,
                  letterSpacing: 1,
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                }}
              >
                Retake
              </button>
              <button
                type="button"
                className="btn-primary"
                disabled={busy}
                onClick={() => void confirmUpload()}
                style={{ flex: 1, background: '#c4e012', color: '#201c1d', fontSize: 15, padding: 14 }}
              >
                {busy ? 'Uploading…' : 'Use this photo'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [ladder, setLadder] = useState<'Intermediate' | 'Advanced'>('Intermediate')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleEmailAuth(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (isSignUp) {
        const phoneDigits = digitsOnly(phone)
        if (phoneDigits.length < 10) {
          setError('Enter a valid cell phone number (at least 10 digits).')
          return
        }

        const { data, error: signErr } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: `${firstName} ${lastName}`.trim(),
              requires_selfie: true,
            },
          },
        })

        if (signErr) {
          setError(signErr.message)
          return
        }

        if (data.user) {
          await supabase.from('users').update({ phone: phone.trim() }).eq('id', data.user.id)

          const { data: ladderData } = await supabase
            .from('ladders')
            .select('id')
            .eq('name', ladder)
            .single()

          if (ladderData) {
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

        const { data: sessionData } = await supabase.auth.getSession()
        if (data.user && sessionData.session) {
          try {
            sessionStorage.setItem(PENDING_SELFIE_KEY, data.user.id)
          } catch {
            /* private mode */
          }
        } else if (data.user && !sessionData.session) {
          setError('Check your email to confirm your account. After confirming, sign in. You will be asked to take a profile photo before using the ladder.')
        }

        onLogin()
      } else {
        const { error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        if (signInErr) setError(signInErr.message)
        else onLogin()
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="screen-root" style={{ background: '#fff' }}>
      {/* Compact header — does not grow; leaves vertical space for the form */}
      <div
        style={{
          flexShrink: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 20px 10px',
          textAlign: 'center',
        }}
      >
        <img
          src={LOGO_URL}
          alt="Tennis Ladder"
          style={{
            height: 64,
            width: 'auto',
            maxWidth: 'min(200px, 55vw)',
            objectFit: 'contain',
            marginBottom: 8,
          }}
        />
        <div
          style={{
            fontFamily: "'Barlow Condensed', sans-serif",
            fontSize: 19,
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: 1.5,
            color: '#201c1d',
            marginBottom: 2,
            lineHeight: 1.1,
          }}
        >
          Tennis Ladder
        </div>
        <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, lineHeight: 1.35 }}>
          Competitive ladder play · Montclair, NJ
        </div>
      </div>

      <div
        className="scroll"
        style={{
          flex: 1,
          minHeight: 0,
          background: '#fff',
          padding: '14px 20px calc(20px + env(safe-area-inset-bottom, 0px))',
          borderTop: '1.5px solid #e6e4e0',
        }}
      >

        <div style={{ display: 'flex', marginBottom: 16, background: '#f6f5f3', borderRadius: 8, padding: 4, flexShrink: 0 }}>
          <button
            type="button"
            onClick={() => { setIsSignUp(true); setError('') }}
            style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', background: isSignUp ? '#201c1d' : 'transparent', color: isSignUp ? '#c4e012' : '#aaa79f' }}
          >
            Create Account
          </button>
          <button
            type="button"
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
                      role="button"
                      tabIndex={0}
                      onClick={() => setLadder(l)}
                      onKeyDown={ev => { if (ev.key === 'Enter' || ev.key === ' ') setLadder(l) }}
                      style={{ flex: 1, padding: '12px 8px', borderRadius: 8, border: `2px solid ${ladder === l ? '#201c1d' : '#e6e4e0'}`, background: ladder === l ? '#201c1d' : '#fff', cursor: 'pointer', textAlign: 'center' }}
                    >
                      <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1, color: ladder === l ? '#c4e012' : '#201c1d', marginBottom: 2 }}>{l}</div>
                      <div style={{ fontSize: 10, color: ladder === l ? 'rgba(255,255,255,0.5)' : '#aaa79f' }}>{l === 'Intermediate' ? '3.5–4.5 NTRP' : '4.5+ NTRP'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>Cell phone</label>
                <input
                  className="form-input"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                />
                <div style={{ fontSize: 11, color: '#aaa79f', fontWeight: 300, marginTop: 6, lineHeight: 1.45 }}>
                  Shared only with players you are in an active challenge with.
                </div>
              </div>
            </>
          )}

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>Email</label>
            <input className="form-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 10, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: '#aaa79f', marginBottom: 6 }}>Password</label>
            <input className="form-input" type="password" placeholder="Min. 6 characters" value={password} onChange={e => setPassword(e.target.value)} required autoComplete={isSignUp ? 'new-password' : 'current-password'} />
          </div>

          {error && (
            <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 12, padding: '10px 14px', background: '#fde8e8', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={loading} style={{ background: '#c4e012', color: '#201c1d', fontSize: 15, marginBottom: 8 }}>
            {loading ? 'Setting up your account…' : isSignUp ? 'Create My Account →' : 'Sign In →'}
          </button>
        </form>
      </div>
    </div>
  )
}
