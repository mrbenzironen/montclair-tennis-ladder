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

  if (!user.profile || !user.profile.ladder_id) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, padding: 20, background: '#f6f5f3' }}>
        <div style={{ fontSize: 48 }}>🎾</div>
        <div style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: 22, fontWeight: 800, textTransform: 'uppercase', color: '#201c1d', textAlign: 'center' }}>
          Almost there!
        </div>
        <div style={{ fontSize: 13, color: '#7a7672', fontWeight: 300, textAlign: 'center', lineHeight: 1.6, maxWidth: 260 }}>
          Your account is ready but you haven't been assigned to a ladder yet. Contact Benzi to get added.
        </div>
        <a href="sms:+19735550100" style={{ marginTop: 8, padding: '14px 28px', background: '#201c1d', color: '#c4e012', fontFamily: "'Barlow Condensed', sans-serif", fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase', borderRadius: 6, textDecoration: 'none' }}>
          Text Benzi
        </a>
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
      <div className="status-spacer" />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {renderScreen()}
      </div>
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
            <span className="nav-label" style={{ color: '#e0914f' }}>Admin</span>
          </button>
        )}
      </nav>
    </>
  )
}
