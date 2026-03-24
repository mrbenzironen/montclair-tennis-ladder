import { useState, type FormEvent, type ChangeEvent, useRef, useEffect, useCallback } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { MONTCLAIR_LADDER_LOGO_URL } from '../../lib/branding'
import { digitsOnly } from '../../lib/phone'

/** Set after successful signup so App can show the selfie step before JWT metadata is read (LoginScreen unmounts once auth updates). */
export const PENDING_SELFIE_KEY = 'mtl_pending_selfie'

/** True for new accounts until they upload a profile photo (stored in auth user_metadata). */
export function requiresSignupSelfie(session: Session | null): boolean {
  if (!session?.user?.id) return false
  const v = session.user.user_metadata?.requires_selfie
  return v === true || v === 'true'
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
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [phase, setPhase] = useState<'live' | 'preview'>('live')
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [captureBlob, setCaptureBlob] = useState<Blob | null>(null)
  const [captureContentType, setCaptureContentType] = useState('image/jpeg')
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
        setCaptureContentType('image/jpeg')
        setPhase('preview')
      },
      'image/jpeg',
      0.92
    )
  }

  function openLibraryPicker() {
    setError('')
    libraryInputRef.current?.click()
  }

  function chooseFromLibrary(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Please choose an image file.')
      return
    }
    stopStream()
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    const url = URL.createObjectURL(file)
    setPreviewUrl(url)
    setCaptureBlob(file)
    setCaptureContentType(file.type || 'image/jpeg')
    setPhase('preview')
    e.currentTarget.value = ''
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    setCaptureBlob(null)
    setCaptureContentType('image/jpeg')
    setPhase('live')
  }

  async function confirmUpload() {
    if (!captureBlob) return
    setBusy(true)
    setError('')
    try {
      const path = `${userId}/profile.jpg`
      const { error: upErr } = await supabase.storage.from('avatars').upload(path, captureBlob, {
        contentType: captureContentType || captureBlob.type || 'image/jpeg',
        upsert: true,
      })
      if (upErr) throw new Error(upErr.message)

      const { data: pub } = supabase.storage.from('avatars').getPublicUrl(path)
      const publicUrl = `${pub.publicUrl}?v=${Date.now()}`

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
            <button
              type="button"
              onClick={openLibraryPicker}
              style={{
                width: '100%',
                padding: 13,
                marginTop: 10,
                border: '1.5px solid #3d3a38',
                borderRadius: 8,
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
              Choose from library
            </button>
            <input
              ref={libraryInputRef}
              type="file"
              accept="image/*"
              onChange={chooseFromLibrary}
              style={{ display: 'none' }}
            />
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

export function LoginScreen() {
  const [email, setEmail] = useState('')
  const [isSignUp, setIsSignUp] = useState(true)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [linkSent, setLinkSent] = useState(false)

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
        if (!firstName.trim() || !lastName.trim()) {
          setError('Enter your first and last name.')
          return
        }
      }

      const redirectTo = `${window.location.origin}${window.location.pathname || '/'}`
      const { error: otpErr } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: redirectTo,
          ...(isSignUp
            ? {
                data: {
                  full_name: `${firstName} ${lastName}`.trim(),
                  phone: phone.trim(),
                  requires_selfie: true,
                },
              }
            : {}),
        },
      })

      if (otpErr) {
        setError(otpErr.message)
        return
      }

      setLinkSent(true)
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
          src={MONTCLAIR_LADDER_LOGO_URL}
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
            onClick={() => { setIsSignUp(true); setError(''); setLinkSent(false) }}
            style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', background: isSignUp ? '#201c1d' : 'transparent', color: isSignUp ? '#c4e012' : '#aaa79f' }}
          >
            Create Account
          </button>
          <button
            type="button"
            onClick={() => { setIsSignUp(false); setError(''); setLinkSent(false) }}
            style={{ flex: 1, padding: '10px', borderRadius: 6, border: 'none', cursor: 'pointer', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 1.5, textTransform: 'uppercase', background: !isSignUp ? '#201c1d' : 'transparent', color: !isSignUp ? '#c4e012' : '#aaa79f' }}
          >
            Sign In
          </button>
        </div>

        {linkSent ? (
          <div style={{ padding: '8px 0 12px' }}>
            <div style={{ fontSize: 14, color: '#201c1d', fontWeight: 500, marginBottom: 8, lineHeight: 1.5 }}>
              Check your email — we sent a sign-in link to <strong>{email.trim()}</strong>. Open it on this device to continue.
            </div>
            <div style={{ fontSize: 12, color: '#7a7672', lineHeight: 1.45, marginBottom: 16 }}>
              No password needed. The link expires after a short time. You can request another below.
            </div>
            <button
              type="button"
              className="btn-secondary"
              onClick={() => setLinkSent(false)}
            >
              Use a different email
            </button>
          </div>
        ) : (
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

              <div style={{ marginBottom: 12, padding: '12px 14px', background: '#f6f5f3', borderRadius: 8, borderLeft: '3px solid #c4e012' }}>
                <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 11, fontWeight: 800, letterSpacing: 1.2, textTransform: 'uppercase', color: '#201c1d', marginBottom: 4 }}>Montclair ladder</div>
                <div style={{ fontSize: 12, color: '#7a7672', lineHeight: 1.45 }}>
                  One ladder for <strong style={{ color: '#201c1d' }}>4.5 NTRP or better</strong> (advanced players).
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

          {error && (
            <div style={{ fontSize: 12, color: '#c0392b', marginBottom: 12, padding: '10px 14px', background: '#fde8e8', borderRadius: 6 }}>
              {error}
            </div>
          )}

          <button className="btn-primary" type="submit" disabled={loading} style={{ background: '#c4e012', color: '#201c1d', fontSize: 15, marginBottom: 8 }}>
            {loading ? 'Sending link…' : isSignUp ? 'Email me a sign-up link →' : 'Email me a sign-in link →'}
          </button>
        </form>
        )}
      </div>
    </div>
  )
}
