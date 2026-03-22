import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginScreen, SignupSelfieStep, PENDING_SELFIE_KEY, requiresSignupSelfie } from './components/screens/LoginScreen'
import { LadderScreen } from './components/screens/LadderScreen'
import { ChallengesScreen } from './components/screens/ChallengesScreen'
import { RulesScreen } from './components/screens/RulesScreen'
import { ProfileScreen } from './components/screens/ProfileScreen'
import { AdminScreen } from './components/screens/AdminScreen'
import { TabName } from './types'

export default function App() {
  const { session, user, loading, refreshProfile } = useAuth()
  const [tab, setTab] = useState<TabName>('ladder')
  /** Bumping this while already on Ladder pops nested views (e.g. player profile) back to the list. */
  const [ladderPopToRoot, setLadderPopToRoot] = useState(0)

  // Mandatory post-signup selfie: enforced via user_metadata.requires_selfie (survives refresh /
  // email-confirm login). sessionStorage backs the handoff right after signup before metadata sync.
  const pendingSelfie =
    !!session?.user?.id &&
    (requiresSignupSelfie(session) ||
      (typeof sessionStorage !== 'undefined' &&
        sessionStorage.getItem(PENDING_SELFIE_KEY) === session.user.id))

  if (pendingSelfie) {
    return (
      <>
        <div className="status-spacer" />
        <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <SignupSelfieStep
            userId={session.user.id}
            onComplete={() => {
              sessionStorage.removeItem(PENDING_SELFIE_KEY)
              void refreshProfile()
            }}
          />
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <div className="loading-screen" style={{ flex: 1, minHeight: 0 }}>
        <div>
          <div style={{ fontSize: 48, textAlign: 'center', marginBottom: 16 }}>🎾</div>
          <div className="spinner" />
        </div>
      </div>
    )
  }

  if (!session || !user) {
    return <LoginScreen onLogin={() => {}} />
  }

  const isAdmin = user.profile?.is_admin ?? false

  function renderScreen() {
    switch (tab) {
      case 'ladder': return <LadderScreen ladderPopToRoot={ladderPopToRoot} />
      case 'challenges': return <ChallengesScreen />
      case 'rules': return <RulesScreen />
      case 'profile': return <ProfileScreen />
      case 'admin': return isAdmin ? <AdminScreen /> : <LadderScreen ladderPopToRoot={ladderPopToRoot} />
      default: return <LadderScreen ladderPopToRoot={ladderPopToRoot} />
    }
  }

  return (
    <>
      <div className="status-spacer" />
      <div style={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderScreen()}
      </div>
      <nav className="bottom-nav">
        <button
          className={`nav-tab ${tab === 'ladder' ? 'active' : ''}`}
          onClick={() => {
            if (tab === 'ladder') setLadderPopToRoot(n => n + 1)
            setTab('ladder')
          }}
        >
          <span className="nav-icon">🏆</span>
          <span className="nav-label">Ladder</span>
        </button>
        <button className={`nav-tab ${tab === 'challenges' ? 'active' : ''}`} onClick={() => setTab('challenges')}>
          <span className="nav-icon">⚡</span>
          <span className="nav-label">Challenges</span>
        </button>
        <button className={`nav-tab ${tab === 'rules' ? 'active' : ''}`} onClick={() => setTab('rules')}>
          <span className="nav-icon">📋</span>
          <span className="nav-label">Rules</span>
        </button>
        <button className={`nav-tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          <span className="nav-icon">👤</span>
          <span className="nav-label">Profile</span>
        </button>
        {isAdmin && (
          <button className={`nav-tab admin ${tab === 'admin' ? 'active' : ''}`} onClick={() => setTab('admin')}>
            <span className="nav-icon">⚙️</span>
            <span className="nav-label" style={{ color: '#e0914f' }}>Admin</span>
          </button>
        )}
      </nav>
    </>
  )
}
