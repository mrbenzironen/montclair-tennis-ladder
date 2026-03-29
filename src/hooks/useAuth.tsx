import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { syncProfileFromAuthMetadata } from '../lib/syncSignupProfile'
import { User, AuthUser } from '../types'

interface AuthContextType {
  session: Session | null
  user: AuthUser | null
  loading: boolean
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadProfile(session: Session | null) {
    if (!session?.user) {
      setLoading(false)
      return
    }
    const userId = session.user.id
    const email = session.user.email ?? ''
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!profile) {
        setUser({ id: userId, email, profile: null })
        return
      }

      const synced = await syncProfileFromAuthMetadata(session.user, {
        id: profile.id,
        ladder_id: profile.ladder_id,
        phone: profile.phone,
        full_name: profile.full_name,
      })

      let finalProfile = profile
      if (synced) {
        const { data: p2 } = await supabase.from('users').select('*').eq('id', userId).single()
        if (p2) finalProfile = p2
      }

      let ladder = null
      if (finalProfile.ladder_id) {
        const { data: ladderData } = await supabase
          .from('ladders')
          .select('*')
          .eq('id', finalProfile.ladder_id)
          .single()
        ladder = ladderData
      }

      setUser({
        id: userId,
        email,
        profile: { ...finalProfile, ladder } as User,
      })
    } catch (e) {
      console.error('loadProfile error:', e)
      setUser({ id: userId, email, profile: null })
    } finally {
      setLoading(false)
    }
  }

  async function refreshProfile() {
    const { data: { session: s } } = await supabase.auth.getSession()
    if (s?.user) await loadProfile(s)
  }

  useEffect(() => {
    let cancelled = false

    async function bootstrapAuth() {
      if (typeof window !== 'undefined') {
        const { search, hash } = window.location
        const hasPkceCode = search.includes('code=')
        const hasImplicitHash =
          hash.includes('access_token') || hash.includes('refresh_token') || hash.includes('type=')

        if (hasPkceCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href)
          if (error) {
            console.error('exchangeCodeForSession', error)
          } else {
            const url = new URL(window.location.href)
            url.searchParams.delete('code')
            url.searchParams.delete('type')
            const qs = url.searchParams.toString()
            window.history.replaceState({}, document.title, `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`)
          }
        } else if (hasImplicitHash) {
          const { data: { session: implicitSession } } = await supabase.auth.getSession()
          if (implicitSession) {
            window.history.replaceState({}, document.title, window.location.pathname + window.location.search)
          }
        }
      }

      if (cancelled) return
      const { data: { session } } = await supabase.auth.getSession()
      setSession(session)
      if (session?.user) {
        void loadProfile(session)
      } else {
        setLoading(false)
      }
    }

    void bootstrapAuth()

    // Do not await Supabase calls inside this callback — it shares the auth lock and can deadlock.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session?.user) {
        queueMicrotask(() => {
          void loadProfile(session)
        })
      } else {
        setUser(null)
        setLoading(false)
      }
    })

    return () => {
      cancelled = true
      subscription.unsubscribe()
    }
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    setUser(null)
    setSession(null)
  }

  return (
    <AuthContext.Provider value={{ session, user, loading, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
