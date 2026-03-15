import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import { LoginScreen } from './components/screens/LoginScreen'
import { LadderScreen } from './components/screens/LadderScreen'
import { ChallengesScreen } from './components/screens/ChallengesScreen'
import { RulesScreen } from './components/screens/RulesScreen'
import { ProfileScreen } from './components/screens/ProfileScreen'
import { AdminScreen } from './components/screens/AdminScreen'
import { TabName } from './types'

export default function App() {
  const { session, user, loading } = useAuth()
  const [tab, setTab] = useState<TabName>('ladder')

  if (loading) {
    return (
      <div className="loading-screen" style={{ flex: 1 }}>
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

  // If user has no profile yet, they need to complete onboarding
  // For now, we'll create a basic profile on first login
  if (!user.profile) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 20, background: '#f6f5f3' }}>
        <div style={{ fontSize: 48 }}>🎾</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', textAlign: 'center' }}>
          Setting up your account…
        </div>
        <div style={{ fontSize: 13, color: '#aaa79f', fontWeight: 300, textAlign: 'center', lineHeight: 1.5 }}>
          Your profile is being created. This only takes a moment.
        </div>
        <div className="spinner" />
      </div>
    )
  }

  const isAdmin = user.profile.is_admin

  function renderScreen() {
    switch (tab) {
      case 'ladder': return <LadderScreen />
      case 'challenges': return <ChallengesScreen />
      case 'rules': return <RulesScreen />
      case 'profile': return <ProfileScreen />
      case 'admin': return isAdmin ? <AdminScreen /> : <LadderScreen />
      default: return <LadderScreen />
    }
  }

  return (
    <>
      {/* Status bar spacer */}
      <div className="status-spacer" />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderScreen()}
      </div>

      {/* Bottom nav */}
      <nav className="bottom-nav">
        <button className={`nav-tab ${tab === 'ladder' ? 'active' : ''}`} onClick={() => setTab('ladder')}>
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
            <span className="nav-label" style={{ color: tab === 'admin' ? '#e0914f' : '#e0914f' }}>Admin</span>
          </button>
        )}
      </nav>
    </>
  )
}
