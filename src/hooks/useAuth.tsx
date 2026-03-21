import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
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

  async function loadProfile(userId: string, email: string) {
    try {
      const { data: profile } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (!profile) {
        setUser({ id: userId, email, profile: null })
        setLoading(false)
        return
      }

      let ladder = null
      if (profile.ladder_id) {
        const { data: ladderData } = await supabase
          .from('ladders')
          .select('*')
          .eq('id', profile.ladder_id)
          .single()
        ladder = ladderData
      }

      setUser({
        id: userId,
        email,
        profile: { ...profile, ladder } as User,
      })
    } catch (e) {
      console.error('loadProfile error:', e)
      setUser({ id: userId, email, profile: null })
    } finally {
      setLoading(false)
    }
  }

  async function refreshProfile() {
    if (session?.user) {
      await loadProfile(session.user.id, session.user.email ?? '')
    }
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session?.user) {
        loadProfile(session.user.id, session.user.email ?? '')
      } else {
        setLoading(false)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session)
        if (session?.user) {
          await loadProfile(session.user.id, session.user.email ?? '')
        } else {
          setUser(null)
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
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
